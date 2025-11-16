const mongoose = require("mongoose");

const MessageSchema = new mongoose.Schema(
  {
    chatId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Chat",
      required: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    text: { type: String, default: "" }, // Nội dung tin nhắn
    media: [{ type: String, default: "" }],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Message", MessageSchema);
