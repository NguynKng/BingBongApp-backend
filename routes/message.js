const router = require('express').Router();
const { getAllChats } = require('../controllers/message');
const { protect } = require('../middleware/auth');

router.get('/', protect, getAllChats);

module.exports = router;
