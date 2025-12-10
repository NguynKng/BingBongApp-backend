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
const { CLOUDINARY_FOLDERS } = require("../services/cloudinary/constant");
const { uploadToCloudinary, cloudinary, deleteManyFromCloudinary } = require("../services/cloudinary/upload");

//
// 🧩 Tạo bài viết mới
//
const createPost = async (req, res) => {
  try {
    const { content, postedByType, postedById } = req.body;
    const author = req.user._id;

    // ------------------- Validate -------------------
    if (!content || !postedByType || !postedById) {
      return res.status(400).json({
        success: false,
        message: "Thiếu thông tin bắt buộc.",
      });
    }

    const validTypes = ["User", "Shop", "Group"];
    if (!validTypes.includes(postedByType)) {
      return res.status(400).json({
        success: false,
        message: "Loại bài đăng không hợp lệ.",
      });
    }

    if (postedByType === "Group") {
      const group = await groupModel.findById(postedById);
      if (!group) {
        return res.status(404).json({
          success: false,
          message: "Nhóm không tồn tại.",
        });
      }
      if (!group.settings.allowMemberPost) {
        return res.status(403).json({
          success: false,
          message: "Bạn không được phép đăng bài trong nhóm này.",
        });
      }
    }

    // ------------------- Gửi dữ liệu sang Flask kiểm duyệt (nếu cần) -------------------
    // const formData = new FormData();
    // formData.append("content", content);

    // if (req.files?.length) {
    //   for (const file of req.files) {
    //     formData.append("images", fs.createReadStream(file.path), {
    //       filename: file.originalname,
    //       contentType: file.mimetype,
    //     });
    //   }
    // }

    // const flaskResponse = await axios.post(
    //   `${BACKEND_AI_PYTHON_URL}/analyze-post`,
    //   formData,
    //   { headers: formData.getHeaders() }
    // );
    //
    // if (flaskResponse.data.isPostSafeForChild === false) {
    //   return res.status(400).json({
    //     success: false,
    //     message: "Bài viết chứa nội dung không phù hợp.",
    //   });
    // }

    // ------------------- Upload ảnh lên Cloudinary -------------------
    let mediaPublicIds = [];

    if (req.files?.length) {
      for (const file of req.files) {
        const uploaded = await uploadToCloudinary(
          file.buffer,
          "post"
        );
        mediaPublicIds.push(uploaded.public_id);
      }
    }

    // ------------------- Tạo bài viết -------------------
    const newPost = await postModel.create({
      author,
      postedByType,
      postedById,
      content,
      media: mediaPublicIds,
    });

    // Populate
    const populatedPost = await postModel
      .findById(newPost._id)
      .populate("author", "fullName avatar slug")
      .populate("postedById", "fullName name avatar coverPhoto slug")
      .lean();

    // ------------------- Notification -------------------
    if (postedByType === "User") {
      await sendNotificationToFriends(author, "new_post", {
        postId: newPost._id,
      });
    }

    return res.status(201).json({
      success: true,
      message: "Đăng bài thành công.",
      post: populatedPost,
    });
  } catch (error) {
    console.error("❌ Create post error:", error);
    return res.status(500).json({
      success: false,
      message: "Đã xảy ra lỗi khi đăng bài.",
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
                select: "fullName avatar slug badgeInventory",
                populate: {
                    path: "badgeInventory.badgeId",
                    select: "name tier description", // lấy các field cần thiết
                },
            })
            .populate("postedById", "fullName name slug avatar coverPhoto")
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
            message: "Không thể tải danh sách bài viết.",
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
      message: "Đã đánh dấu bài viết.",
    });
  } catch (error) {
    console.error("Mark viewed error:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi khi đánh dấu bài viết.",
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
      message: "Không thể tải bài viết.",
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
        .json({ success: false, message: "Bài viết không tồn tại." });

    return res.status(200).json({ success: true, post });
  } catch (error) {
    console.error("Get post error:", error);
    return res.status(500).json({
      success: false,
      message: "Không thể tải bài viết.",
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
        .json({ success: false, message: "Không tìm thấy bài viết." });

    if (post.author.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: "Bạn không có quyền chỉnh sửa bài viết này.",
      });
    }

    post.content = content || post.content;
    post.updatedAt = Date.now();
    await post.save();

    return res.status(200).json({
      success: true,
      message: "Cập nhật bài viết thành công.",
      post,
    });
  } catch (error) {
    console.error("Update post error:", error);
    return res.status(500).json({
      success: false,
      message: "Không thể cập nhật bài viết.",
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
        .json({ success: false, message: "Bài viết không tồn tại." });

    if (post.author.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: "Bạn không có quyền xóa bài viết này.",
      });
    }

    // Xoá ảnh khỏi server
    if (post.media?.length) {
        await deleteManyFromCloudinary(post.media);
    }

    await postModel.findByIdAndDelete(postId);

    return res.status(200).json({
      success: true,
      message: "Đã xoá bài viết thành công.",
    });
  } catch (error) {
    console.error("Delete post error:", error);
    return res.status(500).json({
      success: false,
      message: "Không thể xoá bài viết.",
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
        .json({ success: false, message: "Nội dung bình luận trống." });
    }

    const post = await postModel.findById(postId);
    if (!post)
      return res
        .status(404)
        .json({ success: false, message: "Bài viết không tồn tại." });

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
      message: "Đã thêm bình luận.",
      comment: populatedComment,
    });
  } catch (error) {
    console.error("Add comment error:", error);
    return res.status(500).json({
      success: false,
      message: "Không thể bình luận.",
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
        .json({ success: false, message: "Nội dung phản hồi trống." });
    }

    const parentComment = await commentModel.findById(commentId);
    if (!parentComment)
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy bình luận cha." });

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

    return res.status(201).json({
      success: true,
      message: "Đã thêm phản hồi.",
      comment: populatedReply,
    });
  } catch (error) {
    console.error("Add reply error:", error);
    return res.status(500).json({
      success: false,
      message: "Không thể phản hồi.",
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
        .json({ success: false, message: "Bài viết không tồn tại." });

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
      message: "Không thể tải bình luận.",
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
