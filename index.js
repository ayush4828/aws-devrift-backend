#!/usr/bin/env node
const express = require("express");
const dotenv = require("dotenv").config();
const cors = require("cors");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const http = require("http");
const { Server } = require("socket.io");
const mainRouter = require("./routes/main.router");

const yargs = require("yargs");
const { hideBin } = require("yargs/helpers");

const { initRepo }    = require("./controllers/init");
const { addRepo }     = require("./controllers/add");
const { commitRepo }  = require("./controllers/commit");
const { pushRepo }    = require("./controllers/push");
const { pullRepo }    = require("./controllers/pull");
const { revertRepo }  = require("./controllers/revert");
const { loginCLI }   = require("./controllers/loginCLI");

yargs(hideBin(process.argv))
  .command("start", "start a new server", {}, startServer)

  .command(
    "init [repoId]",
    "Initialize a new Repository and link it to a DevRift repo",
    (yargs) => {
      yargs.positional("repoId", {
        describe: "DevRift MongoDB Repository ID to link this folder to",
        type: "string",
        default: "",
      });
    },
    (argv) => {
      initRepo(argv.repoId);
    },
  )

  .command(
    "login",
    "Authenticate with DevRift and save your token locally",
    (yargs) => {
      yargs
        .option("email",    { type: "string", description: "Your DevRift email",    demandOption: true })
        .option("password", { type: "string", description: "Your DevRift password", demandOption: true });
    },
    (argv) => {
      loginCLI(argv);
    },
  )

  .command(
    "add <file>",
    "Add a file to the Repository",
    (yargs) => {
      yargs.positional("file", {
        describe: "file to add to the staging area",
        type: "string",
      });
    },
    (argv) => {
      addRepo(argv.file);
    },
  )

  .command(
    "commit <message>",
    "commit the staged files",
    (yargs) => {
      yargs.positional("message", {
        describe: "Commit Message",
        type: "string",
      });
    },
    (argv) => {
      commitRepo(argv.message);
    },
  )

  .command("push", "Push commits to DevRift via the backend", {}, pushRepo)

  .command("pull", "Pull commits from S3", {}, pullRepo)

  .command(
    "revert <commitId>",
    "revert to a specific commit",
    (yargs) => {
      yargs.positional("commitId", {
        describe: "Commit id to revert to",
        type: "string",
      });
    },
    (argv) => {
      revertRepo(argv.commitId);
    },
  )

  .demandCommand(1, "You Need At Least One Command")
  .help().argv;

function startServer() {
  const app = express();
  const port = process.env.PORT || 3000;

  app.use(bodyParser.json());
  app.use(express.json());

  const mongoURI = process.env.MONGO_URI;

  mongoose
    .connect(mongoURI)
    .then(() => {
    })
    .catch((err) => {
    });

  app.use(cors({ origin: "*" }));

  app.use("/", mainRouter);

  const httpServer = http.createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  app.set("io", io);

  io.on("connection", (socket) => {
    socket.on("joinRoom", (userId) => {
      socket.join(userId);
    });
  });

  const db = mongoose.connection;
  db.once("open", async () => {
  });

  httpServer.listen(port, () => {
  });
}
