const mongoose = require("mongoose");

const PostSchema = new mongoose.Schema({
    author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    content: { type: String, required: true }, // Nội dung bài viết
    media: [{ type: String, default: "" }], // Danh sách ảnh/video
    reactions: [{ type: mongoose.Schema.Types.ObjectId, ref: "Reaction" }], // Liên kết với Reaction
    comments: [{ type: mongoose.Schema.Types.ObjectId, ref: "Comment" }],
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Post", PostSchema);
