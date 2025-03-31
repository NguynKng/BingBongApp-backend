const router = require("express").Router()
const { signup, loginUser, logout, authCheck } = require("../controllers/auth")

router.post("/signup", signup)
router.post("/login", loginUser)
router.post("/logout", logout)
router.get("/authCheck", authCheck)

module.exports = router