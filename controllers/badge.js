const Badge = require("../models/badgeModel");
const User = require("../models/userModel");

const getAllBadges = async (req, res) => {
  try {
    const badges = await Badge.find({ isActive: true }).sort({ createdAt: -1 });
    res.status(200).json(badges);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
};

const getUserBadgeInventory = async (req, res) => {
  const userId = req.user._id; // Lấy ID người dùng từ token đã xác thực
  try {
    const user = await User.findById(userId)
      .select("badgeInventory")
      .populate("badgeInventory.badgeId");
    res.status(200).json({
      success: true,
      data: user.badgeInventory,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
};

const addBadge = async (req, res) => {
  const badges = [
    {
      name: "Tân Binh Chất",
      description: "Chào mừng bạn đến với mạng xã hội!",
      icon: "newbie.png",
      condition: { type: "account_age", operator: ">=", value: 0 },
    },
    {
      name: "Dân Chơi 7 Ngày",
      description: "Đã sống sót trên mạng 7 ngày",
      icon: "1week.png",
      condition: { type: "account_age", operator: ">=", value: 7 },
    },
    {
      name: "Dân Cứng 1 Tháng",
      description: "Ở lại 30 ngày rồi nè!",
      icon: "1month.png",
      condition: { type: "account_age", operator: ">=", value: 30 },
    },
    {
      name: "Chăm Chỉ Post",
      description: "Đăng 10 bài viết",
      icon: "hardworking.png",
      condition: { type: "posts_count", operator: ">=", value: 10 },
    },
    {
      name: "Đăng Thủ Phủ",
      description: "Đăng 50 bài viết",
      icon: "diligent.png",
      condition: { type: "posts_count", operator: ">=", value: 50 },
    },
    {
      name: "Ông Hoàng Content",
      description: "Đăng 100 bài viết",
      icon: "superposter.png",
      condition: { type: "posts_count", operator: ">=", value: 100 },
    },
    {
      name: "Like Nhẹ Tay",
      description: "Nhận 50 lượt thích",
      icon: "liked50.png",
      condition: { type: "likes_received", operator: ">=", value: 50 },
    },
    {
      name: "Đỉnh Của Đỉnh",
      description: "Nhận 200 lượt thích",
      icon: "superhot.png",
      condition: { type: "likes_received", operator: ">=", value: 200 },
    },
    {
      name: "Hot Face",
      description: "Nhận 500 lượt thích",
      icon: "famous.png",
      condition: { type: "likes_received", operator: ">=", value: 500 },
    },
    {
      name: "Bạn Mới Tinh",
      description: "Có 1 người bạn",
      icon: "firstfriend.png",
      condition: { type: "friends_count", operator: ">=", value: 1 },
    },
    {
      name: "Bạn Bè Phủ Khắp",
      description: "Có 10 người bạn",
      icon: "friendly.png",
      condition: { type: "friends_count", operator: ">=", value: 10 },
    },
    {
      name: "Best Friend Forever",
      description: "Có 50 người bạn",
      icon: "popular.png",
      condition: { type: "friends_count", operator: ">=", value: 50 },
    },
    {
      name: "Còm Men Chuyên Nghiệp",
      description: "Viết 20 bình luận",
      icon: "comment20.png",
      condition: { type: "comments_count", operator: ">=", value: 20 },
    },
    {
      name: "Thánh Còm Men",
      description: "Viết 100 bình luận",
      icon: "comment100.png",
      condition: { type: "comments_count", operator: ">=", value: 100 },
    },
    {
      name: "Chăm Chỉ Mỗi Ngày",
      description: "Hoạt động liên tục 30 ngày",
      icon: "longterm.png",
      condition: { type: "active_days", operator: ">=", value: 30 },
    },
  ];
  ("");
  try {
    await Badge.insertMany(badges);
    res.status(201).json({ message: "Badges added successfully" });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error adding badges", error: error.message });
  }
};

module.exports = {
  getAllBadges,
  addBadge,
  getUserBadgeInventory,
};
