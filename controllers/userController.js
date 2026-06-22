const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const {MongoClient, ReturnDocument} = require("mongodb");
const dotenv = require("dotenv").config();
const ObjectId = require("mongodb").ObjectId;
const crypto = require("crypto");
const sendEmail = require("../utils/sendEmail");
const User = require("../model/userModel");

let client;
const uri = process.env.MONGO_URI;

async function connectClient(){
    if(!client){
        client = new MongoClient(uri);
    }
    await client.connect();
}

const cartoonAvatars = [
  "https://robohash.org/Felix?set=set1",
  "https://robohash.org/Aneka?set=set1",
  "https://robohash.org/Peanut?set=set1",
  "https://robohash.org/Bandit?set=set1",
  "https://robohash.org/Mittens?set=set1",
  "https://robohash.org/Socks?set=set1",
  "https://robohash.org/Patches?set=set1",
  "https://robohash.org/Cali?set=set1",
  "https://robohash.org/Dusty?set=set1",
  "https://robohash.org/Misty?set=set1",
   "https://robohash.org/Shadow?set=set1",
  "https://robohash.org/Luna?set=set1",
  "https://robohash.org/Blaze?set=set1",
  "https://robohash.org/Ziggy?set=set1",
  "https://robohash.org/Cosmo?set=set1",
  "https://robohash.org/Pixel?set=set1",
  "https://robohash.org/Turbo?set=set1",
  "https://robohash.org/Sparky?set=set1",
  "https://robohash.org/Nugget?set=set1",
  "https://robohash.org/Waffles?set=set1",
  "https://robohash.org/Biscuit?set=set1",
  "https://robohash.org/Mochi?set=set1",
  "https://robohash.org/Oreo?set=set1",
  "https://robohash.org/Toffee?set=set1",
  "https://robohash.org/Maple?set=set1",
  "https://robohash.org/Gizmo?set=set1",
  "https://robohash.org/Bolt?set=set1",
  "https://robohash.org/Nova?set=set1",
  "https://robohash.org/Echo?set=set1",
  "https://robohash.org/Vortex?set=set1",
  "https://robohash.org/Zephyr?set=set1",
  "https://robohash.org/Comet?set=set1",
  "https://robohash.org/Rocket?set=set1",
  "https://robohash.org/Nebula?set=set1",
  "https://robohash.org/Quasar?set=set1",
  "https://robohash.org/Doodle?set=set1",
  "https://robohash.org/Fudge?set=set1",
  "https://robohash.org/Pudding?set=set1",
  "https://robohash.org/Jellybean?set=set1",
  "https://robohash.org/Sprout?set=set1",
  "https://robohash.org/Mango?set=set1",
  "https://robohash.org/Kiwi?set=set1",
  "https://robohash.org/Papaya?set=set1",
  "https://robohash.org/Pumpkin?set=set1",
  "https://robohash.org/Cashew?set=set1",
  "https://robohash.org/Walnut?set=set1",
  "https://robohash.org/Hazel?set=set1",
  "https://robohash.org/Cheddar?set=set1",
  "https://robohash.org/Gouda?set=set1",
  "https://robohash.org/Nacho?set=set1",
  "https://robohash.org/Taco?set=set1",
  "https://robohash.org/Burrito?set=set1",
  "https://robohash.org/Noodle?set=set1",
  "https://robohash.org/Dumpling?set=set1",
  "https://robohash.org/Sushi?set=set1",
  "https://robohash.org/Ramen?set=set1",
  "https://robohash.org/Kimchi?set=set1",
  "https://robohash.org/Pretzel?set=set1",
  "https://robohash.org/Bagel?set=set1",
];

const signUp = async(req,res)=>{
    const {username,email,password} = req.body;
    try{
    await connectClient();
    const db = client.db("devrift");
    const usersCollection = db.collection("users");
    
    const user = await usersCollection.findOne({username}); 

    if(user){
        return res.status(400).json({message:"user already exists!!"})
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password,salt);
    
    const randomAvatar = cartoonAvatars[Math.floor(Math.random() * cartoonAvatars.length)];

    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const verificationCodeExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

    const newUser = {
        username,
        password:hashedPassword,
        email,
        avatar: randomAvatar,
        bio: "",
        socialLinks: {},
        repositories:[],
        followedUser:[],
        followers:[],
        starRepos:[],
        isEmailVerified: false,
        verificationCode,
        verificationCodeExpires
    }

   let result = await usersCollection.insertOne(newUser);

   try {
     await sendEmail({
       email: email,
       subject: "Verify Your Email Address - DevRift",
       message: `Your verification code is ${verificationCode}`,
       code: verificationCode
     });
   } catch (error) {
   }

   res.json({requiresVerification: true, email: email, message: "Verification email sent"});
    }
    catch(err){
      res.status(500).send("server error")
    }

}
const login = async(req,res)=>{
     const {email,password} = req.body;
    try{
    await connectClient();
    const db = client.db("devrift");
    const usersCollection = db.collection("users");
    
    const user = await usersCollection.findOne({email}); 
    
    if(!user){
        return res.status(400).json({message:"Invalid Credential!!"})
    }
    
    const isMatch = await bcrypt.compare(password,user.password)
    if(!isMatch){
        return res.status(400).json({message:"Invalid Credential!!"})
    }

    if (user.isEmailVerified === false) {
        return res.status(403).json({ requiresVerification: true, email: user.email, message: "Please verify your email address first." });
    }

    if (!user.avatar) {
        const randomAvatar = cartoonAvatars[Math.floor(Math.random() * cartoonAvatars.length)];
        await usersCollection.updateOne(
            { _id: user._id }, 
            { $set: { avatar: randomAvatar, bio: "", socialLinks: {} } }
        );
        user.avatar = randomAvatar;
    }

   const token = jwt.sign({id:user._id},process.env.JWT_SECRET_KEY,{expiresIn:"7d"})
   res.json({token,userId:user._id, avatar: user.avatar});
    }
    catch(err){
      res.status(500).send("server error");
    }

}

