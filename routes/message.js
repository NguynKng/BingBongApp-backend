const router = require('express').Router();
const { getAllChats, generateAiResponse, sendMessage } = require('../controllers/message');
const { protect } = require('../middleware/auth');
const { uploadOptionalImagesMiddleware } = require('../middleware/upload');

router.get('/', protect, getAllChats);
router.post('/generate-ai-response', protect, generateAiResponse);
router.post('/send-message', protect, uploadOptionalImagesMiddleware, sendMessage);

module.exports = router;
