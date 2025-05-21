const { crawlBlog } = require("../utils/crawlblog");
const router = require("express").Router();
const { protect } = require("../middleware/auth");

router.get("/", crawlBlog)

module.exports = router