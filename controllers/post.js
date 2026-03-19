const postModel = require("../models/postModel");
const groupModel = require("../models/groupModel");
const commentModel = require("../models/commentModel");
const userModel = require("../models/userModel");
const shopModel = require("../models/shopModel");
const fs = require("fs");
const path = require("path");
const FormData = require("form-data");
const axios = require("axios");
const {
  sendNotification,
  sendNotificationToFriends,
} = require("./notification");
const { BACKEND_AI_PYTHON_URL } = require("../config/envVars");
const {
  uploadToCloudinary,
  cloudinary,
  deleteManyFromCloudinary,
} = require("../services/cloudinary/upload");

const createPost = async (req, res) => {
  try {
    const { content, postedByType, postedById, taggedUsers, mediaOrder } = req.body;
    const author = req.user._id;

    const normalizeFiles = (files) => {
      if (!files) {
        return { imageFiles: [], videoFiles: [] };
      }

      if (Array.isArray(files)) {
        return {
          imageFiles: files.filter((file) => file.mimetype?.startsWith("image/")),
          videoFiles: files.filter((file) => file.mimetype?.startsWith("video/")),
        };
      }

      return {
        imageFiles: files.images || [],
        videoFiles: files.videos || [],
      };
    };

    const { imageFiles, videoFiles } = normalizeFiles(req.files);
    const normalizedContent = content?.trim() || "";

    // ------------------- Validate -------------------
    if (!postedByType || !postedById) {
      return res.status(400).json({
        success: false,
        message: "Post type and post target are required.",
      });
    }

    if (!normalizedContent && imageFiles.length === 0 && videoFiles.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Post must contain text, image, or video.",
      });
    }

    const validTypes = ["User", "Shop", "Group"];
    if (!validTypes.includes(postedByType)) {
      return res.status(400).json({
        success: false,
        message: "Invalid post type.",
      });
    }

    if (postedByType === "Group") {
      const group = await groupModel.findById(postedById);
      if (!group) {
        return res.status(404).json({
          success: false,
          message: "Group not found.",
        });
      }
      if (!group.settings.allowMemberPost) {
        return res.status(403).json({
          success: false,
          message: "You are not allowed to post in this group.",
        });
      }
    }

    // ------------------- Gửi dữ liệu sang Flask kiểm duyệt (nếu cần) -------------------
    // const formData = new FormData();
    // formData.append("content", normalizedContent);

    // if (imageFiles.length > 0) {
    //   for (const file of imageFiles) {
    //     formData.append("images", file.buffer, {
    //       filename: file.originalname,
    //       contentType: file.mimetype,
    //     });
    //   }
    // }

    // if (normalizedContent || imageFiles.length > 0) {
    //   const flaskResponse = await axios.post(
    //     `${BACKEND_AI_PYTHON_URL}/analyze-post`,
    //     formData,
    //     { headers: formData.getHeaders() }
    //   );

    //   if (flaskResponse.data.isPostSafeForChild === false) {
    //     return res.status(400).json({
    //       success: false,
    //       message: "This post contains inappropriate content.",
    //     });
    //   }
    // }

    // ------------------- Upload media lên Cloudinary -------------------
    const mediaPublicIds = [];
    if (imageFiles.length > 0) {
      for (const file of imageFiles) {
        const uploaded = await uploadToCloudinary(file.buffer, "post");
        mediaPublicIds.push(uploaded.public_id);
      }
    }

    const videoPublicIds = [];
    if (videoFiles.length > 0) {
      for (const file of videoFiles) {
        const uploaded = await uploadToCloudinary(file.buffer, "video");
        videoPublicIds.push(uploaded.public_id);
      }
    }

    let taggedUserIds = [];
    if (Array.isArray(taggedUsers)) {
      taggedUserIds = taggedUsers;
    } else if (typeof taggedUsers === "string" && taggedUsers) {
      taggedUserIds = [taggedUsers];
    }

    const parseMediaOrder = (orderInput, imageCount, videoCount) => {
      const rawEntries = Array.isArray(orderInput)
        ? orderInput
        : orderInput
          ? [orderInput]
          : [];

      const normalized = [];

      rawEntries.forEach((entry) => {
        try {
          const parsedEntry = typeof entry === "string" ? JSON.parse(entry) : entry;
          const mediaType = parsedEntry?.type;
          const mediaIndex = Number(parsedEntry?.index);

          if (
            (mediaType === "image" || mediaType === "video") &&
            Number.isInteger(mediaIndex) &&
            mediaIndex >= 0 &&
            ((mediaType === "image" && mediaIndex < imageCount) ||
              (mediaType === "video" && mediaIndex < videoCount))
          ) {
            normalized.push({ type: mediaType, index: mediaIndex });
          }
        } catch (error) {
          // Ignore malformed mediaOrder entries and fallback below.
        }
      });

      const usedImageIndexes = new Set(
        normalized.filter((item) => item.type === "image").map((item) => item.index)
      );
      const usedVideoIndexes = new Set(
        normalized.filter((item) => item.type === "video").map((item) => item.index)
      );

      for (let i = 0; i < imageCount; i += 1) {
        if (!usedImageIndexes.has(i)) {
          normalized.push({ type: "image", index: i });
        }
      }

      for (let i = 0; i < videoCount; i += 1) {
        if (!usedVideoIndexes.has(i)) {
          normalized.push({ type: "video", index: i });
        }
      }

      return normalized;
    };

    const parsedMediaOrder = parseMediaOrder(
      mediaOrder,
      mediaPublicIds.length,
      videoPublicIds.length
    );

    // ------------------- Tạo bài viết -------------------
    const newPost = await postModel.create({
      author,
      postedByType,
      postedById,
      content: normalizedContent,
      media: mediaPublicIds,
      videos: videoPublicIds,
      mediaOrder: parsedMediaOrder,
      taggedUsers: taggedUserIds,
    });

    // Populate
    const populatedPost = await postModel
      .findById(newPost._id)
      .populate({
        path: "author",
        select: "fullName avatar slug badgeInventory isVerifiedAccount",
        populate: {
          path: "badgeInventory.badgeId",
          select: "name tier description",
        },
      })
      .populate(
        "postedById",
        "fullName name avatar coverPhoto slug isVerifiedAccount"
      )
      .populate("taggedUsers", "fullName avatar slug isVerifiedAccount")
      .lean();

    // ------------------- Notification -------------------
    if (postedByType === "User") {
      await sendNotificationToFriends(author, "new_post", {
        postId: newPost._id,
      });
    }

    if (taggedUserIds.length > 0) {
      const notifyUserIds = taggedUserIds.filter(
        (id) => id.toString() !== author.toString()
      );
      if (notifyUserIds.length > 0) {
        await sendNotification(notifyUserIds, author, "tagged_in_post", {
          postId: newPost._id,
        });
      }
    }

    return res.status(201).json({
      success: true,
      message: "Post created successfully.",
      post: populatedPost,
    });
  } catch (error) {
    console.error("❌ Create post error:", error);
    return res.status(500).json({
      success: false,
      message: "An error occurred while creating the post.",
    });
  }
};

