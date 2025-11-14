const router = require("express").Router();
const {
  addToCart,
  getUserCart,
  removeFromCart,
  clearCart,
  minusFromCart,
} = require("../controllers/cart");
const { protect } = require("../middleware/auth");

router.post("/add", protect, addToCart);
router.put("/minus", protect, minusFromCart);
router.get("/", protect, getUserCart);
router.delete("/remove/:productId/:variantId", protect, removeFromCart);
router.delete("/clear", protect, clearCart);

module.exports = router;
