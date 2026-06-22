const fs   = require("fs").promises;
const path = require("path");
const { v4: uuidv4 } = require("uuid");

async function findRepoRoot(startDir) {
  let dir = startDir;
  while (true) {
    try {
      await fs.access(path.join(dir, ".devRift"));
      return dir;
    } catch {
      const parent = path.dirname(dir);
      if (parent === dir) {
        throw new Error("Not a devRift repository. Did you run `devrift init <repoId>`?");
      }
      dir = parent;
    }
  }
}

async function commitRepo(message) {
  try {
    const repoRoot   = await findRepoRoot(process.cwd());
    const repoPath   = path.join(repoRoot, ".devRift");
    const stagingPath = path.join(repoPath, "staging");
    const commitPath  = path.join(repoPath, "commits");

    const rootFiles = await fs.readdir(stagingPath).catch(() => []);
    if (rootFiles.length === 0) {
      return;
    }

    const commitId  = uuidv4();
    const commitDir = path.join(commitPath, commitId);
    await fs.mkdir(commitDir, { recursive: true });

    async function copyRecursively(srcDir, destDir) {
      const items = await fs.readdir(srcDir, { withFileTypes: true });
      for (const item of items) {
        const srcPath = path.join(srcDir, item.name);
        const destPath = path.join(destDir, item.name);
        if (item.isDirectory()) {
          await fs.mkdir(destPath, { recursive: true });
          await copyRecursively(srcPath, destPath);
        } else {
          await fs.copyFile(srcPath, destPath);
        }
      }
    }

    await copyRecursively(stagingPath, commitDir);

    await fs.writeFile(
      path.join(commitDir, "commit.json"),
      JSON.stringify({ message, date: new Date().toISOString() }, null, 2)
    );

    await fs.rm(stagingPath, { recursive: true, force: true }).catch(() => {});
    await fs.mkdir(stagingPath, { recursive: true });

  } catch (err) {
  }
}

module.exports = { commitRepo };
