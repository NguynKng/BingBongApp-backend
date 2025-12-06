const mongoose = require("mongoose");

const ShopFollowHistorySchema = new mongoose.Schema(
  {
    shop: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shop",
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    action: {
      type: String,
      enum: ["follow", "unfollow"],
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ShopFollowHistory", ShopFollowHistorySchema);
