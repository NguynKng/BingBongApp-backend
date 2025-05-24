const router = require('express').Router();
const { 
    createPost, 
    getPosts, 
    getPostById, 
    getPostsByUser,
    getFeed,
    updatePost, 
    deletePost, 
    deletePostImage,
    addComment,
    addReply,
    getCommentsByPost
} = require('../controllers/post');
const { protect } = require('../middleware/auth');
const { uploadOptionalImagesMiddleware } = require('../middleware/upload');
const { reactToPost } = require("../controllers/reaction")

// Create a new post (with or without images)
router.post('/', protect, uploadOptionalImagesMiddleware, createPost);

// Get user's personalized feed
router.get('/feed', protect, getFeed);

// Get all posts (with pagination)
router.get('/', protect, getPosts);

// Get posts by specific user
router.get('/user/:userId', protect, getPostsByUser);

// Get a specific post
router.get('/:postId', protect, getPostById);

// Update post (content, caption)
router.put('/:postId', protect, updatePost);

// Delete post
router.delete('/:postId', protect, deletePost);

// Delete a specific image from a post
router.delete('/:postId/images/:imageIndex', protect, deletePostImage);

// Comment routes
router.post('/:postId/comments', protect, addComment);
router.post('/comments/:commentId/replies', protect, addReply);
router.get('/:postId/comments', protect, getCommentsByPost);
router.post('/react', protect, reactToPost)

module.exports = router;
