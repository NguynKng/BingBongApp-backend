const router = require("express").Router();
const { getNotification, markAsAllRead } = require("../controllers/notification");
const { protect } = require("../middleware/auth");

router.get("/", protect, getNotification);
router.put("/mark-as-all-read", protect, markAsAllRead)

module.exports = router;