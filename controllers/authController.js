const jwt = require("jsonwebtoken");
const { MongoClient } = require("mongodb");
const dotenv = require("dotenv").config();

let client;
const uri = process.env.MONGO_URI;

async function connectClient() {
  if (!client) {
    client = new MongoClient(uri);
  }
  await client.connect();
}

const githubLogin = (req, res) => {
  const clientId = process.env.GITHUB_CLIENT_ID;
  if (!clientId) {
    return res.status(500).json({ message: "GitHub Client ID is not configured on the server." });
  }
  const redirectUri = "http://localhost:3000/auth/github/callback";
  const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=user:email`;
  res.redirect(githubAuthUrl);
};

const githubCallback = async (req, res) => {
  const { code } = req.query;

  if (!code) {
    return res.status(400).send("No code provided by GitHub");
  }

  try {
    const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
      }),
    });
    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;

    if (!accessToken) {
      return res.status(400).send("Failed to retrieve access token from GitHub");
    }

    const userRes = await fetch("https://api.github.com/user", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const githubUser = await userRes.json();

    const emailRes = await fetch("https://api.github.com/user/emails", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const emails = await emailRes.json();
    const primaryEmailObj = emails.find((e) => e.primary);
    const email = primaryEmailObj ? primaryEmailObj.email : githubUser.email;

    if (!email) {
      return res.status(400).send("GitHub email is required but was not provided.");
    }

    await connectClient();
    const db = client.db("devrift");
    const usersCollection = db.collection("users");

    let user = await usersCollection.findOne({ email });

    if (!user) {
      const newUser = {
        username: githubUser.login, // use GitHub username
        email: email,
        password: "", // No password for OAuth users
        avatar: githubUser.avatar_url,
        bio: githubUser.bio || "",
        socialLinks: { github: githubUser.html_url },
        repositories: [],
        followedUser: [],
        followers: [],
        starRepos: [],
      };
      const result = await usersCollection.insertOne(newUser);
      user = { _id: result.insertedId };
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET_KEY, { expiresIn: "7d" });

    res.redirect(`http://localhost:5173/auth/success?token=${token}&userId=${user._id}`);
  } catch (err) {
    res.status(500).send("Failed to authenticate with GitHub");
  }
};

const googleLogin = (req, res) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return res.status(500).json({ message: "Google Client ID is not configured on the server." });
  }
  const redirectUri = "http://localhost:3000/auth/google/callback";
  const scope = "https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email";
  const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}&access_type=offline&prompt=consent`;
  res.redirect(googleAuthUrl);
};

const googleCallback = async (req, res) => {
  const { code } = req.query;

  if (!code) {
    return res.status(400).send("No code provided by Google");
  }

  try {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        code,
        redirect_uri: "http://localhost:3000/auth/google/callback",
        grant_type: "authorization_code",
      }),
    });
    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;

    if (!accessToken) {
      return res.status(400).send("Failed to retrieve access token from Google");
    }

    const userRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const googleUser = await userRes.json();
    const email = googleUser.email;

    if (!email) {
      return res.status(400).send("Google email is required but was not provided.");
    }

    await connectClient();
    const db = client.db("devrift");
    const usersCollection = db.collection("users");

    let user = await usersCollection.findOne({ email });

    if (!user) {
      const newUser = {
        username: email.split("@")[0], // Fallback username
        email: email,
        password: "", // No password for OAuth users
        avatar: googleUser.picture || "",
        bio: "",
        socialLinks: {},
        repositories: [],
        followedUser: [],
        followers: [],
        starRepos: [],
      };
      const result = await usersCollection.insertOne(newUser);
      user = { _id: result.insertedId };
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET_KEY, { expiresIn: "7d" });

    res.redirect(`http://localhost:5173/auth/success?token=${token}&userId=${user._id}`);
  } catch (err) {
    res.status(500).send("Failed to authenticate with Google");
  }
};

module.exports = {
  githubLogin,
  githubCallback,
  googleLogin,
  googleCallback,
};
