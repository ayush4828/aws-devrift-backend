const fs   = require("fs").promises;
const path = require("path");

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

async function addRepo(filepath) {
  try {
    const resolvedFilepath = path.resolve(process.cwd(), filepath);
    const repoRoot   = await findRepoRoot(process.cwd());
    const stagingPath = path.join(repoRoot, ".devRift", "staging");

    await fs.mkdir(stagingPath, { recursive: true });

    try {
      await fs.access(resolvedFilepath);
    } catch {
      throw new Error(`Path does not exist: ${filepath}`);
    }

    let addedCount = 0;

    async function traverseAndCopy(currentPath) {
      const stats = await fs.stat(currentPath);
      
      const relativePath = path.relative(repoRoot, currentPath);
      
      if (relativePath.includes(".devRift") || relativePath.includes("node_modules") || relativePath.includes(".git")) {
        return;
      }
      
      if (stats.isDirectory()) {
        const files = await fs.readdir(currentPath);
        for (const file of files) {
          await traverseAndCopy(path.join(currentPath, file));
        }
      } else {
        const destPath = path.join(stagingPath, relativePath);
        await fs.mkdir(path.dirname(destPath), { recursive: true });
        await fs.copyFile(currentPath, destPath);
        addedCount++;
      }
    }

    await traverseAndCopy(resolvedFilepath);

    if (addedCount > 0) {
      console.log(`✅ Added ${addedCount} file(s) to staging.`);
    } else {
      console.log(`⚠️ No new files to add.`);
    }
  } catch (err) {
    console.error("❌ Failed to add files:", err.message);
  }
}

module.exports = { addRepo };
