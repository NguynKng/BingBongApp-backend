const postModel = require("../models/postModel");
const commentModel = require("../models/commentModel"); // Add this import for the Comment model
const fs = require("fs");
const path = require("path");
const { createAndSendNotificationForFriend, sendNotificationToUser } = require("./notification")

// Create a new post (with optional images)
const createPost = async (req, res) => {
  try {
    const { content } = req.body;
    const author = req.user._id;

    if (!content) {
      return res
        .status(400)
        .json({ success: false, message: "Hãy thêm nội dung cho bài" });
    }

    // Create a new post first
    const newPost = new postModel({
      author,
      content,
      media: [], // Will be populated if images are uploaded
    });

    // Save the post to get the ID
    await newPost.save();

    // Process uploaded files if there are any
    if (req.files && req.files.length > 0) {
      try {
        const postId = newPost._id;
        const userId = req.user._id;

        // Create directory for post images with postId
        const uploadDir = path.join(
          __dirname,
          "..",
          "public",
          "uploads",
          "user",
          userId.toString(),
          "post",
          postId.toString()
        );
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }

        // Move files from temp directory to final location
        const mediaPaths = [];

        for (const file of req.files) {
          const tempPath = file.path;
          const fileName = path.basename(tempPath);
          const targetPath = path.join(uploadDir, fileName);

          // Move the file
          if (fs.existsSync(tempPath)) {
            // Create the target directory if it doesn't exist
            ensureDirectoryExists(path.dirname(targetPath));

            // Copy the file to the new location
            fs.copyFileSync(tempPath, targetPath);

            // Delete the original file
            fs.unlinkSync(tempPath);

            // Add the path to our array
            mediaPaths.push(
              `/uploads/user/${userId}/post/${postId}/${fileName}`
            );
          }
        }

        // Add media paths to the post
        newPost.media = mediaPaths;
        await newPost.save();
      } catch (error) {
        console.error("Error processing uploaded files:", error);
        // If there's an error with the files, we'll continue anyway
        // The post is created, but without images
      }
    }
    const populatedPost = await postModel
      .findById(newPost._id)
      .populate("author", "fullName avatar");

      if(populatedPost) {
        await createAndSendNotificationForFriend(author, "new_post", populatedPost._id)
      }

    return res.status(201).json({
      success: true,
      message: "Đăng bài thành công",
      post: populatedPost,
    });
  } catch (error) {
    console.error("Create post error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Something went wrong" });
  }
};

// Helper function to ensure directory exists
const ensureDirectoryExists = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

// Get all posts (with pagination)
const getPosts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Get posts sorted by creation date (newest first)
    const posts = await postModel
      .find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("author", "fullName avatar")
      .populate({
        path: "comments",
        populate: {
          path: "user",
          select: "fullName avatar",
        },
        options: { sort: { createdAt: -1 }, limit: 5 },
      })
      .populate({
        path: "reactions",
        populate: {
          path: "user",
          select: "fullName avatar",
        },
      });

    // Get total count for pagination
    const total = await postModel.countDocuments();

    return res.status(200).json({
      success: true,
      posts,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get posts error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Something went wrong" });
  }
};

// Get posts by specific user
const getPostsByUser = async (req, res) => {
  try {
    const userId = req.params.userId;

    // Get posts by this user sorted by creation date (newest first)
    const posts = await postModel
      .find({ author: userId })
      .sort({ createdAt: -1 })
      .populate("author", "fullName avatar")
      .populate({
        path: "comments",
        populate: {
          path: "user",
          select: "fullName avatar",
        },
        options: { sort: { createdAt: -1 } },
      })
      .populate({
        path: "reactions",
        populate: {
          path: "user",
          select: "fullName avatar",
        },
      });


    return res.status(200).json({
      success: true,
      posts
    });
  } catch (error) {
    console.error("Get posts by user error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Something went wrong" });
  }
};