//
// 📜 Lấy danh sách bài viết (có phân trang)
//
const getPosts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const posts = await postModel
      .find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate({
        path: "author",
        select: "fullName avatar slug badgeInventory isVerifiedAccount",
        populate: {
          path: "badgeInventory.badgeId",
          select: "name tier description", // lấy các field cần thiết
        },
      })
      .populate(
        "postedById",
        "fullName name slug avatar coverPhoto isVerifiedAccount"
      )
      .populate("taggedUsers", "fullName avatar slug")
      .populate({
        path: "reactions",
        populate: { path: "user", select: "fullName avatar" },
      });

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
    return res.status(500).json({
      success: false,
      message: "Failed to load posts.",
    });
  }
};
// const getPosts = async (req, res) => {
//   try {
//     const userId = req.user?._id;
//     const page = parseInt(req.query.page) || 1;
//     const limit = parseInt(req.query.limit) || 20;
//     const skip = (page - 1) * limit;

//     // ✅ 1. Lấy thông tin user song song
//     const [user, followingShops, followingGroups] = await Promise.all([
//       userModel
//         .findById(userId)
//         .select("friends viewedPosts")
//         .lean(),

//       shopModel
//         .find({ followers: userId })
//         .select("_id")
//         .lean(),

//       groupModel
//         .find({ members: userId }) // ✅ Group chỉ có members, không có followers
//         .select("_id")
//         .lean(),
//     ]);

