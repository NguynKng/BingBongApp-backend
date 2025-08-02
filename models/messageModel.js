const mongoose = require("mongoose")

const MessageSchema = new mongoose.Schema({
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    receiverId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    text: { type: String, default: "" }, // Nội dung tin nhắn
    media: [{ type: String, default: "" }],
    createdAt: { type: Date, default: Date.now }
  });
  
  module.exports = mongoose.model("Message", MessageSchema);
  