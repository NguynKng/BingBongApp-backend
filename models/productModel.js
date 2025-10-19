const mongoose = require("mongoose");
const { removeVietnameseTones } = require("../utils/validate");

const ProductSchema = new mongoose.Schema(
  {
    shop: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shop",
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
      type: String,
      default: "",
    },
    category: {
      type: String, // ví dụ: "Áo", "Giày", "Laptop"
      required: true,
    },
    basePrice: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    variants: [
      {
        name: { type: String, required: true }, // ví dụ: "Đỏ - XL"
        price: { type: Number, required: true },
        stock: { type: Number, default: 0 },
        image: { type: String },
      },
    ],
    images: [String],
    brand: { type: String, default: "" },
    status: {
      type: String,
      enum: ["active", "inactive", "deleted"],
      default: "active",
    },
  },
  { timestamps: true }
);

// Slug cho tên shop
ProductSchema.pre("save", function (next) {
  if (this.isModified("name")) {
    this.slug = removeVietnameseTones(this.name);
  }

  next();
});

module.exports = mongoose.model("Product", ProductSchema);
