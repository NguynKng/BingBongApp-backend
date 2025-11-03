const mongoose = require("mongoose");
const slugify = require("slugify");

// Mạng xã hội (vẫn giữ nguyên)
const SocialSchema = new mongoose.Schema({
  platform: { type: String, trim: true }, // Facebook, Instagram, LinkedIn...
  url: { type: String, trim: true },
});

// 🎓 Học vấn đơn giản
const EducationSchema = new mongoose.Schema({
  school: { type: String, required: true, trim: true },
  major: { type: String, trim: true }, // Ngành học
  year: { type: String, trim: true }, // Ví dụ: "2019 - 2023" hoặc chỉ "2023"
});

// 💼 Công việc đơn giản
const WorkSchema = new mongoose.Schema({
  company: { type: String, required: true, trim: true },
  position: { type: String, trim: true },
  duration: { type: String, trim: true }, // Ví dụ: "2022 - nay" hoặc "2020 - 2023"
});

const BadgeSchema = new mongoose.Schema({
  badgeId: { type: mongoose.Schema.Types.ObjectId, ref: "Badge" },
  earnedAt: { type: Date, default: Date.now },
  isEquipped: { type: Boolean, default: false },
});

const UserSchema = new mongoose.Schema(
  {
    // ======= Tài khoản cơ bản =======
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    fullName: { type: String, required: true },
    dateOfBirth: { type: String, required: true },
    gender: {
      type: String,
      enum: ["Male", "Female", "Other"],
      default: "Other",
    },

    avatar: { type: String, default: "/images/default-avatar/user.png" },
    coverPhoto: {
      type: String,
      default: "/images/default-avatar/background-gray.avif",
    },
    slug: { type: String, unique: true, trim: true },
    // ======= Thông tin mở rộng =======
    bio: { type: String, default: "" },
    address: { type: String, default: "" },
    phoneNumber: { type: String, unique: true, sparse: true },
    website: { type: String, default: "" },

    // 🎓 Học vấn & 💼 Công việc
    education: { type: EducationSchema, default: [] },
    work: { type: WorkSchema, default: [] },
    socialLinks: { type: [SocialSchema], default: [] },

    // Sở thích & kỹ năng
    skills: [{ type: String, trim: true }],
    interests: [{ type: String, trim: true }],

    // 👥 Quan hệ xã hội
    friends: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    friendRequests: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],

    // 🏅 Huy hiệu
    badgeInventory: [BadgeSchema],
    cart: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Cart", // ✅ Reference the Cart model instead of an array
    },
    // ⚙️ Cài đặt
    isVerified: { type: Boolean, default: false },
    block: { type: Boolean, default: false },
    role: { type: String, enum: ["user", "admin"], default: "user" },

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
  },
  { timestamps: true }
);

UserSchema.pre("save", async function (next) {
  if (!this.isModified("fullName") && this.slug) return next();

  // 1️⃣ Chuyển fullName thành dạng slug không dấu
  const parts = slugify(this.fullName, {
    lower: true,
    strict: true, // loại bỏ ký tự đặc biệt, giữ dấu "-"
  }).split("-");

  // 2️⃣ Nối lại bằng dấu chấm thay vì dấu gạch
  const baseSlug = parts.join(".");

  // 3️⃣ Sinh số random 6 chữ số và đảm bảo duy nhất
  let slugCandidate;
  let isUnique = false;

  while (!isUnique) {
    const randomNum = Math.floor(100000 + Math.random() * 900000);
    slugCandidate = `${baseSlug}.${randomNum}`;

    const existingUser = await mongoose.models.User.findOne({
      slug: slugCandidate,
    });

    if (!existingUser) {
      isUnique = true;
    }
  }

  this.slug = slugCandidate;
  next();
});

module.exports = mongoose.model("User", UserSchema);