//     if (!user) {
//       return res.status(401).json({
//         success: false,
//         message: "Người dùng không tồn tại.",
//       });
//     }

//     const friendIds = user.friends || [];
//     const viewedPostIds = (user.viewedPosts || []).map((id) =>
//       id instanceof mongoose.Types.ObjectId ? id : new mongoose.Types.ObjectId(id)
//     );
//     const followingShopIds = followingShops.map((shop) => shop._id);
//     const followingGroupIds = followingGroups.map((group) => group._id);

//     // ✅ 2. Query điều kiện
//     const query = {
//       $or: [
//         {
//           postedByType: "User",
//           postedById: { $in: [...friendIds, userId] }, // Bạn bè + chính mình
//         },
//         {
//           postedByType: "Shop",
//           postedById: { $in: followingShopIds },
//         },
//         {
//           postedByType: "Group",
//           postedById: { $in: followingGroupIds },
//         },
//       ],
//     };

//     // ✅ 3. Aggregate với scoring
//     const posts = await postModel.aggregate([
//       { $match: query },

//       // Tính engagement score
//       {
//         $addFields: {
//           engagementScore: {
//             $add: [
//               { $size: { $ifNull: ["$reactions", []] } },
//               { $multiply: [{ $size: { $ifNull: ["$comments", []] } }, 2] },
//             ],
//           },

//           // Tính recency score (giờ)
//           recencyScore: {
//             $divide: [
//               { $subtract: [new Date(), "$createdAt"] },
//               1000 * 60 * 60,
//             ],
//           },

//           // Check đã xem chưa
//           isViewed: {
//             $cond: {
//               if: { $in: ["$_id", viewedPostIds] },
//               then: true,
//               else: false,
//             },
//           },
//         },
//       },

//       // Tính final score
//       {
//         $addFields: {
//           finalScore: {
//             $add: [
//               // Chưa xem +1000 điểm
//               { $cond: [{ $eq: ["$isViewed", false] }, 1000, 0] },

//               // Engagement score
//               "$engagementScore",

//               // Bài mới hơn = điểm cao hơn
//               {
//                 $divide: [
//                   100,
//                   { $add: ["$recencyScore", 1] }
//                 ]
//               },
//             ],
//           },
//         },
//       },

//       // Sắp xếp
//       {
//         $sort: {
//           finalScore: -1,
//           createdAt: -1
//         }
//       },

//       { $skip: skip },
//       { $limit: limit },
//     ]);

//     // ✅ 4. Populate thông tin
//     const populatedPosts = await postModel.populate(posts, [
//       {
//         path: "author",
//         select: "fullName avatar slug badgeInventory",
//         populate: {
//           path: "badgeInventory.badgeId",
//           select: "name tier description",
//         },
//       },
//       {
//         path: "postedById",
//         select: "fullName name slug avatar coverPhoto",
//       },
//       {
//         path: "reactions",
//         populate: {
//           path: "user",
//           select: "fullName avatar slug"
//         },
//       },
//     ]);

//     // ✅ 5. Đếm tổng số bài viết
//     const total = await postModel.countDocuments(query);

//     return res.status(200).json({
//       success: true,
//       posts: populatedPosts,
//       pagination: {
//         total,
//         page,
//         pages: Math.ceil(total / limit),
//       },
//     });
//   } catch (error) {
//     console.error("Get posts error:", error);
//     return res.status(500).json({
//       success: false,
//       message: "Không thể tải danh sách bài viết.",
//     });
//   }
// };

const markPostAsViewed = async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.user._id;

    const user = await userModel.findById(userId);

    if (!user.viewedPosts.includes(postId)) {
      user.viewedPosts.push(postId);

      // Giữ tối đa 1000 bài gần nhất
      if (user.viewedPosts.length > 1000) {
        user.viewedPosts = user.viewedPosts.slice(-1000);
      }

      await user.save();
    }

    return res.status(200).json({
      success: true,
      message: "Post marked as viewed.",
    });
  } catch (error) {
    console.error("Mark viewed error:", error);
    return res.status(500).json({
      success: false,
      message: "Error marking post as viewed.",
    });
  }
};

