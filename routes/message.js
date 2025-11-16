const router = require('express').Router();
const { generateAiResponse, sendMessage, getHistoryChat, translateText } = require('../controllers/message');
const { protect } = require('../middleware/auth');
const { uploadImageMessageMiddleware } = require('../middleware/upload');

router.post('/generate-ai-response',  generateAiResponse);
router.post('/send-message', protect, uploadImageMessageMiddleware, sendMessage);
router.get('/history/:chatId', protect, getHistoryChat);
router.post('/translate-text', translateText);

module.exports = router;
