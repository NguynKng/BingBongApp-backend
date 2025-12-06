const router = require("express").Router();
const { createOrder, getUserOrders, getShopOrders, getOrderById, updateOrderStatus, cancelOrder } = require("../controllers/order");
const { protect } = require("../middleware/auth");

router.post("/create", protect, createOrder);
router.get("/user-orders", protect, getUserOrders);
router.get("/shop-orders/:shopId", protect, getShopOrders);
router.get("/detail/:orderId", protect, getOrderById);
router.post("/shop-update-status", protect, updateOrderStatus);
router.post("/user-cancel", protect, cancelOrder);

module.exports = router;
