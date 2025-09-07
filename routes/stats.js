const express = require("express");
const router = express.Router();
const { getStats, getUserGenderStats, getUserAndPostsStats } = require("../controllers/stats");
const { protect, isAdmin } = require("../middleware/auth");

router.get("/", protect, isAdmin, getStats);
router.get("/user-gender", protect, isAdmin, getUserGenderStats);
router.get("/user-posts", getUserAndPostsStats);


module.exports = router;
