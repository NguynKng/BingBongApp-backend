const mongoose = require("mongoose");
const { removeVietnameseTones } = require("../utils/validate");

const ShopSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
    },
    description: {
      about: { type: String, trim: true },
      address: { type: String, trim: true },
      phone: { type: String, trim: true },
      email: { type: String, trim: true },
      website: { type: String, trim: true },
    },
    categories: [
      {
        _id: { type: mongoose.Schema.Types.ObjectId, auto: true },
        name: { type: String, required: true, trim: true },
        slug: { type: String, lowercase: true, trim: true },
      },
    ],
    followers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    avatar: { type: String, default: "/images/default-avatar/user.png" },
    coverPhoto: {
      type: String,
      default: "/images/default-avatar/background-gray.avif",
    },
  },
  { timestamps: true }
);

// Slug cho tên shop
ShopSchema.pre("save", function (next) {
  if (this.isModified("name")) {
    this.slug = removeVietnameseTones(this.name);
  }

  // Tự động tạo slug cho từng category (nếu chưa có)
  if (this.isModified("categories")) {
    this.categories = this.categories.map((cat) => ({
      ...cat,
      slug: removeVietnameseTones(cat.name),
    }));
  }

  next();
});

module.exports = mongoose.model("Shop", ShopSchema);
