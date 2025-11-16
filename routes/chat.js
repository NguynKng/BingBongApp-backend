const router = require("express").Router();
const {
  getChatIdByUserId,
  getChatById,
  createGroupChat,
  getRecentChats,
} = require("../controllers/chat");
const { protect } = require("../middleware/auth");

router.get("/recent", protect, getRecentChats);
router.get("/:chatId", protect, getChatById);
router.get("/with/:userId", protect, getChatIdByUserId);
router.post("/group", protect, createGroupChat);

module.exports = router;