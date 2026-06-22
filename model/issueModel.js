const mongoose = require("mongoose");
const {Schema} = mongoose;

const IssueSchema = new Schema({
    title:{
        type:String,
        required:true
    },
    description:{
        type:String,
        required:true
    },
    status:{
        type:String,
        enum:["open","closed"],
        default:"open"
    },
    repository:{
        type:Schema.Types.ObjectId,
        ref:"Repository",
        required:true
    },
}, { timestamps: true });

IssueSchema.pre('findOneAndDelete', async function() {
    const issueId = this.getQuery()._id;

    await mongoose.model('Repository').updateMany(
        { issues: issueId },
        { $pull: { issues: issueId } }
    );
});

const Issue = mongoose.model("Issue",IssueSchema);
module.exports = Issue;
