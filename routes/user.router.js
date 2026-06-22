const express = require("express");
const userController = require("../controllers/userController")
const authMiddleware = require("../middleware/authMiddleware");

const userRouter = express.Router();

userRouter.get("/allusers" , userController.getAllUsers);
userRouter.post("/signup" , userController.signUp);
userRouter.post("/login" , userController.login);
userRouter.get("/userprofile/:id" , userController.getUserProfile);
userRouter.put("/updateprofile/:id" , authMiddleware, userController.updateUserProfile);
userRouter.delete("/deleteprofile/:id" , authMiddleware, userController.deleteUserProfile);
userRouter.post("/follow" , authMiddleware, userController.followUser);
userRouter.post("/unfollow" , authMiddleware, userController.unfollowUser);
userRouter.post("/change-password", userController.changePassword);
userRouter.post("/verify-email", userController.verifyEmail);
userRouter.post("/resend-verification", userController.resendVerificationCode);

module.exports = userRouter;