// Get a specific post by ID
const getPostById = async (req, res) => {
  try {
    const postId = req.params.postId;

    const post = await postModel
      .findById(postId)
      .populate("author", "fullName avatar")
      .populate({
        path: "comments",
        populate: {
          path: "user",
          select: "fullName avatar",
        },
        options: { sort: { createdAt: -1 } },
      })
      .populate({
        path: "reactions",
        populate: {
          path: "user",
          select: "fullName avatar",
        },
      });

    if (!post) {
      return res
        .status(404)
        .json({ success: false, message: "Post not found" });
    }

    return res.status(200).json({
      success: true,
      post,
    });
  } catch (error) {
    console.error("Get post error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Something went wrong" });
  }
};

// Update post content or caption
const updatePost = async (req, res) => {
  try {
    const postId = req.params.postId;
    const userId = req.user._id;
    const { content, caption } = req.body;

    // Check if post exists and belongs to the user
    const post = await postModel.findById(postId);

    if (!post) {
      return res
        .status(404)
        .json({ success: false, message: "Post not found" });
    }

    if (post.author.toString() !== userId.toString()) {
      return res
        .status(403)
        .json({
          success: false,
          message: "You are not authorized to update this post",
        });
    }

    // Update fields if provided
    if (content !== undefined) {
      post.content = content;
    }

    if (caption !== undefined) {
      post.caption = caption;
    }

    post.updatedAt = Date.now();
    await post.save();

    return res.status(200).json({
      success: true,
      message: "Post updated successfully",
      post,
    });
  } catch (error) {
    console.error("Update post error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Something went wrong" });
  }
};

// Delete a post
const deletePost = async (req, res) => {
  try {
    const postId = req.params.postId;
    const userId = req.user._id;

    // Check if post exists and belongs to the user
    const post = await postModel.findById(postId);

    if (!post) {
      return res
        .status(404)
        .json({ success: false, message: "Post not found" });
    }

    if (post.author.toString() !== userId.toString()) {
      return res
        .status(403)
        .json({
          success: false,
          message: "You are not authorized to delete this post",
        });
    }

    // Delete post media files
    if (post.media && post.media.length > 0) {
      post.media.forEach((mediaPath) => {
        const fullPath = path.join(__dirname, "..", "public", mediaPath);
        if (fs.existsSync(fullPath)) {
          fs.unlinkSync(fullPath);
        }
      });
    }

    // Delete post from database
    const deletedPost = await postModel.findByIdAndDelete(postId);

    return res.status(200).json({
      success: true,
      message: "Post deleted successfully",
      data: deletedPost,
    });
  } catch (error) {
    console.error("Delete post error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Something went wrong" });
  }
};

// Delete a specific image from a post
const deletePostImage = async (req, res) => {
  try {
    const { postId, imageIndex } = req.params;
    const userId = req.user._id;

    // Check if post exists and belongs to the user
    const post = await postModel.findById(postId);

    if (!post) {
      return res
        .status(404)
        .json({ success: false, message: "Post not found" });
    }

    if (post.author.toString() !== userId.toString()) {
      return res
        .status(403)
        .json({
          success: false,
          message: "You are not authorized to modify this post",
        });
    }

    // Check if the image index is valid
    if (!post.media || imageIndex >= post.media.length) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid image index" });
    }

    // Get the path of the image to delete
    const imagePath = post.media[imageIndex];
    const fullImagePath = path.join(__dirname, "..", "public", imagePath);

    // Remove the image file if it exists
    if (fs.existsSync(fullImagePath)) {
      fs.unlinkSync(fullImagePath);
    }

    // Remove the image path from the media array
    post.media.splice(imageIndex, 1);
    await post.save();

    return res.status(200).json({
      success: true,
      message: "Image deleted successfully",
      post,
    });
  } catch (error) {
    console.error("Delete post image error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Something went wrong" });
  }
};

// Get feed for the current user (all posts, prioritizing friends)
const getFeed = async (req, res) => {
  try {
    const userId = req.user._id;

    // Get the current user to check friends (for future ranking)
    const currentUser = await require("../models/userModel").findById(userId);

    if (!currentUser) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    // Get all posts, sorted by creation date (newest first)
    // Future enhancement: Could prioritize friends' posts in a more sophisticated feed algorithm
    const posts = await postModel
      .find()
      .sort({ createdAt: -1 })
      .populate("author", "fullName avatar")
      .populate({
        path: "comments",
        populate: {
          path: "user",
          select: "fullName avatar",
        },
        options: { sort: { createdAt: -1 } },
      })
      .populate({
        path: "reactions",
        populate: {
          path: "user",
          select: "fullName avatar",
        },
      });

    return res.status(200).json({
      success: true,
      posts
    });
  } catch (error) {
    console.error("Get feed error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Something went wrong" });
  }
};

