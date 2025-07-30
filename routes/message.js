const router = require('express').Router();
const { getAllChats, generateAiResponse } = require('../controllers/message');
const { protect } = require('../middleware/auth');

router.get('/', protect, getAllChats);
router.post('/generate-ai-response', protect, generateAiResponse);

module.exports = router;
