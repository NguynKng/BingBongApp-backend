const router = require('express').Router();
const { translate_text, translateText2 } = require("../controllers/translate")

router.post("/", translateText2);
router.post("/libre", translate_text);

module.exports = router;