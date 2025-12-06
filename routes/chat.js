const router = require("express").Router();
const {
  getChatIdByTypeId,
  getChatById,
  createGroupChat,
  getRecentChats,
} = require("../controllers/chat");
const { protect } = require("../middleware/auth");

router.get("/recent", protect, getRecentChats);
router.get("/with", protect, getChatIdByTypeId);
router.get("/:chatId", protect, getChatById);
router.post("/group", protect, createGroupChat);

module.exports = router;