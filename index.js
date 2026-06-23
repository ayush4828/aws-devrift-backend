#!/usr/bin/env node

const yargs = require("yargs");
const { hideBin } = require("yargs/helpers");

// Controllers are loaded lazily to improve performance and prevent global side effects

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
      require("./controllers/init").initRepo(argv.repoId);
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
      require("./controllers/loginCLI").loginCLI(argv);
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
      require("./controllers/add").addRepo(argv.file);
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
      require("./controllers/commit").commitRepo(argv.message);
    },
  )

  .command("push", "Push commits to DevRift via the backend", {}, (argv) => require("./controllers/push").pushRepo())

  .command("pull", "Pull commits from S3", {}, (argv) => require("./controllers/pull").pullRepo())

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
      require("./controllers/revert").revertRepo(argv.commitId);
    },
  )

  .demandCommand(1, "You Need At Least One Command")
  .help().argv;

function startServer() {
  const express = require("express");
  require("dotenv").config();
  const cors = require("cors");
  const mongoose = require("mongoose");
  const bodyParser = require("body-parser");
  const http = require("http");
  const { Server } = require("socket.io");
  const mainRouter = require("./routes/main.router");

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

  const allowedOrigins = [
  process.env.CLIENT_URL,
  "https://www.devrift.in",
  "http://localhost:5173"
];

app.use(cors({ origin: allowedOrigins }));

  app.use("/", mainRouter);

  const httpServer = http.createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: [process.env.CLIENT_URL, "https://www.devrift.in", "http://localhost:5173"],
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
