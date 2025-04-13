const router = require('express').Router();
const { 
    createPost, 
    getPosts, 
    getPost, 
    getPostsByUser,
    getFeed,
    updatePost, 
    deletePost, 
    deletePostImage 
} = require('../controllers/post');
const { protect } = require('../middleware/auth');
const { uploadOptionalImagesMiddleware } = require('../middleware/upload');

// Create a new post (with or without images)
router.post('/', protect, uploadOptionalImagesMiddleware, createPost);

// Get user's personalized feed
router.get('/feed', protect, getFeed);

// Get all posts (with pagination)
router.get('/', getPosts);

// Get posts by specific user
router.get('/user/:userId', getPostsByUser);

// Get a specific post
router.get('/:postId', getPost);

// Update post (content, caption)
router.put('/:postId', protect, updatePost);

// Delete post
router.delete('/:postId', protect, deletePost);

// Delete a specific image from a post
router.delete('/:postId/images/:imageIndex', protect, deletePostImage);

module.exports = router;
