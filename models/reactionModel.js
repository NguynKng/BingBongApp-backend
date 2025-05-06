const mongoose = require("mongoose")

const ReactionSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    post: { type: mongoose.Schema.Types.ObjectId, ref: "Post" },
    type: { type: String, enum: ["Like", "Love", "Haha", "Sad", "Angry", "Wow", "Care"], required: true },
    createdAt: { type: Date, default: Date.now }
});
  
module.exports = mongoose.model("Reaction", ReactionSchema);
  