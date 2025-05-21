const express = require("express");
const router = express.Router();
const { getLeaderboard, getMyScore, addOrUpdateScore } = require("../controllers/rank");
const { protect, optionalAuth } = require("../middleware/auth");

// ✅ Lấy bảng xếp hạng tổng điểm người dùng
router.get("/leaderboard", protect, getLeaderboard);

// ✅ Lấy tổng điểm người dùng hiện tại (phải đăng nhập)
router.get("/mine", protect, getMyScore);

// ✅ Gửi điểm người dùng sau khi chơi quiz (phải đăng nhập)
router.post("/score", protect, addOrUpdateScore);

module.exports = router;
