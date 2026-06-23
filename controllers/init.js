const fs   = require("fs").promises;
const path = require("path");

async function initRepo(repoId) {
  const repoPath   = path.resolve(process.cwd(), ".devRift");
  const commitPath = path.join(repoPath, "commits");
  const stagePath  = path.join(repoPath, "staging");

  try {
    await fs.mkdir(repoPath,   { recursive: true });
    await fs.mkdir(commitPath, { recursive: true });
    await fs.mkdir(stagePath,  { recursive: true });

    let existingConfig = {};
    try {
      const raw = await fs.readFile(path.join(repoPath, "config.json"), "utf-8");
      existingConfig = JSON.parse(raw);
    } catch (e) {
    }

    const config = {
      bucket:    existingConfig.bucket || "",
      repoId:    repoId || existingConfig.repoId || "",
      serverUrl: existingConfig.serverUrl || "https://api.devrift.in",
      token:     existingConfig.token || "",  // preserved if already logged in
      pushedCommits: existingConfig.pushedCommits || [] // preserve history!
    };

    await fs.writeFile(path.join(repoPath, "config.json"), JSON.stringify(config, null, 2));

    if (!repoId) {
      console.log("✅ Initialized empty DevRift repository. (No repoId linked)");
    } else {
      console.log(`✅ Initialized DevRift repository and linked to: ${repoId}`);
    }
  } catch (err) {
    console.error("❌ Failed to initialize repository:", err.message);
  }
}

module.exports = { initRepo };
