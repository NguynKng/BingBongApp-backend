const Short = require("../models/shortModel");
const CommentShort = require("../models/commentShortModel");
const { uploadToCloudinary } = require("../services/cloudinary/upload");

// Create Short
const createShort = async (req, res) => {
  try {
    const { caption, hashtags, music, privacy } = req.body;
    const userId = req.user._id;

    // Check if files exist
    if (!req.files || !req.files.video || !req.files.thumbnail) {
      return res.status(400).json({
        success: false,
        message: "Video and thumbnail are required",
      });
    }

    const videoFile = req.files.video[0];
    const thumbnailFile = req.files.thumbnail[0];

    // Upload video to Cloudinary
    const videoResult = await uploadToCloudinary(videoFile.buffer, "short");

    // Upload thumbnail to Cloudinary
    const thumbnailResult = await uploadToCloudinary(
      thumbnailFile.buffer,
      "short_thumbnails"
    );

    // Parse hashtags if it's a string
    let parsedHashtags = [];
    if (hashtags) {
      parsedHashtags =
        typeof hashtags === "string" ? JSON.parse(hashtags) : hashtags;
    }

    // Parse music if it's a string
    let parsedMusic = null;
    if (music) {
      parsedMusic = typeof music === "string" ? JSON.parse(music) : music;
    }

    const newShort = new Short({
      user: userId,
      videoUrl: videoResult.public_id,
      thumbnailUrl: thumbnailResult.public_id,
      caption,
      hashtags: parsedHashtags,
      music: parsedMusic,
      privacy: privacy || "public",
    });

    await newShort.save();
    await newShort.populate("user", "fullName avatar slug");

    res.status(201).json({
      success: true,
      data: newShort,
    });
  } catch (error) {
    console.error("Create short error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Delete Short
const deleteShort = async (req, res) => {
  try {
    const { shortId } = req.params;
    const userId = req.user._id;

    const short = await Short.findById(shortId);

    if (!short) {
      return res.status(404).json({
        success: false,
        message: "Short not found",
      });
    }

    // Check ownership
    if (short.user.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to delete this short",
      });
    }

    short.isActive = false;
    await short.save();
    // Or to permanently delete:

    res.status(200).json({
      success: true,
      message: "Short deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get My Shorts
const getMyShorts = async (req, res) => {
  try {
    const userId = req.user._id;
    const { page = 1, limit = 10, privacy } = req.query;

    // Build query
    const query = { user: userId, isActive: true };
    
    // If privacy is specified, filter by it
    if (privacy) {
      query.privacy = privacy;
    }

    const shorts = await Short.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate("user", "fullName avatar slug");

    const total = await Short.countDocuments(query);

    res.status(200).json({
      success: true,
      data: shorts,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getShortById = async (req, res) => {
  try {
    const { shortId } = req.params;
    const short = await Short.findById(shortId).populate(
      "user",
      "fullName avatar slug"
    );

    if (!short || !short.isActive) {
      return res.status(404).json({
        success: false,
        message: "Short not found",
      });
    }
    res.status(200).json({
      success: true,
      data: short,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get Shorts Feed (Algorithm)
const getShortsFeed = async (req, res) => {
  try {
    const userId = req.user?._id;
    const { page = 1, limit = 10 } = req.query;

    // Build query
    const query = {
      isActive: true,
      privacy: "public",
    };

    // Exclude already viewed shorts if user is logged in
    if (userId) {
      const viewedShorts = await Short.find({
        views: { $exists: true },
        // You might want to track user views separately
      }).select("_id");
    }

    // Algorithm: Sort by engagement score
    const shorts = await Short.aggregate([
      { $match: query },
      {
        $addFields: {
          engagementScore: {
            $add: [
              { $multiply: [{ $size: "$likes" }, 2] }, // Likes weight: 2
              { $multiply: ["$commentsCount", 3] }, // Comments weight: 3
              { $multiply: ["$views", 0.1] }, // Views weight: 0.1
            ],
          },
          randomScore: { $rand: {} }, // Add randomness
        },
      },
      {
        $sort: {
          engagementScore: -1,
          randomScore: -1,
          createdAt: -1,
        },
      },
      { $skip: (page - 1) * limit },
      { $limit: parseInt(limit) },
      {
        $lookup: {
          from: "users",
          localField: "user",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },
      {
        $project: {
          "user.password": 0,
          "user.email": 0,
          engagementScore: 0,
          randomScore: 0,
        },
      },
    ]);

    const total = await Short.countDocuments(query);

    res.status(200).json({
      success: true,
      data: shorts,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const toggleLikeShort = async (req, res) => {
  try {
    const { shortId } = req.params;
    const userId = req.user._id;

    const short = await Short.findById(shortId);

    if (!short) {
      return res.status(404).json({
        success: false,
        message: "Short not found",
      });
    }

    const likeIndex = short.likes.indexOf(userId);

    if (likeIndex > -1) {
      // Unlike
      short.likes.splice(likeIndex, 1);
    } else {
      // Like
      short.likes.push(userId);
    }

    await short.save();

    res.status(200).json({
      success: true,
      data: {
        isLiked: likeIndex === -1,
        likesCount: short.likes.length,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Add Comment to Short
const addComment = async (req, res) => {
  try {
    const { shortId } = req.params;
    const { content } = req.body;
    const userId = req.user._id;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: "Comment content is required",
      });
    }

    const short = await Short.findById(shortId);

    if (!short) {
      return res.status(404).json({
        success: false,
        message: "Short not found",
      });
    }

    const comment = new CommentShort({
      user: userId,
      short: shortId,
      content: content.trim(),
    });

    await comment.save();
    await comment.populate("user", "fullName avatar slug");

    // Increment comments count
    short.commentsCount += 1;
    await short.save();

    res.status(201).json({
      success: true,
      data: comment,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get Comments for Short
const getComments = async (req, res) => {
  try {
    const { shortId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const comments = await CommentShort.find({
      short: shortId,
      isDeleted: false,
    })
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate("user", "fullName avatar slug")
      .populate("replies.user", "fullName avatar slug");

    const total = await CommentShort.countDocuments({
      short: shortId,
      isDeleted: false,
    });

    res.status(200).json({
      success: true,
      data: comments,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Delete Comment
const deleteComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const userId = req.user._id;

    const comment = await CommentShort.findById(commentId);

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: "Comment not found",
      });
    }

    // Check ownership
    if (comment.user.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to delete this comment",
      });
    }

    comment.isDeleted = true;
    await comment.save();

    // Decrement comments count
    await Short.findByIdAndUpdate(comment.short, {
      $inc: { commentsCount: -1 },
    });

    res.status(200).json({
      success: true,
      message: "Comment deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Toggle Like Comment
const toggleLikeComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const userId = req.user._id;

    const comment = await CommentShort.findById(commentId);

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: "Comment not found",
      });
    }

    const likeIndex = comment.likes.indexOf(userId);

    if (likeIndex > -1) {
      // Unlike
      comment.likes.splice(likeIndex, 1);
    } else {
      // Like
      comment.likes.push(userId);
    }

    await comment.save();

    res.status(200).json({
      success: true,
      data: comment.likes
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Add Reply to Comment
const addReply = async (req, res) => {
  try {
    const { commentId } = req.params;
    const { content } = req.body;
    const userId = req.user._id;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: "Reply content is required",
      });
    }

    const comment = await CommentShort.findById(commentId);

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: "Comment not found",
      });
    }

    comment.replies.push({
      user: userId,
      content: content.trim(),
    });

    await comment.save();
    await comment.populate("replies.user", "fullName avatar slug");

    res.status(201).json({
      success: true,
      data: comment.replies[comment.replies.length - 1],
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Increment Views
const incrementViews = async (req, res) => {
  try {
    const { shortId } = req.params;

    await Short.findByIdAndUpdate(shortId, {
      $inc: { views: 1 },
    });

    res.status(200).json({
      success: true,
      message: "View counted",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  createShort,
  deleteShort,
  getMyShorts,
  getShortById,
  getShortsFeed,
  toggleLikeShort,
  addComment,
  getComments,
  deleteComment,
  toggleLikeComment,
  addReply,
  incrementViews,
};
