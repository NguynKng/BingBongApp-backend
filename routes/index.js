const router = require("express").Router()

router.use("/auth", require('./auth'))
router.use("/user", require('./user'))
router.use("/posts", require('./post'))
router.use('/quiz', require ('./quiz'));
router.use("/messages", require('./message'))
router.use("/quizScore", require('./quiz/quizScore'))
router.use("/notifications", require('./notification'))
router.use("/crawlblog", require('./blog'))
router.use("/badges", require("./badge"))
router.use("/translate", require("./translate"))
router.use("/stats", require("./stats"))
router.use("/tmdb", require("./tmdb"))
router.use("/shop", require("./shop"))

module.exports = router