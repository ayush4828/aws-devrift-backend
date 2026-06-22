const mongoose = require("mongoose");
const Repository = require("../model/repoModel");
const User = require("../model/userModel");
const Issue = require("../model/issueModel");


const createRepository = async(req,res)=>{
  const { name, issues, content, description, visibility } = req.body;
  const owner = req.body.owner || req.userId;

  try {
    if (!name) {
      return res.status(400).json({ error: "Repository name is required!" });
    }

    if (!mongoose.Types.ObjectId.isValid(owner)) {
      return res.status(400).json({ error: "Invalid User ID!" });
    }

    const existingRepo = await Repository.findOne({ name, owner });
    if (existingRepo) {
      return res.status(400).json({ error: "You already have a repository with this name! Please choose another name." });
    }

    const newRepository = new Repository({
      name,
      description,
      visibility,
      owner,
      content,
      issues,
    });

    const result = await newRepository.save();

    await User.findByIdAndUpdate(owner, {
      $push: { repositories: result._id }
    });

    res.status(201).json({
      message: "Repository created!",
      repositoryID: result._id,
    });
  } catch (err) {
    res.status(500).json({ error: err.message, message: "Server error" });
  }
}
const getAllRepositories = async(req,res)=>{
    try{
        const repositories = await Repository.find({ visibility: { $ne: false } }).populate("owner").populate("issues");
        res.json(repositories);
    }
    catch (err) {
    res.status(500).send("Server error");
  }
}
const fetchRepositoryById = async(req,res)=>{
    const repoId = req.params.id
    const viewerId = req.userId; // From authMiddleware
    try{
        const repository = await Repository.findById(repoId).populate("owner").populate("issues");
        if(!repository){
            return res.status(404).json({message:"repository Not Found!!"})
        }

        if (repository.visibility === false && repository.owner._id.toString() !== viewerId) {
            return res.status(403).json({message:"Access Denied: This is a private repository."})
        }

        res.json(repository);
    }
    catch (err) {
    res.status(500).send("Server error");
    }

}
const fetchRepositoryByName = async(req,res)=>{
    const repoName = req.params.name;
    const viewerId = req.userId; // from authMiddleware
    try{
        const repository = await Repository.findOne({name:repoName}).populate("owner").populate("issues");
        if(!repository){
            return res.status(404).json({message:"Repository Not Found!!"})
        }

        if (repository.visibility === false && repository.owner._id.toString() !== viewerId) {
            return res.status(403).json({message:"Access Denied: This is a private repository."})
        }

        res.json(repository);
    }
    catch (err) {
    res.status(500).send("Server error");
    }

}
const fetchRepositoriesForCurrentUser = async (req, res) => {
  const targetUserId = req.params.userId;
  const viewerId = req.userId; // Provided by authMiddleware

  try {
    const query = { owner: targetUserId };
    if (targetUserId !== viewerId) {
      query.visibility = { $ne: false };
    }

    const repositories = await Repository.find(query).populate("issues");
    res.json({ message: "repositories found!!", repositories });
  } catch (err) {
    res.status(500).send("Server error");
  }
};

const updateRepositoryById = async(req,res)=>{
     
     const repoId = req.params.id;
     const {content,description,name} = req.body;
    try{
      const repository = await Repository.findById(repoId);

      if(!repository){
        return res.status(404).json({message:"Repository Not Found!!"})
      }

      if (content) {
        repository.content.push(content);
      }
      if (name) {
        repository.name = name;
      }
      repository.description = description || repository.description;
      const updatedRepo = await repository.save()
      res.json({message:"Repository Updated successfully!!" , updatedRepo})

    }catch (err) {
        res.status(500).send("Server error");
    }
}
const toggleVisibilityById = async(req,res)=>{
    const repoId = req.params.id;
    
    try{
      const repository = await Repository.findById(repoId);

      if(!repository){
        return res.status(404).json({message:"Repository Not Found!!"})
      }

      repository.visibility = !repository.visibility;
      const updatedRepo = await repository.save()
      res.json({message:"Visibility Toggled!!" , updatedRepo})

    }catch (err) {
        res.status(500).send("Server error");
    }
}
const deleteRepositoryById = async(req,res)=>{
    const repoId = req.params.id;
    const requesterId = req.userId; // from authMiddleware
    
    try{
      const repository = await Repository.findById(repoId);

      if(!repository){
        return res.status(404).json({message:"Repository Not Found!!"})
      }

      if(repository.owner.toString() !== requesterId){
        return res.status(403).json({message:"Forbidden: You can only delete your own repositories."})
      }

      await Repository.findByIdAndDelete(repoId);
      
      res.json({message:"Repository Deleted Successfully!!"})

    }catch (err) {
        res.status(500).send("Server error");
    }
}
const toggleStarRepository = async (req, res) => {
  const repoId = req.params.id;
  const userId = req.userId; // from authMiddleware

  try {
    const repository = await Repository.findById(repoId).populate("owner");
    if (!repository) {
      return res.status(404).json({ message: "Repository Not Found" });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User Not Found" });

    const isStarred = repository.stars.includes(userId);

    if (isStarred) {
      repository.stars.pull(userId);
      user.starRepos.pull(repoId);
    } else {
      repository.stars.push(userId);
      user.starRepos.push(repoId);
      
      if (repository.owner._id.toString() !== userId.toString()) {
        const Notification = require("../model/notificationModel");
        const notif = new Notification({
          recipient: repository.owner._id,
          sender: userId,
          type: "star",
          message: `starred your repository ${repository.name}`,
          link: `/repo/${repository._id}`
        });
        await notif.save();
        
        const io = req.app.get("io");
        if (io) {
          const populatedNotif = await notif.populate("sender", "username");
          io.to(repository.owner._id.toString()).emit("newNotification", populatedNotif);
        }
      }
    }

    await repository.save();
    await user.save();

    res.json({
      message: isStarred ? "Repository unstarred" : "Repository starred",
      starred: !isStarred,
      starCount: repository.stars.length
    });
  } catch (err) {
    res.status(500).send("Server error");
  }
};

module.exports = {
  createRepository,
  getAllRepositories,
  fetchRepositoryById,
  fetchRepositoryByName,
  fetchRepositoriesForCurrentUser,
  updateRepositoryById,
  toggleVisibilityById,
  deleteRepositoryById,
  toggleStarRepository,
};