// Add a comment to a post
const addComment = async (req, res) => {
  try {
    const { postId } = req.params;
    const { content } = req.body;
    const userId = req.user._id;

    // Validate input
    if (!content || content.trim() === "") {
      return res
        .status(400)
        .json({ success: false, message: "Comment content is required" });
    }

    // Check if post exists
    const post = await postModel.findById(postId);
    if (!post) {
      return res
        .status(404)
        .json({ success: false, message: "Post not found" });
    }

    // Create new comment
    const newComment = new commentModel({
      post: postId,
      user: userId,
      content,
      parent: null, // This is a direct comment on a post
    });

    post.comments.push(newComment._id); // Add comment ID to the post's comments array

    await newComment.save();
    await post.save(); // Save the post to update its comments array

    // Populate user info in the comment
    const populatedComment = await commentModel
      .findById(newComment._id)
      .populate("user", "fullName avatar");

      if(post.author.toString() != userId.toString()){
        // Create notification for the post author
        await sendNotificationToUser(post.author.toString(), userId, "comment_post", postId)
      }

    return res.status(201).json({
      success: true,
      message: "Comment added successfully",
      comment: populatedComment,
    });
  } catch (error) {
    console.error("Add comment error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Something went wrong" });
  }
};

// Add a reply to a comment
const addReply = async (req, res) => {
  try {
    const { commentId } = req.params;
    const { content } = req.body;
    const userId = req.user._id;

    // Validate input
    if (!content || content.trim() === "") {
      return res
        .status(400)
        .json({ success: false, message: "Reply content is required" });
    }

    // Check if the parent comment exists
    const parentComment = await commentModel.findById(commentId);
    if (!parentComment) {
      return res
        .status(404)
        .json({ success: false, message: "Parent comment not found" });
    }

    // Create new reply
    const newReply = new commentModel({
      post: parentComment.post, // Use the same post ID as the parent comment
      user: userId,
      content,
      parent: commentId,
    });

    await newReply.save();

    // Populate user info in the reply
    const populatedReply = await commentModel
      .findById(newReply._id)
      .populate("user", "fullName avatar");

    return res.status(201).json({
      success: true,
      message: "Reply added successfully",
      comment: populatedReply,
    });
  } catch (error) {
    console.error("Add reply error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Something went wrong" });
  }
};

// Get all comments for a specific post (including replies)
const getCommentsByPost = async (req, res) => {
  try {
    const { postId } = req.params;

    // Kiểm tra post tồn tại
    const post = await postModel.findById(postId);
    if (!post) {
      return res
        .status(404)
        .json({ success: false, message: "Post not found" });
    }

    // Lấy tất cả comment gốc (parent: null) và populate replies
    const comments = await commentModel
      .find({ post: postId, parent: null })
      .sort({ createdAt: -1 }) // mới nhất lên trước
      .populate("user", "fullName avatar")
      .lean(); // sử dụng lean() để dễ dàng gán thêm trường replies

    // Lấy tất cả replies của bài post
    const replies = await commentModel
      .find({ post: postId, parent: { $ne: null } })
      .populate("user", "fullName avatar")
      .lean();

    // Gán replies vào từng comment chính
    const commentMap = {};
    comments.forEach((comment) => {
      comment.replies = [];
      commentMap[comment._id.toString()] = comment;
    });

    replies.forEach((reply) => {
      const parentId = reply.parent.toString();
      if (commentMap[parentId]) {
        commentMap[parentId].replies.push(reply);
      }
    });

    return res.status(200).json({
      success: true,
      comments: Object.values(commentMap),
    });
  } catch (error) {
    console.error("Get comments error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Something went wrong" });
  }
};

module.exports = {
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
  getCommentsByPost,
};
