const mongoose = require("mongoose");
const Notification = require("../model/notificationModel");

const getUserNotifications = async (req, res) => {
  const userId = req.params.userId;
  try {
    const notifications = await Notification.find({ recipient: userId })
      .populate("sender", "username")
      .sort({ createdAt: -1 })
      .limit(50); // Get latest 50 notifications
      
    res.json(notifications);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

const markAsRead = async (req, res) => {
  const notificationId = req.params.id;
  try {
    await Notification.findByIdAndUpdate(notificationId, { isRead: true });
    res.json({ message: "Notification marked as read" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

const markAllAsRead = async (req, res) => {
  const userId = req.params.userId;
  try {
    await Notification.updateMany({ recipient: userId, isRead: false }, { isRead: true });
    res.json({ message: "All notifications marked as read" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  getUserNotifications,
  markAsRead,
  markAllAsRead,
};
