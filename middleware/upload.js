// middleware/upload.js
const multer = require("multer");

const ensureDirectoryExists = (directory) => {
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
  }
};

// memoryStorage: Không lưu file vào disk
const storage = multer.memoryStorage();

const imageFilter = (req, file, cb) => {
  if (!file.originalname.match(/\.(jpg|jpeg|png|gif|webp|jfif)$/)) {
    return cb(new Error("Only image files allowed!"), false);
  }
  cb(null, true);
};

const audioFilter = (req, file, cb) => {
  if (!file.originalname.match(/\.(mp3|wav|ogg|m4a)$/)) {
    return cb(new Error("Only audio files allowed!"), false);
  }
  cb(null, true);
};

const videoFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('video/')) {
    cb(null, true);
  } else {
    cb(new Error("Only video files allowed!"), false);
  }
};

const shortVideoFilter = (req, file, cb) => {
  // Check if it's video field
  if (file.fieldname === 'video') {
    if (file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error("Only video files allowed for video field!"), false);
    }
  }
  // Check if it's thumbnail field
  else if (file.fieldname === 'thumbnail') {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error("Only image files allowed for thumbnail field!"), false);
    }
  }
  else {
    cb(new Error("Invalid field name!"), false);
  }
};

// ---- UPLOAD RULES -----
const uploadAvatar = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: imageFilter,
}).single("avatar");

const uploadCoverPhoto = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: imageFilter,
}).single("coverPhoto");

const uploadPostImages = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: imageFilter,
}).array("images", 10);

const uploadChatImages = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: imageFilter,
}).array("images", 10);

const uploadProductImages = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: imageFilter,
}).fields([
  { name: "mainImages", maxCount: 10 },
  { name: "variantImages", maxCount: 50 },
]);

const uploadRingtone = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: audioFilter,
}).single("ringtone");

const uploadVideo = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
  fileFilter: videoFilter,
}).single("video");

const uploadShortVideo = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB for short videos
  fileFilter: shortVideoFilter,
}).fields([
  { name: "video", maxCount: 1 },
  { name: "thumbnail", maxCount: 1 },
]);

// ---- WRAPPER -----
const handleUpload = (uploadFn) => (req, res, next) => {
  uploadFn(req, res, function (err) {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ success: false, message: err.message });
    } else if (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
    next();
  });
};

module.exports = {
  uploadAvatarMiddleware: handleUpload(uploadAvatar),
  uploadCoverPhotoMiddleware: handleUpload(uploadCoverPhoto),
  uploadOptionalPostImagesMiddleware: handleUpload(uploadPostImages),
  uploadChatImagesMiddleware: handleUpload(uploadChatImages),
  uploadProductImagesMiddleware: handleUpload(uploadProductImages),
  uploadRingtoneMiddleware: handleUpload(uploadRingtone),
  uploadVideoMiddleware: handleUpload(uploadVideo),
  uploadShortVideoMiddleware: handleUpload(uploadShortVideo),
  ensureDirectoryExists,
};