const getAllUsers = async(req,res)=>{
    try{
    await connectClient();
    const db = client.db("devrift");
    const usersCollection = db.collection("users");
    const users = await usersCollection.aggregate([
      {
        $lookup: {
          from: "repositories",
          let: { userId: "$_id" },
          pipeline: [
            { 
              $match: { 
                $expr: { $eq: ["$owner", "$$userId"] },
                visibility: { $ne: false }
              }
            }
          ],
          as: "repositories"
        }
      }
    ]).toArray();

    let updatedUsers = false;
    for (let user of users) {
        if (!user.avatar || user.avatar.includes("dicebear.com")) {
            const randomAvatar = cartoonAvatars[Math.floor(Math.random() * cartoonAvatars.length)];
            await usersCollection.updateOne(
                { _id: user._id }, 
                { $set: { avatar: randomAvatar } }
            );
            user.avatar = randomAvatar;
            updatedUsers = true;
        }
    }

    res.json(users)

    }
    catch(err){
      res.status(500).send("server error");
    }

}

const getUserProfile = async(req,res)=>{
    const currId= req.params.id;
    try{
    await connectClient();
    const db = client.db("devrift");
    const usersCollection = db.collection("users");
    
    const user = await usersCollection.findOne({
        _id : new ObjectId(currId),
    }); 
    
    if(!user){
        return res.status(404).json({message:"User Not Found!!"})
    }

    if (!user.avatar || user.avatar.includes("dicebear.com")) {
        const randomAvatar = cartoonAvatars[Math.floor(Math.random() * cartoonAvatars.length)];
        await usersCollection.updateOne(
            { _id: user._id }, 
            { $set: { avatar: randomAvatar } }
        );
        user.avatar = randomAvatar;
    }

    res.send(user)
    }
    catch(err){
      res.status(500).send("server error");
    }    
}
const updateUserProfile = async(req,res)=>{
    const currId = req.params.id;
    const {email,password,username} = req.body;

    try{
    await connectClient();
    const db = client.db("devrift");
    const usersCollection = db.collection("users");
    
    const updateFields = {};
    if(email) updateFields.email = email;
    if(username) updateFields.username = username;
    if(password){
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password,salt);
        updateFields.password = hashedPassword;
    }

    const result = await usersCollection.findOneAndUpdate(
        {
        _id:new ObjectId(currId)
         },
        {
            $set : updateFields
        },
        {
            returnDocument:"after"
        })

        if(!result){
         return res.status(404).json({message:"User Not Found!!"});
        }
        res.json(result);
    
    
    }
    catch(err){
      res.status(500).send("server error");
    }
   
}
const deleteUserProfile = async (req, res) => {
    const currId = req.params.id;
    
    try {
        await connectClient(); // Keeping this if other parts need it, but we use Mongoose now
        const db = client.db("devrift");
        const usersCollection = db.collection("users");

        await usersCollection.updateMany(
            {},
            { 
                $pull: { 
                    followedUser: { $in: [currId, new ObjectId(currId)] },
                    followers: { $in: [currId, new ObjectId(currId)] }
                } 
            }
        );
        
        const result = await User.findOneAndDelete({ _id: currId });

        if (!result) {
            return res.status(404).json({ message: "User Not Found!!" });
        }
        res.json({ message: "User Profile Deleted!!" });
    } catch (err) {
        res.status(500).send("server error");
    }
};

