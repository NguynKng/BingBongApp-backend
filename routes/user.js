const router = require('express').Router();
const { setAvatar, setCoverPhoto, getUserProfile } = require('../controllers/user');
const { protect } = require('../middleware/auth');
const { uploadAvatarMiddleware, uploadCoverPhotoMiddleware } = require('../middleware/upload');

// Set profile picture (avatar)
router.post('/avatar', protect, uploadAvatarMiddleware, setAvatar);

// Set cover photo
router.post('/cover-photo', protect, uploadCoverPhotoMiddleware, setCoverPhoto);

// Get own profile
router.get('/profile', protect, getUserProfile);

// Get specific user profile
router.get('/profile/:userId', protect, getUserProfile);

module.exports = router;
