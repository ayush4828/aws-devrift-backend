const mongoose = require("mongoose");
const Repository = require("../model/repoModel");
const User = require("../model/userModel");
const Issue = require("../model/issueModel");


const createIssue = async (req, res) => {
  const { title, description } = req.body;
  const repoId = req.params.repoId; // ✅ fixed: was req.params.id
  const userId = req.userId; // Needs authMiddleware on route
  try {
    if (!title || !description) {
      return res.status(400).json({ message: "Title and description are required." });
    }

    const issue = new Issue({ title, description, repository: repoId });
    await issue.save();

    const repo = await Repository.findByIdAndUpdate(repoId, { $push: { issues: issue._id } });

    if (userId && repo && repo.owner.toString() !== userId.toString()) {
      const user = await User.findById(userId);
      const Notification = require("../model/notificationModel");
      const notif = new Notification({
        recipient: repo.owner,
        sender: userId,
        type: "issue",
        message: `opened a new issue on your repository ${repo.name}`,
        link: `/repo/${repo._id}`
      });
      await notif.save();

      const io = req.app.get("io");
      if (io && user) {
        const notifData = notif.toObject();
        notifData.sender = { _id: userId, username: user.username };
        io.to(repo.owner.toString()).emit("newNotification", notifData);
      }
    }

    res.status(201).json(issue);
  } catch (err) {
    res.status(500).send("Server error");
  }
};

const updateIssueById = async (req, res) => {
  const id = req.params.id;
  const { title, description, status } = req.body;
  const requesterId = req.userId; // from authMiddleware

  try {
    const issue = await Issue.findById(id).populate("repository");
    if (!issue) {
      return res.status(404).json({ message: "Issue Not Found!!" });
    }

    if (issue.repository.owner.toString() !== requesterId) {
      return res.status(403).json({ message: "Forbidden: You can only update issues in your own repository." });
    }

    if (title       !== undefined) issue.title       = title;
    if (description !== undefined) issue.description = description;
    if (status      !== undefined) issue.status      = status;

    await issue.save();
    res.json(issue);
  } catch (err) {
    res.status(500).send("Server error");
  }
};


const deleteIssueById = async(req,res)=>{
    const id = req.params.id;
    const requesterId = req.userId; // from authMiddleware
    
    try{
        const issue = await Issue.findById(id).populate("repository");
        if(!issue){
             return res.status(404).json({message:"Issue Not Found!!"})
        }

        if (issue.repository.owner.toString() !== requesterId) {
            return res.status(403).json({ message: "Forbidden: You can only delete issues in your own repository." });
        }

        await Issue.findByIdAndDelete(id);

        
        res.json({message:"Issue Deleted Successfully!! "});
     } catch (err) {
    res.status(500).send("Server error");
  }
}

const getAllIssues = async (req, res) => {
  const repoId = req.params.repoId; // ✅ fixed: was req.params.id
  try {
    const issues = await Issue.find({ repository: repoId }).sort({ _id: -1 });
    res.status(200).json(issues);
  } catch (err) {
    res.status(500).send("Server error");
  }
};

const getIssueById = async(req,res)=>{
    const issueId = req.params.id;

    try{

        const issue = await Issue.findById(issueId);

        if(!issue){
            return res.status(404).json({message:"Issue Not Found!!"});
        }
        res.status(200).json(issue)

    }catch (err) {
    res.status(500).send("Server error");
}
}

module.exports = {
createIssue,
updateIssueById,
deleteIssueById,
getAllIssues,
getIssueById,
}
