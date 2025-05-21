const router = require("express").Router();
const { sseHandler } = require("../controllers/sse");
const { protect } = require("../middleware/auth");

router.get("/:userId", protect, sseHandler);

module.exports = router;