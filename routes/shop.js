const router = require("express").Router();
const { protect } = require("../middleware/auth");
const {
  createSampleShop,
  getShopBySlug,
  getAllShops,
  getMyShops,
  getFollowedShops,
} = require("../controllers/shop");

router.get("/", getAllShops);
router.get("/my-shops", protect, getMyShops);
router.get("/followed-shops", protect, getFollowedShops);
router.post("/create-sample-shop", createSampleShop);
router.get("/:slug", getShopBySlug);

module.exports = router;
