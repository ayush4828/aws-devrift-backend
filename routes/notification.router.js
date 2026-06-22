const express = require("express");
const notificationController = require("../controllers/notificationController");

const notificationRouter = express.Router();

notificationRouter.get("/notifications/:userId", notificationController.getUserNotifications);
notificationRouter.patch("/notifications/:id/read", notificationController.markAsRead);
notificationRouter.patch("/notifications/user/:userId/read-all", notificationController.markAllAsRead);

module.exports = notificationRouter;
