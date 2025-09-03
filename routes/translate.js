const router = require('express').Router();
const { translate_text, addRoleField } = require("../controllers/translate")

router.post("/", translate_text);

module.exports = router;