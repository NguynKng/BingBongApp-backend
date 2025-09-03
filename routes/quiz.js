const express = require("express");
const {
  getAllQuizzes,
  getQuizById,
  createQuiz,
  deleteQuiz,
} = require("../controllers/quiz");
const { protect } = require("../middleware/auth");

const router = express.Router();

// Không cần đăng nhập vẫn xem được
router.get("/", protect, getAllQuizzes);
router.get("/:id", protect, getQuizById);

// Phải đăng nhập mới được tạo và xóa quiz
router.post("/", protect, createQuiz);
router.delete("/:id", protect, deleteQuiz);

module.exports = router;
