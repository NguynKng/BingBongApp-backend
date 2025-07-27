const router = require("express").Router();
const { signup, loginUser, logout, authCheck, verifyCode, forgotPassword, resetPassword } = require("../controllers/auth");
const { protect } = require("../middleware/auth");

router.post("/signup", signup);
router.post("/login", loginUser);
router.post("/logout", logout);
router.get("/authCheck", protect, authCheck);
router.post("/forgot-password", forgotPassword);
router.post("/verify-code", verifyCode);
router.post("/reset-password", resetPassword);

module.exports = router;