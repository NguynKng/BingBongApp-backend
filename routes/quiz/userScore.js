const express = require("express");
const router = express.Router();
const {
  getMyTotalScore,
  updateUserTotalScore,
  getUserLeaderboard,
} = require("../../controllers/quiz/userScore");

const { protect } = require("../../middleware/auth");

// Lấy tổng điểm người dùng hiện tại
router.get("/my-score", protect, getMyTotalScore);

// Cập nhật tổng điểm người dùng khi chơi quiz
router.post("/update", protect, updateUserTotalScore);

// Lấy bảng xếp hạng người dùng theo tổng điểm
router.get("/leaderboard", getUserLeaderboard);

module.exports = router;