const followUser = async(req, res) => {
    const { followerId, targetUserId } = req.body; 

    try {
        await connectClient();
        const db = client.db("devrift");
        const usersCollection = db.collection("users");

        await usersCollection.updateOne(
            { _id: new ObjectId(followerId) },
            { $addToSet: { followedUser: new ObjectId(targetUserId) } }
        );

        await usersCollection.updateOne(
            { _id: new ObjectId(targetUserId) },
            { $addToSet: { followers: new ObjectId(followerId) } }
        );

        const user = await usersCollection.findOne({ _id: new ObjectId(followerId) });

        const Notification = require("../model/notificationModel");
        const notif = new Notification({
            recipient: targetUserId,
            sender: followerId,
            type: "follow",
            message: `started following you`,
            link: `/profile/${followerId}`
        });
        await notif.save();

        const io = req.app.get("io");
        if (io && user) {
            const notifData = notif.toObject();
            notifData.sender = { _id: followerId, username: user.username };
            io.to(targetUserId.toString()).emit("newNotification", notifData);
        }

        res.json({ message: "Successfully followed user!" });
    } catch (err) {
        res.status(500).send("server error");
    }
};

const unfollowUser = async(req, res) => {
    const { followerId, targetUserId } = req.body; 

    try {
        await connectClient();
        const db = client.db("devrift");
        const usersCollection = db.collection("users");

        await usersCollection.updateOne(
            { _id: new ObjectId(followerId) },
            { $pull: { followedUser: { $in: [new ObjectId(targetUserId), targetUserId] } } }
        );

        await usersCollection.updateOne(
            { _id: new ObjectId(targetUserId) },
            { $pull: { followers: { $in: [new ObjectId(followerId), followerId] } } }
        );

        res.json({ message: "Successfully unfollowed user!" });
    } catch (err) {
        res.status(500).send("server error");
    }
};

const changePassword = async (req, res) => {
    const { email, oldPassword, newPassword } = req.body;
    try {
        await connectClient();
        const db = client.db("devrift");
        const usersCollection = db.collection("users");

        const user = await usersCollection.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: "User not found!" });
        }

        if (user.password === "") {
            return res.status(400).json({ message: "This account uses Google/GitHub login. You cannot change its password." });
        }

        const isMatch = await bcrypt.compare(oldPassword, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: "Incorrect old password!" });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        await usersCollection.updateOne(
            { _id: user._id },
            { $set: { password: hashedPassword } }
        );

        res.json({ message: "Password changed successfully!" });
    } catch (err) {
        res.status(500).send("server error");
    }
};

const verifyEmail = async (req, res) => {
    const { email, code } = req.body;
    try {
        await connectClient();
        const db = client.db("devrift");
        const usersCollection = db.collection("users");

        const user = await usersCollection.findOne({ email });

        if (!user) {
            return res.status(404).json({ message: "User not found!" });
        }

        if (user.isEmailVerified) {
            return res.status(400).json({ message: "Email is already verified!" });
        }

        if (user.verificationCode !== code) {
            return res.status(400).json({ message: "Invalid verification code!" });
        }

        if (user.verificationCodeExpires < new Date()) {
            return res.status(400).json({ message: "Verification code expired!" });
        }

        await usersCollection.updateOne(
            { _id: user._id },
            { 
                $set: { isEmailVerified: true },
                $unset: { verificationCode: "", verificationCodeExpires: "" }
            }
        );

        if (!user.avatar) {
            const randomAvatar = cartoonAvatars[Math.floor(Math.random() * cartoonAvatars.length)];
            await usersCollection.updateOne({ _id: user._id }, { $set: { avatar: randomAvatar } });
            user.avatar = randomAvatar;
        }

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET_KEY, { expiresIn: "7d" });
        res.json({ message: "Email verified successfully!", token, userId: user._id, avatar: user.avatar });

    } catch (err) {
        res.status(500).send("Server error");
    }
};

const resendVerificationCode = async (req, res) => {
    const { email } = req.body;
    try {
        await connectClient();
        const db = client.db("devrift");
        const usersCollection = db.collection("users");

        const user = await usersCollection.findOne({ email });

        if (!user) {
            return res.status(404).json({ message: "User not found!" });
        }

        if (user.isEmailVerified) {
            return res.status(400).json({ message: "Email is already verified!" });
        }

        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
        const verificationCodeExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

        await usersCollection.updateOne(
            { _id: user._id },
            { $set: { verificationCode, verificationCodeExpires } }
        );

        try {
            await sendEmail({
                email: email,
                subject: "Resend: Verify Your Email Address - DevRift",
                message: `Your new verification code is ${verificationCode}`,
                code: verificationCode
            });
            res.json({ message: "Verification code resent successfully!" });
        } catch (error) {
            res.status(500).json({ message: "Could not send email. Please try again later." });
        }

    } catch (err) {
        res.status(500).send("Server error");
    }
};

module.exports = {
    getAllUsers,
    signUp,
    login,
    getUserProfile,
    updateUserProfile,
    deleteUserProfile,
    followUser,
    unfollowUser,
    changePassword,
    verifyEmail,
    resendVerificationCode
}
