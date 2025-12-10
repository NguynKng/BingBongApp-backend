const express = require("express");
const router = express.Router();
const {
  getStats,
  getUserGenderStats,
  getUserGroupShopStats,
  getPostCommentReactionStats,
  getTopUsers,
  getTopPosts,
  getRecentActivity,
  getGroupStats,
  getShopStats,
} = require("../controllers/stats");
const { protect, isAdmin } = require("../middleware/auth");

router.get("/", getStats);
router.get("/user-gender", getUserGenderStats);
router.get("/user-group-shop", getUserGroupShopStats);
router.get("/post-comment-reaction", getPostCommentReactionStats);
router.get("/top-users", getTopUsers);
router.get("/top-posts", getTopPosts);
router.get("/recent-activity", getRecentActivity);
router.get("/groups", getGroupStats);
router.get("/shops", getShopStats);

module.exports = router;
