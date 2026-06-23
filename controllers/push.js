const fs       = require("fs").promises;
const path     = require("path");
const axios    = require("axios");
const FormData = require("form-data");

async function findRepoRoot(startDir) {
  let dir = startDir;
  while (true) {
    try {
      await fs.access(path.join(dir, ".devRift"));
      return dir;
    } catch {
      const parent = path.dirname(dir);
      if (parent === dir) {
        throw new Error("Not a devRift repository.");
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

async function pushRepo() {
  try {
    const repoRoot = await findRepoRoot(process.cwd());
    const config   = await readConfig(repoRoot);
    const { repoId, token, serverUrl = "http://localhost:3000" } = config;
    const pushedCommits = new Set(config.pushedCommits || []);

    if (!repoId) throw new Error("repoId missing. Run `devrift init <repoId>`.");
    if (!token)  throw new Error("Auth token missing. Run `devrift login` first.");

    try {
      const response = await axios.get(`${serverUrl}/repo/${repoId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const serverCommits = response.data.commits || [];
      for (const sc of serverCommits) {
        if (!pushedCommits.has(sc.commitId)) {
          throw new Error("Conflict! The server has new commits that you don't have locally.\nPlease run `devrift pull` to sync before pushing.");
        }
      }
    } catch (err) {
      if (err.message.includes("Conflict")) {
        throw err;
      }
    }

    const commitsPath = path.join(repoRoot, ".devRift", "commits");
    const allCommitDirs = await fs.readdir(commitsPath).catch(() => []);

    const unpushedDirs = [];
    for (const commitDir of allCommitDirs) {
      if (pushedCommits.has(commitDir)) continue;
      const stat = await fs.stat(path.join(commitsPath, commitDir)).catch(() => null);
      if (stat && stat.isDirectory()) {
        unpushedDirs.push(commitDir);
      }
    }

    if (unpushedDirs.length === 0) {
      console.log("✅ Everything is up to date! Nothing to push.");
      return;
    }


    const newlyPushed = [];
    for (const commitDir of unpushedDirs) {
      const commitPath = path.join(commitsPath, commitDir);
      const allFilePaths = await getAllFiles(commitPath);

      let commitMessage = "No message";
      const commitJsonPath = path.join(commitPath, "commit.json");
      if (allFilePaths.includes(commitJsonPath)) {
        try {
          const raw = await fs.readFile(commitJsonPath, "utf-8");
          commitMessage = JSON.parse(raw).message || commitMessage;
        } catch {}
      }

      const dataFiles = allFilePaths.filter(f => f !== commitJsonPath);

      if (dataFiles.length === 0) {
        pushedCommits.add(commitDir);
        newlyPushed.push(commitDir);
        continue;
      }

      const form = new FormData();
      form.append("commitId", commitDir);
      form.append("commitMessage", commitMessage);

      for (const filePath of dataFiles) {
        const fileBuffer = await fs.readFile(filePath);
        const relativePath = path.relative(commitPath, filePath).replace(/\\/g, "/");
        const filename = path.basename(filePath); 
        
        form.append("files", fileBuffer, {
          filename: filename,
          contentType: "application/octet-stream",
        });
        form.append("filePaths", relativePath);
      }


      try {
        const response = await axios.post(
          `${serverUrl}/repo/push/${repoId}`,
          form,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              ...form.getHeaders(),
            },
            maxBodyLength: Infinity,
          }
        );

        pushedCommits.add(commitDir);
        newlyPushed.push(commitDir);
      } catch (err) {
        const msg = err.response?.data?.message || err.message;
      }
    }

    if (newlyPushed.length > 0) {
      config.pushedCommits = [...pushedCommits];
      await writeConfig(repoRoot, config);
      console.log(`🚀 Successfully pushed ${newlyPushed.length} commit(s) to DevRift!`);
    }
  } catch (err) {
    console.error("❌ Failed to push:", err.message);
  }
}

module.exports = { pushRepo };
