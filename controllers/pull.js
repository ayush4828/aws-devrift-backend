const fs = require("fs").promises;
const path = require("path");
const axios = require("axios");
const { s3, S3_Bucket } = require("../config/aws-config");

async function findRepoRoot(startDir) {
  let dir = startDir;
  while (true) {
    try {
      await fs.access(path.join(dir, ".devRift"));
      return dir;
    } catch {
      const parent = path.dirname(dir);
      if (parent === dir) {
        throw new Error("Not a devRift repository. Did you run `devrift init`?");
      }
      dir = parent;
    }
  }
}

async function readConfig(repoRoot) {
  const configPath = path.join(repoRoot, ".devRift", "config.json");
  const raw = await fs.readFile(configPath, "utf-8");
  return JSON.parse(raw);
}

async function writeConfig(repoRoot, config) {
  const configPath = path.join(repoRoot, ".devRift", "config.json");
  await fs.writeFile(configPath, JSON.stringify(config, null, 2));
}

async function pullRepo() {
  try {
    const repoRoot = await findRepoRoot(process.cwd());
    const config = await readConfig(repoRoot);
    const { repoId, token, serverUrl = "http://localhost:3000" } = config;

    if (!repoId) throw new Error("repoId missing. Run `devrift init <repoId>`.");
    if (!token)  throw new Error("Auth token missing. Run `devrift login` first.");

    const response = await axios.get(`${serverUrl}/repo/${repoId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const repo = response.data;
    if (!repo.commits || repo.commits.length === 0) {
      return;
    }

    const sortedCommits = repo.commits.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    const latestCommit = sortedCommits[0];
    const latestCommitId = latestCommit.commitId;

    const commitsPath = path.join(repoRoot, ".devRift", "commits");
    
    const data = await s3.listObjectsV2({
      Bucket: S3_Bucket,
      Prefix: `commits/${repoId}/`,
    }).promise();

async function getAllFiles(dirPath, arrayOfFiles = []) {
  const files = await fs.readdir(dirPath, { withFileTypes: true });
  for (const file of files) {
    if (file.isDirectory()) {
      arrayOfFiles = await getAllFiles(path.join(dirPath, file.name), arrayOfFiles);
    } else {
      arrayOfFiles.push(path.join(dirPath, file.name));
    }
  }
  return arrayOfFiles;
}

    const objects = data.Contents || [];
    let pulledCount = 0;

    for (const object of objects) {
      const key = object.Key; // e.g., commits/<repoId>/<commitId>/folder/filename
      const parts = key.split("/");
      if (parts.length < 4) continue;
      
      const commitId = parts[2];
      const relativePath = parts.slice(3).join("/");
      
      const commitDir = path.join(commitsPath, commitId);
      const filePath = path.join(commitDir, relativePath);
      
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      
      try {
        await fs.access(filePath);
        continue;
      } catch (e) {}

      const fileContent = await s3.getObject({ Bucket: S3_Bucket, Key: key }).promise();
      await fs.writeFile(filePath, fileContent.Body);
      pulledCount++;
    }


    
    const latestCommitDir = path.join(commitsPath, latestCommitId);
    let extractedCount = 0;
    
    try {
      const allFiles = await getAllFiles(latestCommitDir);
      for (const filePath of allFiles) {
        const relativePath = path.relative(latestCommitDir, filePath);
        if (relativePath === "commit.json") continue;

        const targetPath = path.join(repoRoot, relativePath);
        await fs.mkdir(path.dirname(targetPath), { recursive: true });
        await fs.copyFile(filePath, targetPath);
        extractedCount++;
      }
      
      const pulledCommitIds = new Set(config.pushedCommits || []);
      sortedCommits.forEach(c => pulledCommitIds.add(c.commitId));
      config.pushedCommits = [...pulledCommitIds];
      await writeConfig(repoRoot, config);

    } catch (err) {
    }

  } catch (err) {
  }
}

module.exports = { pullRepo };
