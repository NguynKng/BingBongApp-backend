const router = require('express').Router();
const { setAvatar, setCoverPhoto, getUserProfile, getUserByName, sendFriendRequest, cancelFriendRequest, removeFriend, acceptFriendRequest, declineFriendRequest } = require('../controllers/user');
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

router.get("/me", protect, (req, res) => {
  console.log("✅ Người dùng xác thực thành công:", req.user);
  res.json(req.user);
});

  
module.exports = router;
