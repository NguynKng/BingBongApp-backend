const mongoose = require("mongoose");

const PostSchema = new mongoose.Schema({
  // 👤 Người tạo bài viết (luôn là User)
  author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

  // 🏠 Bối cảnh nơi bài viết được đăng (trang cá nhân, nhóm, hoặc shop)
  postedByType: {
    type: String,
    enum: ["User", "Shop", "Group"],
    required: true,
  },
  postedById: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: "postedByType",
  },

  // 📝 Nội dung bài viết
  content: { type: String, required: true },
  media: [{ type: String, default: "" }],

  reactions: [{ type: mongoose.Schema.Types.ObjectId, ref: "Reaction" }],
  comments: [{ type: mongoose.Schema.Types.ObjectId, ref: "Comment" }],

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Post", PostSchema);
