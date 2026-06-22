const express = require("express");
const userRouter  = require("./user.router");
const repoRouter  = require("./repo.router");
const issueRouter = require("./issue.router");
const aiRouter    = require("./ai.router");
const notificationRouter = require("./notification.router");
const authRouter = require("./auth.router");

const mainRouter = express.Router();

mainRouter.use(userRouter);
mainRouter.use(repoRouter);
mainRouter.use(issueRouter);
mainRouter.use(aiRouter);
mainRouter.use(notificationRouter);
mainRouter.use(authRouter);

mainRouter.get("/", (req, res) => {
    res.send("Welcome to DevRift API");
});

module.exports = mainRouter;