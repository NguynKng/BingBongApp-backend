const postModel = require("../models/postModel");
const commentModel = require("../models/commentModel");
const fs = require("fs");
const path = require("path");
const FormData = require("form-data");
const axios = require("axios");
const {
    createAndSendNotificationForFriend,
    sendNotificationToUser,
} = require("./notification");
const { BACKEND_AI_PYTHON_URL } = require("../config/envVars");

//
// 🧩 Tạo bài viết mới
//
const createPost = async (req, res) => {
    try {
        const { content, postedByType, postedById } = req.body;
        const author = req.user._id; // ✅ Lấy user đăng nhập làm tác giả

        // ✅ Kiểm tra đầu vào
        if (!content || !postedByType || !postedById) {
            return res.status(400).json({
                success: false,
                message: "Thiếu thông tin bắt buộc: content, postedByType, postedById.",
            });
        }

        // ✅ Kiểm tra loại hợp lệ
        const validTypes = ["User", "Shop", "Group"];
        if (!validTypes.includes(postedByType)) {
            return res
                .status(400)
                .json({ success: false, message: "Loại bài đăng không hợp lệ." });
        }

        // ✅ Gửi sang Flask AI kiểm duyệt (nếu có)
        const formData = new FormData();
        formData.append("content", content);

        if (req.files?.length) {
            for (const file of req.files) {
                const stream = fs.createReadStream(file.path);
                formData.append("images", stream, {
                    filename: file.originalname,
                    contentType: file.mimetype,
                });
            }
        }

        // const flaskResponse = await axios.post(
        //   `${BACKEND_AI_PYTHON_URL}/analyze-post`,
        //   formData,
        //   { headers: formData.getHeaders() }
        // );

        // if (flaskResponse.data.isPostSafeForChild === false) {
        //   return res.status(400).json({
        //     success: false,
        //     message: "Bài viết chứa nội dung không phù hợp, không thể đăng.",
        //   });
        // }

        // ✅ Xử lý media paths
        const mediaPaths = [];
        if (req.files?.length) {
            for (const file of req.files) {
                const fileName = path.basename(file.path);
                mediaPaths.push(`/uploads/posts/${fileName}`);
            }
        }

        // ✅ Tạo bài viết mới
        const newPost = await postModel.create({
            author,
            postedByType,
            postedById,
            content,
            media: mediaPaths,
        });

        // ✅ Populate bài đăng sau khi tạo
        const populatedPost = await postModel
            .findById(newPost._id)
            .populate("author", "fullName avatar slug")
            .populate("postedById", "fullName name avatar coverPhoto slug");

        // ✅ Gửi thông báo cho bạn bè nếu là bài của User
        if (postedByType === "User") {
            await createAndSendNotificationForFriend(
                author,
                "new_post",
                populatedPost._id
            );
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
            for (const mediaPath of post.media) {
                const fullPath = path.join(__dirname, "..", "public", mediaPath);
                if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
            }
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
            })

        // 🔔 Gửi thông báo cho chủ bài viết
        if (post.author.toString() !== userId.toString()) {
            await sendNotificationToUser(
                post.author.toString(),
                userId,
                "comment_post",
                postId
            );
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
};
