const router = require("express").Router();
const { protect } = require('../middleware/auth');
const { createProduct, getProductsByShop, getProductBySlug, getProductById, updateProductById } = require("../controllers/product")
const { uploadProductImagesMiddleware } = require('../middleware/upload');

router.post("/add", protect, uploadProductImagesMiddleware, createProduct)
router.get("/shop/:shopId", protect, getProductsByShop)
router.get("/slug/:slug", protect, getProductBySlug)
router.get("/id/:id", protect, getProductById)
router.put("/id/:id", protect, uploadProductImagesMiddleware, updateProductById)

module.exports = router;