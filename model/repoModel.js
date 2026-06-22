const mongoose = require("mongoose");
const {Schema} = mongoose;

const CommitFileSchema = new Schema({
  s3Key:    { type: String, required: true },
  filename: { type: String, required: true },
}, { _id: false });

const CommitSchema = new Schema({
  commitId:  { type: String, required: true },
  message:   { type: String, default: "" },
  timestamp: { type: Date, default: Date.now },
  files:     [CommitFileSchema],
}, { _id: false });

const RepoSchema = new Schema({
  name: {
    type: String,
    required: true,
  },
  description: {
    type: String,
  },
  content: [{ type: String }],
  commits: [CommitSchema],
  lastPushedAt: {
    type: Date,
  },
  visibility: {
    type: Boolean,
    default: true,
  },
  owner: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  issues: [
    {
      type: Schema.Types.ObjectId,
      ref: "Issue",
    },
  ],
  stars: [
    {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  ],
}, { timestamps: true });

RepoSchema.pre('findOneAndDelete', async function() {
    const repoId = this.getQuery()._id;

    await mongoose.model('User').updateMany(
        { starRepos: repoId },
        { $pull: { starRepos: repoId } }
    );

    await mongoose.model('User').updateMany(
        { repositories: repoId },
        { $pull: { repositories: repoId } }
    );

    await mongoose.model('Issue').deleteMany({ repository: repoId });
});

const Repository = mongoose.model("Repository", RepoSchema);

module.exports = Repository;
