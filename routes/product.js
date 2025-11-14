const router = require("express").Router();
const { protect } = require("../middleware/auth");
const {
  createProduct,
  getProductsByShop,
  getProductBySlug,
  getProductById,
  updateProductById,
  rateProduct,
} = require("../controllers/product");
const { uploadProductImagesMiddleware } = require("../middleware/upload");

router.post("/add", protect, uploadProductImagesMiddleware, createProduct);
router.post("/rating/:productId", protect, rateProduct);
router.get("/shop/:shopId", getProductsByShop);
router.get("/slug/:slug/:shopId", protect, getProductBySlug);
router.get("/id/:id", protect, getProductById);
router.put(
  "/id/:id",
  protect,
  uploadProductImagesMiddleware,
  updateProductById
);

module.exports = router;
