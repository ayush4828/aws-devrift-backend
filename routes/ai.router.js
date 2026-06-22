const express      = require("express");
const aiController = require("../controllers/aiController");

const aiRouter = express.Router();

aiRouter.post("/ai/explain/:repoId", aiController.explainRepo);
aiRouter.get("/ai/health/:repoId",   aiController.analyzeHealth);
aiRouter.get("/ai/resume/:userId",   aiController.generateResume);
aiRouter.get("/ai/readme/:repoId",   aiController.generateReadme);

module.exports = aiRouter;
