const mongoose = require("mongoose");

const ChatSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["private", "group", "shop", "shop_channel", "fanpage"],
      required: true,
    },

    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    // shop id hoặc fanpage id (nếu applicable)
    shopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shop",
      default: null,
    },
    fanpageId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Group",
        default: null,
    },
    groupName: String,

    avatar: {
      type: String,
      default: "/images/default-avatar/group-chat.png",
    },

    lastMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
      default: null,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Đối với shop_channel: chỉ shop owner mới gửi
    onlyOwnerCanSend: {
      type: Boolean,
      default: false,
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Chat", ChatSchema);
