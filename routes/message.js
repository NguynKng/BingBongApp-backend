const router = require('express').Router();
const { getAllChats, generateAiResponse, sendMessage, getHistoryChat, translateText } = require('../controllers/message');
const { protect } = require('../middleware/auth');
const { uploadImageMessageMiddleware } = require('../middleware/upload');

router.get('/', protect, getAllChats);
router.post('/generate-ai-response', protect, generateAiResponse);
router.post('/send-message', protect, uploadImageMessageMiddleware, sendMessage);
router.get('/history/:userChatId', protect, getHistoryChat);
router.post('/translate-text', translateText);

module.exports = router;
