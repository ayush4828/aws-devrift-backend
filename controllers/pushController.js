const { s3, S3_Bucket } = require("../config/aws-config");
const Repository = require("../model/repoModel");
const { v4: uuidv4 } = require("uuid");

/**
 * POST /repo/push/:repoId
 * 
 * Receives commit files from the local CLI via multipart/form-data.
 * For each file:
 *   1. Uploads it to S3 under commits/<repoId>/<commitId>/<filename>
 *   2. Appends the commit metadata to MongoDB Repository document
 *   3. Emits a Socket.IO "repoUpdated" event to the repo owner's room
 */
const pushToRepo = async (req, res) => {
  const { repoId } = req.params;
  const userId = req.userId; // set by authMiddleware
  const files = req.files;   // set by multer

  const commitMessage = req.body.commitMessage || "No message";
  const commitId      = req.body.commitId      || uuidv4();

  if (!files || files.length === 0) {
    return res.status(400).json({ message: "No files received." });
  }

  try {
    const repository = await Repository.findById(repoId);
    if (!repository) {
      return res.status(404).json({ message: "Repository not found." });
    }
    if (repository.owner.toString() !== userId) {
      return res.status(403).json({ message: "Forbidden: You do not own this repository." });
    }

    let filePaths = req.body.filePaths || [];
    if (!Array.isArray(filePaths)) {
      filePaths = [filePaths];
    }

    const uploadedFiles = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const relativePath = filePaths[i] || file.originalname;
      
      const s3Key = `commits/${repoId}/${commitId}/${relativePath}`;
      await s3
        .upload({
          Bucket: S3_Bucket,
          Key:    s3Key,
          Body:   file.buffer,
          ContentType: file.mimetype || "application/octet-stream",
        })
        .promise();

      uploadedFiles.push({ s3Key, filename: relativePath });
    }

    const newCommit = {
      commitId,
      message:   commitMessage,
      timestamp: new Date(),
      files:     uploadedFiles,
    };

    repository.commits.push(newCommit);
    repository.lastPushedAt = new Date();
    const updatedRepo = await repository.save();

    const io = req.app.get("io");
    if (io) {
      io.to(userId).emit("repoUpdated", {
        repoId,
        commit: newCommit,
        lastPushedAt: updatedRepo.lastPushedAt,
      });
    }

    return res.status(200).json({
      message:     "Push successful!",
      commitId,
      filesUploaded: uploadedFiles.length,
      lastPushedAt: updatedRepo.lastPushedAt,
    });
  } catch (err) {
    return res.status(500).json({ message: "Server error during push.", error: err.message });
  }
};

module.exports = { pushToRepo };