//
// 👤 Lấy bài viết theo chủ thể (User / Shop / Group)
//
const getPostsByOwner = async (req, res) => {
  try {
    const { type, id } = req.params;

    const posts = await postModel
      .find({ postedByType: type, postedById: id })
      .sort({ createdAt: -1 })
      .populate({
        path: "author",
        select: "fullName avatar slug badgeInventory",
        populate: {
          path: "badgeInventory.badgeId",
          select: "name tier description", // lấy các field cần thiết
        },
      })
      .populate("postedById", "fullName name slug avatar coverPhoto")
      .populate("taggedUsers", "fullName avatar slug")
      .populate({
        path: "reactions",
        populate: { path: "user", select: "fullName avatar slug" },
      });

    if (!posts) {
      return res
        .status(404)
        .json({ success: false, message: "No posts found." });
    }

    return res.status(200).json({ success: true, posts });
  } catch (error) {
    console.error("Get posts by owner error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to load posts.",
    });
  }
};

//
// 📄 Lấy 1 bài viết cụ thể
//
const getPostById = async (req, res) => {
  try {
    const { postId } = req.params;
    const post = await postModel
      .findById(postId)
      .populate({
        path: "author",
        select: "fullName avatar slug badgeInventory",
        populate: {
          path: "badgeInventory.badgeId",
          select: "name tier description", // lấy các field cần thiết
        },
      })
      .populate("postedById", "fullName name avatar coverPhoto slug")
      .populate("taggedUsers", "fullName avatar slug")
      .populate({
        path: "reactions",
        populate: { path: "user", select: "fullName avatar slug" },
      })
      .populate({
        path: "comments",
        populate: { path: "user", select: "fullName avatar slug" },
        options: { sort: { createdAt: -1 } },
      });

    if (!post)
      return res
        .status(404)
        .json({ success: false, message: "Post not found." });

    return res.status(200).json({ success: true, post });
  } catch (error) {
    console.error("Get post error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to load post.",
    });
  }
};

//
// ✏️ Cập nhật bài viết
//
const updatePost = async (req, res) => {
  try {
    const { postId } = req.params;
    const { content } = req.body;
    const userId = req.user._id;

    const post = await postModel.findById(postId);
    if (!post)
      return res
        .status(404)
        .json({ success: false, message: "Post not found." });

    if (post.author.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to edit this post.",
      });
    }

    post.content = content || post.content;
    post.updatedAt = Date.now();
    await post.save();

    return res.status(200).json({
      success: true,
      message: "Post updated successfully.",
      post,
    });
  } catch (error) {
    console.error("Update post error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update post.",
    });
  }
};

//
// 🗑️ Xoá bài viết
//
const deletePost = async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.user._id;

    const post = await postModel.findById(postId);
    if (!post)
      return res
        .status(404)
        .json({ success: false, message: "Post not found." });

    if (post.author.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to delete this post.",
      });
    }

    // Xoá media khỏi Cloudinary
    if (post.media?.length) {
      await deleteManyFromCloudinary(post.media);
    }

    if (post.videos?.length) {
      await Promise.allSettled(
        post.videos.map((videoPublicId) =>
          cloudinary.uploader.destroy(videoPublicId, {
            resource_type: "video",
          })
        )
      );
    }

    await postModel.findByIdAndDelete(postId);

    return res.status(200).json({
      success: true,
      message: "Delete post successfully.",
    });
  } catch (error) {
    console.error("Delete post error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete post.",
    });
  }
};

