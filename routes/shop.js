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
} = require("../controllers/shop");

router.get("/", getAllShops);
router.get("/my-shops", protect, getMyShops);
router.get("/followed-shops", protect, getFollowedShops);
router.post("/create-sample-shop", createSampleShop);
router.post("/create-shop", protect, createShop);
router.get("/:slug", getShopBySlug);

router.post("/category/:shopId", protect, addShopCategory);
router.put("/category/:shopId", protect, updateShopCategory);
router.put("/info/:shopId", protect, updateShopInfo);

module.exports = router;
