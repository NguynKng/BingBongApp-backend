const router = require("express").Router();
const { createSampleShop, getShopBySlug } = require("../controllers/shop")

router.post("/create-sample-shop", createSampleShop)
router.get("/:slug", getShopBySlug)

module.exports = router;