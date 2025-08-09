const { getAllBadges, addBadge, getUserBadgeInventory } = require("../controllers/badge");
const router = require("express").Router();

router.get("/", getAllBadges);
router.post("/add", addBadge);
router.get("/user-inventory", getUserBadgeInventory); // Lấy kho danh hiệu của người dùng

module.exports = router