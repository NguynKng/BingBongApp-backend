const express = require("express");
const router = express.Router();
const {
  updateQuizScore,
  getQuizScore,
  getQuizLeaderboard,
  getLeaderboard
} = require("../../controllers/quiz/quizScore");
const { protect } = require("../../middleware/auth");

// Ghi điểm cho quiz (POST hoặc PUT tùy bạn, thường là POST)
router.post("/submit", protect, updateQuizScore);

router.get("/leaderboard", getLeaderboard)
// Lấy điểm và thứ hạng của người dùng cho quiz
router.get("/score/:quizId", protect, getQuizScore);

// Lấy bảng xếp hạng của quiz
router.get("/leaderboard/:quizId", protect, getQuizLeaderboard);

module.exports = router;