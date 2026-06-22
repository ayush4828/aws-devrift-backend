const express         = require("express");
const multer          = require("multer");
const repoController  = require("../controllers/repoController");
const pushController  = require("../controllers/pushController");
const authMiddleware  = require("../middleware/authMiddleware");
const { s3, S3_Bucket } = require("../config/aws-config");

const repoRouter = express.Router();

const upload = multer({ storage: multer.memoryStorage() });

repoRouter.post("/repo/create",          authMiddleware, repoController.createRepository);
repoRouter.get("/repo/all",              repoController.getAllRepositories);
repoRouter.get("/repo/name/:name",       authMiddleware, repoController.fetchRepositoryByName);
repoRouter.get("/repo/user/:userId",     authMiddleware, repoController.fetchRepositoriesForCurrentUser);
repoRouter.put("/repo/update/:id",       authMiddleware, repoController.updateRepositoryById);
repoRouter.patch("/repo/toggle/:id",     authMiddleware, repoController.toggleVisibilityById);
repoRouter.delete("/repo/delete/:id",    authMiddleware, repoController.deleteRepositoryById);
repoRouter.post("/repo/toggle-star/:id", authMiddleware, repoController.toggleStarRepository);

repoRouter.get("/repo/file", authMiddleware, async (req, res) => {
  const { key } = req.query;
  if (!key) return res.status(400).json({ message: "Missing ?key= query param" });

  try {
    const data = await s3.getObject({ Bucket: S3_Bucket, Key: key }).promise();
    const content = data.Body.toString("utf-8");
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.send(content);
  } catch (err) {
    res.status(404).json({ message: "File not found in S3", error: err.message });
  }
});

repoRouter.post(
  "/repo/push/:repoId",
  authMiddleware,
  upload.array("files"),
  pushController.pushToRepo
);

repoRouter.post("/repo/toggle-star/:id", authMiddleware, repoController.toggleStarRepository);
repoRouter.get("/repo/:id",              authMiddleware, repoController.fetchRepositoryById);

module.exports = repoRouter;
