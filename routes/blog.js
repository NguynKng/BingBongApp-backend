const { crawlBlog, getTechNews } = require("../utils/crawlblog");
const router = require("express").Router();
const { protect } = require("../middleware/auth");

//router.get("/", crawlBlog)
router.get("/tech-news", getTechNews)


module.exports = router