//
// 💬 Thêm bình luận
//
const addComment = async (req, res) => {
  try {
    const { postId } = req.params;
    const { content } = req.body;
    const userId = req.user._id;

    if (!content?.trim()) {
      return res
        .status(400)
        .json({ success: false, message: "Comment content is empty." });
    }

    const post = await postModel.findById(postId);
    if (!post)
      return res
        .status(404)
        .json({ success: false, message: "Post not found." });

    const newComment = await commentModel.create({
      post: postId,
      user: userId,
      content,
    });

    post.comments.push(newComment._id);
    await post.save();

    const populatedComment = await commentModel
      .findById(newComment._id)
      .populate({
        path: "user",
        select: "fullName avatar slug badgeInventory",
        populate: {
          path: "badgeInventory.badgeId",
          select: "name tier description", // lấy các field cần thiết
        },
      });

    // 🔔 Gửi thông báo cho chủ bài viết
    if (post.author.toString() !== userId.toString()) {
      await sendNotification([post.author], userId, "comment_post", {
        postId: post._id,
        commentId: newComment._id,
      });
    }

    return res.status(201).json({
      success: true,
      message: "Comment added successfully.",
      comment: populatedComment,
    });
  } catch (error) {
    console.error("Add comment error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to add comment.",
    });
  }
};

//
// 💬 Thêm phản hồi (reply)
//
const addReply = async (req, res) => {
  try {
    const { commentId } = req.params;
    const { content } = req.body;
    const userId = req.user._id;

    if (!content?.trim()) {
      return res
        .status(400)
        .json({ success: false, message: "Reply content is empty." });
    }

    const parentComment = await commentModel
      .findById(commentId)
      .populate("user", "_id");
    if (!parentComment)
      return res
        .status(404)
        .json({ success: false, message: "Parent comment not found." });

    const newReply = await commentModel.create({
      post: parentComment.post,
      user: userId,
      content,
      parent: commentId,
    });

    const post = await postModel.findById(parentComment.post);
    post.comments.push(newReply._id);
    await post.save();

    const populatedReply = await commentModel
      .findById(newReply._id)
      .populate("user", "fullName avatar slug");

    // 🔔 Gửi thông báo cho người được reply (chủ comment gốc)
    if (parentComment.user._id.toString() !== userId.toString()) {
      await sendNotification(
        [parentComment.user._id],
        userId,
        "reply_comment",
        {
          postId: post._id,
          commentId: newReply._id,
          parentCommentId: commentId,
        }
      );
    }

    // 🔔 Gửi thông báo cho chủ bài viết (nếu khác người reply và khác người được reply)
    if (
      post.author.toString() !== userId.toString() &&
      post.author.toString() !== parentComment.user._id.toString()
    ) {
      await sendNotification([post.author], userId, "comment_post", {
        postId: post._id,
        commentId: newReply._id,
      });
    }

    return res.status(201).json({
      success: true,
      message: "Reply added successfully.",
      comment: populatedReply,
    });
  } catch (error) {
    console.error("Add reply error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to add reply.",
    });
  }
};

//
// 📚 Lấy toàn bộ comment + reply của post
//
const getCommentsByPost = async (req, res) => {
  try {
    const { postId } = req.params;

    const post = await postModel.findById(postId);
    if (!post)
      return res
        .status(404)
        .json({ success: false, message: "Post not found." });

    const comments = await commentModel
      .find({ post: postId, parent: null })
      .sort({ createdAt: -1 })
      .populate({
        path: "user",
        select: "fullName avatar slug badgeInventory",
        populate: {
          path: "badgeInventory.badgeId",
          select: "name tier description", // lấy các field cần thiết
        },
      })
      .lean();

    const replies = await commentModel
      .find({ post: postId, parent: { $ne: null } })
      .populate({
        path: "user",
        select: "fullName avatar slug badgeInventory",
        populate: {
          path: "badgeInventory.badgeId",
          select: "name tier description", // lấy các field cần thiết
        },
      })
      .lean();

    const commentMap = {};
    comments.forEach((c) => {
      c.replies = [];
      commentMap[c._id.toString()] = c;
    });
    replies.forEach((r) => {
      const pid = r.parent?.toString();
      if (commentMap[pid]) commentMap[pid].replies.push(r);
    });

    return res.status(200).json({
      success: true,
      comments: Object.values(commentMap),
    });
  } catch (error) {
    console.error("Get comments error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to load comments.",
    });
  }
};

module.exports = {
  createPost,
  getPosts,
  getPostsByOwner,
  getPostById,
  updatePost,
  deletePost,
  addComment,
  addReply,
  getCommentsByPost,
  markPostAsViewed,
};
