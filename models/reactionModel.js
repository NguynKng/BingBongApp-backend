const mongoose = require("mongoose")

const ReactionSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    post: { type: mongoose.Schema.Types.ObjectId, ref: "Post" },
    comment: { type: mongoose.Schema.Types.ObjectId, ref: "Comment" },
    type: { type: String, enum: ["like", "love", "haha", "sad", "angry"], required: true },
    createdAt: { type: Date, default: Date.now }
});
  
module.exports = mongoose.model("Reaction", ReactionSchema);
  