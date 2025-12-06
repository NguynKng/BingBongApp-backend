const router = require("express").Router();
const { protect } = require("../middleware/auth");
const {
  createSampleShop,
  createShop,
  getShopBySlug,
  getAllShops,
  getMyShops,
  getFollowedShops,
  addShopCategory,
  updateShopCategory,
  updateShopInfo,
  getShopStats,
  getShopIncome,
  getShopCategoryDistribution,
  getShopTopProducts,
  getShopRecentOrders,
  followShop,
  unfollowShop,
  getShopProductRatings,
  getShopTopCustomers,
  getShopNewProduct,
  getFollowStats,
} = require("../controllers/shop");

router.get("/", getAllShops);
router.get("/my-shops", protect, getMyShops);
router.get("/stats/:shopId", getShopStats);
router.get("/income/:shopId", getShopIncome);
router.get("/ratings/:shopId", getShopProductRatings);
router.get("/category-distribution/:shopId", getShopCategoryDistribution);
router.get("/top-products/:shopId", getShopTopProducts);
router.get("/recent-orders/:shopId", getShopRecentOrders);
router.get("/top-customers/:shopId", getShopTopCustomers);
router.get("/new-products/:shopId", getShopNewProduct);
router.get("/follow-stats/:shopId", getFollowStats);
router.get("/followed-shops", protect, getFollowedShops);
router.post("/follow/:shopId", protect, followShop);
router.post("/unfollow/:shopId", protect, unfollowShop);
router.post("/create-sample-shop", createSampleShop);
router.post("/create-shop", protect, createShop);
router.get("/:slug", getShopBySlug);

router.post("/category/:shopId", protect, addShopCategory);
router.put("/category/:shopId", protect, updateShopCategory);
router.put("/info/:shopId", protect, updateShopInfo);

module.exports = router;
