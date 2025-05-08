const express = require("express");
const router = express.Router();
const {
  updateQuizScore,
  getQuizScore,
  getQuizLeaderboard,
} = require("../../controllers/quiz/quizScore");
const { protect } = require("../../middleware/auth");

// Ghi điểm cho quiz (POST hoặc PUT tùy bạn, thường là POST)
router.post("/submit", protect, updateQuizScore);

// Lấy điểm và thứ hạng của người dùng cho quiz
router.get("/:quizId/score", protect, getQuizScore);

// Lấy bảng xếp hạng của quiz
router.get("/:quizId/leaderboard", protect, getQuizLeaderboard);

module.exports = router;