const router = require("express").Router();
const {
  addToCart,
  getUserCart,
  removeFromCart,
  clearCart,
} = require("../controllers/cart");
const { protect } = require("../middleware/auth");

router.post("/add", protect, addToCart);
router.get("/", protect, getUserCart);
router.delete("/remove/:productId", protect, removeFromCart);
router.delete("/clear", protect, clearCart);

module.exports = router;
