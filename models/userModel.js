const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  avatar: { type: String, default: "" }, // URL ảnh đại diện
  coverPhoto: { type: String, default: "" }, // Ảnh bìa

  // Thông tin cá nhân
  fullName: { type: String, required: true },
  dateOfBirth: { type: String, require: true },
  gender: { type: String, enum: ["Male", "Female", "Other"], default: "Other" },
  phoneNumber: { type: String, unique: true, sparse: true },
  address: { type: String, default: "" },
  bio: { type: String, default: "" }, // Tiểu sử
  website: { type: String, default: "" },
  badgeInventory: [
    {
      badgeId: { type: mongoose.Schema.Types.ObjectId, ref: "Badge" },
      earnedAt: { type: Date, default: Date.now },
      isEquipped: { type: Boolean, default: false } // ✅ Có đang trang bị không
    },
  ],
  // Mối quan hệ
  friends: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  friendRequests: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], // Lời mời kết bạn
  isVerified: { type: Boolean, default: false }, // Trạng thái xác thực email

  // Cài đặt quyền riêng tư
  privacy: {
    profileVisibility: {
      type: String,
      enum: ["public", "friends", "private"],
      default: "public",
    },
    postVisibility: {
      type: String,
      enum: ["public", "friends", "private"],
      default: "public",
    },
  },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("User", UserSchema);
