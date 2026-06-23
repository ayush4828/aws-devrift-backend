const fs    = require("fs").promises;
const path  = require("path");
const axios = require("axios");

/**
 * `devrift login` — prompts for email + password, fetches a JWT token
 * from the DevRift backend, and saves it to .devRift/config.json.
 */
async function loginCLI(argv) {
  const configPath = path.resolve(process.cwd(), ".devRift", "config.json");

  let config = {};
  try {
    const raw = await fs.readFile(configPath, "utf-8");
    config = JSON.parse(raw);
  } catch {
    return;
  }

  const serverUrl = config.serverUrl || "http://localhost:3000";
  const email     = argv.email;
  const password  = argv.password;

  if (!email || !password) {
    return;
  }

  try {
    const response = await axios.post(`${serverUrl}/login`, { email, password });

    const { token, userId } = response.data;

    config.token  = token;
    config.userId = userId;
    await fs.writeFile(configPath, JSON.stringify(config, null, 2));
    
    console.log("✅ Successfully logged in to DevRift!");
  } catch (err) {
    const msg = err.response?.data?.message || err.message;
    console.error("❌ Login failed:", msg);
  }
}

module.exports = { loginCLI };
