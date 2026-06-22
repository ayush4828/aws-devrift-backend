const mongoose = require("mongoose");
const {Schema} = mongoose;

const UserSchema = new Schema({
    username:{
        type:String,
        required:true,
        unique:true,
    },
    email:{
        type:String,
        required:true,
        unique:true,
    },
    password:{
        type:String,
    },
    avatar:{
        type: String,
        default: null,
    },
    bio:{
        type: String,
        default: "",
    },
    isEmailVerified: {
        type: Boolean,
        default: false,
    },
    verificationCode: {
        type: String,
        default: null,
    },
    verificationCodeExpires: {
        type: Date,
        default: null,
    },
    repositories:[
    {
      default: [],
      type: Schema.Types.ObjectId,
      ref: "Repository",
    },
    ],
    followedUser:[
        {
            default:[],
            type:Schema.Types.ObjectId,
            ref:"User",
        }
    ],
    followers:[
        {
            default:[],
            type:Schema.Types.ObjectId,
            ref:"User",
        }
    ],
    starRepos: [
    {
      default: [],
      type: Schema.Types.ObjectId,
      ref: "Repository",
    },
    ],
}, { timestamps: true })

UserSchema.pre('findOneAndDelete', async function() {
    const userId = this.getQuery()._id;

    await mongoose.model('User').updateMany(
        { $or: [{ followedUser: userId }, { followers: userId }] },
        { $pull: { followedUser: userId, followers: userId } }
    );

    await mongoose.model('Repository').updateMany(
        { stars: userId },
        { $pull: { stars: userId } }
    );

    await mongoose.model('Notification').deleteMany(
        { $or: [{ sender: userId }, { recipient: userId }] }
    );

    const repos = await mongoose.model('Repository').find({ owner: userId });
    const repoIds = repos.map(repo => repo._id);

    if (repoIds.length > 0) {
        await mongoose.model('Issue').deleteMany({ repository: { $in: repoIds } });

        await mongoose.model('Repository').deleteMany({ owner: userId });
    }
});

const User = mongoose.model("User",UserSchema);
module.exports = User;
