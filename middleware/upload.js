const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure directory exists before storing files
const ensureDirectoryExists = (directory) => {
    if (!fs.existsSync(directory)) {
        fs.mkdirSync(directory, { recursive: true });
    }
};

// Configure storage for avatar uploads
const avatarStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        const userId = req.user._id;
        const uploadPath = path.join(__dirname, '..', 'public', 'uploads', 'user', userId.toString(), 'avatar');
        
        // Create directory if it doesn't exist
        ensureDirectoryExists(uploadPath);
        
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        // Create unique filename using timestamp + original extension
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, 'avatar-' + uniqueSuffix + ext);
    }
});

// Configure storage for cover photo uploads
const coverPhotoStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        const userId = req.user._id;
        const uploadPath = path.join(__dirname, '..', 'public', 'uploads', 'user', userId.toString(), 'cover_photo');
        
        // Create directory if it doesn't exist
        ensureDirectoryExists(uploadPath);
        
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        // Create unique filename using timestamp + original extension
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, 'cover-' + uniqueSuffix + ext);
    }
});

// Configure storage for creating a post with images
const createPostStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        const userId = req.user._id;
        // Store files in a temporary directory first
        const uploadPath = path.join(__dirname, '..', 'public', 'uploads', 'temp', userId.toString());
        
        // Create directory if it doesn't exist
        ensureDirectoryExists(uploadPath);
        
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        // Create unique filename using timestamp + original extension
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, 'post-image-' + uniqueSuffix + ext);
    }
});

// File filtering
const fileFilter = (req, file, cb) => {
    // Accept images only
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
        return cb(new Error('Only image files are allowed!'), false);
    }
    cb(null, true);
};

// Create multer instances
const uploadAvatar = multer({ 
    storage: avatarStorage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB
    },
    fileFilter: fileFilter
}).single('avatar'); // 'avatar' is the field name in the form

const uploadCoverPhoto = multer({ 
    storage: coverPhotoStorage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB
    },
    fileFilter: fileFilter
}).single('coverPhoto'); // 'coverPhoto' is the field name in the form

// Create multer instance for optional post images
const uploadOptionalImages = multer({
    storage: createPostStorage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB
    },
    fileFilter: fileFilter
}).array('images', 10); // Allow up to 10 images, field name is 'postImages'

// Middleware handler for avatar upload
const uploadAvatarMiddleware = (req, res, next) => {
    uploadAvatar(req, res, function (err) {
        if (err instanceof multer.MulterError) {
            // A Multer error occurred when uploading
            return res.status(400).json({ success: false, message: `Multer error: ${err.message}` });
        } else if (err) {
            // An unknown error occurred
            return res.status(500).json({ success: false, message: err.message });
        }
        // Everything went fine
        next();
    });
};

// Middleware handler for cover photo upload
const uploadCoverPhotoMiddleware = (req, res, next) => {
    uploadCoverPhoto(req, res, function (err) {
        if (err instanceof multer.MulterError) {
            // A Multer error occurred when uploading
            return res.status(400).json({ success: false, message: `Multer error: ${err.message}` });
        } else if (err) {
            // An unknown error occurred
            return res.status(500).json({ success: false, message: err.message });
        }
        // Everything went fine
        next();
    });
};

// Middleware handler for optional post images
const uploadOptionalImagesMiddleware = (req, res, next) => {
    // Check if the request has files first
    if (!req.is('multipart/form-data')) {
        // No files in request, just proceed
        return next();
    }
    
    uploadOptionalImages(req, res, function (err) {
        if (err instanceof multer.MulterError) {
            // A Multer error occurred when uploading
            return res.status(400).json({ success: false, message: `Multer error: ${err.message}` });
        } else if (err) {
            // An unknown error occurred
            return res.status(500).json({ success: false, message: err.message });
        }
        // Everything went fine
        next();
    });
};

module.exports = { 
    uploadAvatarMiddleware, 
    uploadCoverPhotoMiddleware,
    uploadOptionalImagesMiddleware,
    ensureDirectoryExists
};
