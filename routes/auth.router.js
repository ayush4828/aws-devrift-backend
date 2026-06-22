const express = require("express");
const authController = require("../controllers/authController");

const authRouter = express.Router();

authRouter.get("/auth/github", authController.githubLogin);
authRouter.get("/auth/github/callback", authController.githubCallback);

authRouter.get("/auth/google", authController.googleLogin);
authRouter.get("/auth/google/callback", authController.googleCallback);

module.exports = authRouter;
