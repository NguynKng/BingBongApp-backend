const { getAllBadges, addBadge, getUserBadgeInventory, equipBadge, unequipBadge, claimBadge } = require("../controllers/badge");
const { protect } = require("../middleware/auth");
const router = require("express").Router();

router.get("/", getAllBadges);
router.post("/add", addBadge);
router.get("/user-inventory", protect, getUserBadgeInventory);
router.post("/equip", protect, equipBadge);
router.post("/unequip", protect, unequipBadge);
router.post("/claim", protect, claimBadge);

module.exports = router