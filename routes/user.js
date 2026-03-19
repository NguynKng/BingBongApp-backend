const router = require('express').Router();
const { setAvatar, setCoverPhoto, getUserProfile, getUserByName, sendFriendRequest, cancelFriendRequest, removeFriend, acceptFriendRequest, declineFriendRequest, getAllUsers, getFriendSuggestions, updateUserInfo, getUserProfileBySlug, getUserStats, addUserRingtone,
  deleteUserRingtone,
  setActiveRingtone, renameUserRingtone, renameUserProfile } = require('../controllers/user');
const { protect, isAdmin } = require('../middleware/auth');
const { uploadAvatarMiddleware, uploadCoverPhotoMiddleware, uploadRingtoneMiddleware } = require('../middleware/upload');

// Set profile picture (avatar)
router.get('/get-all', protect, isAdmin, getAllUsers);
router.post('/avatar', protect, uploadAvatarMiddleware, setAvatar);
router.post('/update-info/:id', protect, updateUserInfo);
// Set cover photo
router.post('/cover-photo', protect, uploadCoverPhotoMiddleware, setCoverPhoto);

// Get own profile
router.get('/profile', protect, getUserProfile);
router.put('/rename-profile', protect, renameUserProfile);
router.get('/stats', protect, getUserStats);

router.get('/profile/slug/:slug', getUserProfileBySlug);
// Get specific user profile
router.get('/profile/:userId', protect, getUserProfile);

router.get('/search', protect, getUserByName);

// Gửi lời mời kết bạn
router.post("/friend-request/:userId", protect, sendFriendRequest);

// Hủy lời mời
router.delete("/friend-request/:userId", protect, cancelFriendRequest);

// Chấp nhận lời mời
router.post("/friend-request/accept/:userId", protect, acceptFriendRequest);
// Chấp nhận lời mời
router.delete("/friend-request/decline/:userId", protect, declineFriendRequest);

// Hủy kết bạn
router.delete("/friend/:userId", protect, removeFriend);

router.get('/suggestions', protect, getFriendSuggestions);
router.post('/ringtones', protect, uploadRingtoneMiddleware, addUserRingtone);
router.delete('/ringtones/:ringtoneId', protect, deleteUserRingtone);
router.put('/ringtones/active/:ringtoneId', protect, setActiveRingtone);
router.put('/ringtones/rename/:ringtoneId', protect, renameUserRingtone);

module.exports = router;
