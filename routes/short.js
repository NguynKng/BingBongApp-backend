const express = require("express");
const router = express.Router();
const {
  createShort,
  deleteShort,
  getMyShorts,
  getShortsFeed,
  toggleLikeShort,
  addComment,
  getComments,
  deleteComment,
  toggleLikeComment,
  addReply,
  incrementViews,
    getShortById,
} = require("../controllers/short");
const { protect } = require("../middleware/auth");
const { uploadShortVideoMiddleware } = require("../middleware/upload");

// Short routes
router.post("/", protect, uploadShortVideoMiddleware, createShort);
router.delete("/:shortId", protect, deleteShort);
router.get("/my-shorts", protect, getMyShorts);
router.get("/feed", getShortsFeed);
router.get("/:shortId", protect, getShortById);

// Like short
router.post("/:shortId/like", protect, toggleLikeShort);

// Views
router.post("/:shortId/view", incrementViews);

// Comment routes
router.post("/:shortId/comments", protect, addComment);
router.get("/:shortId/comments", getComments);
router.delete("/comments/:commentId", protect, deleteComment);

// Like comment
router.post("/comments/:commentId/like", protect, toggleLikeComment);

// Reply to comment
router.post("/comments/:commentId/reply", protect, addReply);

module.exports = router;
