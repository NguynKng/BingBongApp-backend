const router = require("express").Router();
const {
  getChatIdByTypeId,
  getChatById,
  createGroupChat,
  getRecentChats,
  updateGroupChat,
  addGroupMembers,
  leaveGroupChat,
} = require("../controllers/chat");
const { protect } = require("../middleware/auth");

router.get("/recent", protect, getRecentChats);
router.get("/with", protect, getChatIdByTypeId);
router.get("/:chatId", protect, getChatById);
router.post("/group", protect, createGroupChat);
router.put("/group/:chatId", protect, updateGroupChat);
router.post("/group/:chatId/members", protect, addGroupMembers);
router.delete("/group/:chatId/leave", protect, leaveGroupChat);

module.exports = router;