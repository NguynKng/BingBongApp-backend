const router = require("express").Router()

router.use("/auth", require('./auth'))
router.use("/user", require('./user'))
router.use("/posts", require('./post'))

module.exports = router