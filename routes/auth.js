const router = require("express").Router();
const { signup, loginUser, logout, authCheck } = require("../controllers/auth");
const { protect } = require("../middleware/auth");

router.post("/signup", signup);
router.post("/login", loginUser);
router.post("/logout", logout);
router.get("/authCheck", protect, authCheck);

module.exports = router;