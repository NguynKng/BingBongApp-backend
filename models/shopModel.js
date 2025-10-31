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

    // 🏪 Thông tin mô tả
    description: {
      about: { type: String, trim: true },
      address: { type: String, trim: true },
      phone: { type: String, trim: true },
      email: { type: String, trim: true },
      website: { type: String, trim: true },
    },

    // 🕒 Giờ mở - đóng cửa
    openTime: { type: String, default: "08:00", trim: true },
    closeTime: { type: String, default: "21:00", trim: true },

    // 📦 Danh mục chính mà shop thuộc về (để phân loại shop)
    mainCategory: {
      type: String,
      trim: true,
      default: "Khác", // ví dụ: Thời trang, Ẩm thực, Điện tử,...
    },

    // 📋 Danh sách category con (các loại sản phẩm/dịch vụ)
    categories: [
      {
        _id: { type: mongoose.Schema.Types.ObjectId, auto: true },
        name: { type: String, required: true, trim: true },
        slug: { type: String, lowercase: true, trim: true },
        isActive: { type: Boolean, default: true },
      },
    ],

    // 💬 Mạng xã hội / liên kết ngoài
    socials: {
      facebook: { type: String, trim: true },
      instagram: { type: String, trim: true },
      tiktok: { type: String, trim: true },
      youtube: { type: String, trim: true },
    },

    // 📈 Dữ liệu thống kê
    stats: {
      views: { type: Number, default: 0 },
      rating: { type: Number, default: 0 },
      totalReviews: { type: Number, default: 0 },
    },

    // ❤️ Theo dõi
    followers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    // 🖼️ Hình ảnh
    avatar: { type: String, default: "/images/default-avatar/user.png" },
    coverPhoto: {
      type: String,
      default: "/images/default-avatar/background-gray.avif",
    },

    // 📍 Vị trí (nếu sau này có map)
    mapURL: { type: String, trim: true. default },

    // 🔄 Trạng thái hoạt động (mở / tạm đóng / đang bảo trì)
    status: {
      type: String,
      enum: ["open", "closed", "maintenance"],
      default: "open",
    },
  },
  { timestamps: true }
);

// 🔤 Tạo slug cho tên shop & danh mục
ShopSchema.pre("save", function (next) {
  if (this.isModified("name")) {
    this.slug = removeVietnameseTones(this.name);
  }

  if (this.isModified("categories")) {
    this.categories = this.categories.map((cat) => ({
      ...cat,
      slug: removeVietnameseTones(cat.name),
    }));
  }

  next();
});

module.exports = mongoose.model("Shop", ShopSchema);
