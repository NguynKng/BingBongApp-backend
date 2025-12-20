const userModel = require("../models/userModel");
const shopModel = require("../models/shopModel");
const postModel = require("../models/postModel");
const groupModel = require("../models/groupModel");
const commentModel = require("../models/commentModel");
const chatModel = require("../models/chatModel");
const reactionModel = require("../models/reactionModel");
const { removeDiacritics } = require("../helper/helper");
const { sendNotification } = require("./notification");
const {
  uploadToCloudinary,
  deleteFromCloudinary,
} = require("../services/cloudinary/upload");

const getUserProgress = async (userId) => {
  const user = await userModel.findById(userId).select("createdAt friends");

  const posts_count = await postModel.countDocuments({ author: userId });
  const comments_count = await commentModel.countDocuments({ user: userId });

  const postIds = await postModel.find({ author: userId }).distinct("_id");
  const likes_received = await reactionModel.countDocuments({
    post: { $in: postIds },
  });
  const friends_count = user.friends.length;

  const account_age = Math.floor(
    (Date.now() - user.createdAt) / (1000 * 60 * 60 * 24)
  );

  return {
    posts_count,
    comments_count,
    likes_received,
    friends_count,
    account_age,
  };
};

const updateUserInfo = async (req, res) => {
  try {
    const userId = req.params.id;

    // 🧠 Các trường cho phép cập nhật
    const { bio, address, website, education, work, socialLinks } = req.body;

    // ✅ Cập nhật user
    const updatedUser = await userModel.findByIdAndUpdate(
      userId,
      {
        bio,
        address,
        website,
        education,
        work,
        socialLinks,
      },
      { new: true } // trả về bản ghi sau khi cập nhật
    );

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found." });
    }

    const newUpdatedUser = await userModel
      .findById(userId)
      .select("-password")
      .populate({
        path: "badgeInventory",
        populate: {
          path: "badgeId",
          select: "name tier description",
        },
      })
      .populate({
        path: "friends",
        select: "fullName avatar slug", // chỉ lấy các field cần thiết
      })
      .populate({
        path: "friendRequests",
        select: "fullName avatar slug",
      });

    res.status(200).json({
      message: "User information updated successfully.",
      data: newUpdatedUser,
    });
  } catch (error) {
    console.error("Error updating user information:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const setAvatar = async (req, res) => {
  const { type, id } = req.body; // type: "user" | "shop" | "group"
  try {
    if (!req.file)
      return res
        .status(400)
        .json({ success: false, message: "No file uploaded" });

    const isDefaultAvatar = (path, type) => {
      switch (type) {
        case "User":
        case "Shop":
        case "Group":
          return path === "default-avatar";
        case "GroupChat":
          return path === "group-chat";
      }
    };

    let oldAvatar;
    const result = await uploadToCloudinary(req.file.buffer, "avatar");
    const newImagePublicId = result.public_id;

    switch (type) {
      case "User":
        const user = await userModel.findById(req.user._id);
        if (!user)
          return res
            .status(404)
            .json({ success: false, message: "User not found" });
        oldAvatar = user.avatar;
        await userModel
          .findByIdAndUpdate(
            req.user._id,
            { avatar: newImagePublicId },
            { new: true }
          )
          .select("-password");
        break;

      case "Shop":
        const shop = await shopModel.findById(id);
        if (!shop)
          return res
            .status(404)
            .json({ success: false, message: "Shop not found" });
        oldAvatar = shop.avatar;
        await shopModel.findByIdAndUpdate(
          id,
          { avatar: newImagePublicId },
          { new: true }
        );
        break;

      case "Group":
        const group = await groupModel.findById(id);
        if (!group)
          return res
            .status(404)
            .json({ success: false, message: "Group not found" });
        oldAvatar = group.avatar;
        await groupModel.findByIdAndUpdate(
          id,
          { avatar: newImagePublicId },
          { new: true }
        );
        break;

      case "GroupChat":
        const groupChat = await chatModel.findById(id);
        if (!groupChat)
          return res
            .status(404)
            .json({ success: false, message: "Group chat not found" });
        oldAvatar = groupChat.avatar;
        await chatModel.findByIdAndUpdate(
          id,
          { avatar: newImagePublicId },
          { new: true }
        );
        break;

      default:
        return res
          .status(400)
          .json({ success: false, message: "Invalid type" });
    }

    // ✅ Xóa ảnh cũ nếu không phải ảnh mặc định
    if (!isDefaultAvatar(oldAvatar, type)) {
      await deleteFromCloudinary(oldAvatar);
    }

    return res.status(200).json({
      success: true,
      message: `${type} avatar updated successfully`,
      data: newImagePublicId,
    });
  } catch (error) {
    console.error("Set avatar error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Something went wrong" });
  }
};

// ✅ Set Cover Photo
const setCoverPhoto = async (req, res) => {
  const { type, id } = req.body;
  try {
    if (!req.file)
      return res
        .status(400)
        .json({ success: false, message: "No file uploaded" });

    const isDefaultCoverPhoto = (path) => {
      return path === "background-gray-default";
    };

    const result = await uploadToCloudinary(req.file.buffer, "cover");
    const newImagePublicId = result.public_id;

    let oldCover;

    switch (type) {
      case "User":
        const user = await userModel.findById(req.user._id);
        if (!user)
          return res
            .status(404)
            .json({ success: false, message: "User not found" });
        oldCover = user.coverPhoto;
        await userModel
          .findByIdAndUpdate(
            req.user._id,
            { coverPhoto: newImagePublicId },
            { new: true }
          )
          .select("-password");
        break;

      case "Shop":
        const shop = await shopModel.findById(id);
        if (!shop)
          return res
            .status(404)
            .json({ success: false, message: "Shop not found" });
        oldCover = shop.coverPhoto;
        await shopModel.findByIdAndUpdate(
          id,
          { coverPhoto: newImagePublicId },
          { new: true }
        );
        break;

      case "Group":
        const group = await groupModel.findById(id);
        if (!group)
          return res
            .status(404)
            .json({ success: false, message: "Group not found" });
        oldCover = group.coverPhoto;
        await groupModel.findByIdAndUpdate(
          id,
          { coverPhoto: newImagePublicId },
          { new: true }
        );
        break;

      default:
        return res
          .status(400)
          .json({ success: false, message: "Invalid type" });
    }

    // ✅ Xóa ảnh cũ nếu không phải mặc định
    if (!isDefaultCoverPhoto(oldCover)) {
      await deleteFromCloudinary(oldCover);
    }

    return res.status(200).json({
      success: true,
      message: `${type} cover photo updated successfully`,
      data: newImagePublicId,
    });
  } catch (error) {
    console.error("Set cover photo error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Something went wrong" });
  }
};

// Get user profile
const getUserProfile = async (req, res) => {
  try {
    // If userId is provided in params, use it, otherwise use the authenticated user's ID
    const userId = req.params.userId || req.user._id;

    const user = await userModel
      .findById(userId)
      .select("-password")
      .populate({
        path: "friends",
        select: "fullName avatar slug", // chỉ lấy các field cần thiết
      })
      .populate({
        path: "friendRequests",
        select: "fullName avatar slug",
      });

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    return res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    console.error("Get user profile error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Something went wrong" });
  }
};

// Get user profile
const getUserProfileBySlug = async (req, res) => {
  try {
    // If userId is provided in params, use it, otherwise use the authenticated user's ID
    const { slug } = req.params;

    const user = await userModel
      .findOne({ slug })
      .select("-password")
      .populate({
        path: "badgeInventory",
        populate: {
          path: "badgeId",
          select: "name tier description",
        },
      })
      .populate({
        path: "friends",
        select: "fullName avatar slug", // chỉ lấy các field cần thiết
      })
      .populate({
        path: "friendRequests",
        select: "fullName avatar slug",
      });

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    return res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error("Get user profile error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Something went wrong" });
  }
};

const getUserByName = async (req, res) => {
  try {
    const { name } = req.query;

    if (!name || name.trim() === "") {
      return res
        .status(400)
        .json({ success: false, message: "Name query is required" });
    }

    const normalizedInput = removeDiacritics(name.toLowerCase());

    const users = await userModel.find().select("fullName email avatar slug"); // exclude password

    const matchedUsers = users.filter((user) => {
      const normalizedFullName = removeDiacritics(user.fullName.toLowerCase());
      return normalizedFullName.includes(normalizedInput);
    });

    return res.status(200).json({
      success: true,
      users: matchedUsers,
    });
  } catch (error) {
    console.error("Search user error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Something went wrong" });
  }
};

// Gửi lời mời kết bạn
const sendFriendRequest = async (req, res) => {
  try {
    const senderId = req.user._id;
    const receiverId = req.params.userId;

    if (senderId.toString() === receiverId) {
      return res.status(400).json({
        success: false,
        message: "You cannot send a friend request to yourself.",
      });
    }

    const receiver = await userModel.findById(receiverId);
    if (!receiver)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });

    if (
      receiver.friendRequests.includes(senderId) ||
      receiver.friends.includes(senderId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Friend request already sent or you are already friends.",
      });
    }

    receiver.friendRequests.push(senderId);
    await receiver.save();

    const updatedSender = await userModel
      .findById(senderId)
      .select("-password");
    await sendNotification([receiverId], senderId, "friend_request", {
      userId: senderId,
    });

    return res.status(200).json({
      success: true,
      message: "Friend request sent successfully.",
      user: updatedSender,
    });
  } catch (err) {
    console.error("Send friend request error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Something went wrong" });
  }
};

// Hủy lời mời kết bạn
const cancelFriendRequest = async (req, res) => {
  try {
    const senderId = req.user._id;
    const receiverId = req.params.userId;

    const receiver = await userModel.findById(receiverId);
    if (!receiver)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });

    receiver.friendRequests = receiver.friendRequests.filter(
      (id) => id.toString() !== senderId.toString()
    );
    await receiver.save();

    const updatedSender = await userModel
      .findById(senderId)
      .select("-password");

    return res.status(200).json({
      success: true,
      message: "Friend request cancelled successfully.",
      user: updatedSender,
    });
  } catch (err) {
    console.error("Cancel friend request error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Something went wrong" });
  }
};

// Chấp nhận kết bạn
const acceptFriendRequest = async (req, res) => {
  try {
    const receiverId = req.user._id;
    const senderId = req.params.userId;

    const receiver = await userModel.findById(receiverId);
    const sender = await userModel.findById(senderId);

    if (!receiver || !sender) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    if (!receiver.friendRequests.includes(senderId)) {
      return res
        .status(400)
        .json({ success: false, message: "No friend request found." });
    }

    receiver.friends.push(senderId);
    sender.friends.push(receiverId);

    receiver.friendRequests = receiver.friendRequests.filter(
      (id) => id.toString() !== senderId.toString()
    );

    await receiver.save();
    await sender.save();

    const updatedReceiver = await userModel
      .findById(receiverId)
      .select("-password");
    await sendNotification([senderId], receiverId, "accepted_request", {
      userId: receiverId,
    });

    return res.status(200).json({
      success: true,
      message: "Friend request accepted successfully.",
      user: updatedReceiver,
    });
  } catch (err) {
    console.error("Accept friend request error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Something went wrong" });
  }
};

const declineFriendRequest = async (req, res) => {
  try {
    const receiverId = req.user._id;
    const senderId = req.params.userId;

    const receiver = await userModel.findById(receiverId);
    const sender = await userModel.findById(senderId);

    if (!receiver || !sender) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    if (!receiver.friendRequests.includes(senderId)) {
      return res
        .status(400)
        .json({ success: false, message: "No friend request found." });
    }

    receiver.friendRequests = receiver.friendRequests.filter(
      (id) => id.toString() !== senderId.toString()
    );

    await receiver.save();

    const updatedReceiver = await userModel
      .findById(receiverId)
      .select("-password");

    return res.status(200).json({
      success: true,
      message: "Friend request declined successfully.",
      user: updatedReceiver,
    });
  } catch (err) {
    console.error("Decline friend request error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Something went wrong" });
  }
};

// Hủy kết bạn
const removeFriend = async (req, res) => {
  try {
    const userId = req.user._id;
    const friendId = req.params.userId;

    const user = await userModel.findById(userId);
    const friend = await userModel.findById(friendId);

    if (!user || !friend) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    user.friends = user.friends.filter(
      (id) => id.toString() !== friendId.toString()
    );
    friend.friends = friend.friends.filter(
      (id) => id.toString() !== userId.toString()
    );

    await user.save();
    await friend.save();

    const updatedUser = await userModel.findById(userId).select("-password");

    return res.status(200).json({
      success: true,
      message: "Friend removed successfully.",
      user: updatedUser,
    });
  } catch (err) {
    console.error("Remove friend error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Something went wrong" });
  }
};

const getAllUsers = async (req, res) => {
  try {
    const users = await userModel
      .find()
      .select(
        "_id email avatar fullName createdAt isVerified block role gender phoneNumber slug"
      );
    return res.status(200).json({ success: true, data: users });
  } catch (error) {
    console.error("Get all users error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Something went wrong" });
  }
};

const getFriendSuggestions = async (req, res) => {
  try {
    const userId = req.user._id;
    const currentUser = await userModel.findById(userId).populate("friends");

    const excludeIds = [
      userId,
      ...currentUser.friends,
      ...currentUser.friendRequests,
    ];

    let suggestions = await userModel
      .find({
        _id: { $nin: excludeIds },
        block: false,
      })
      .select("fullName avatar friends slug friendRequests")
      .limit(10);

    suggestions = suggestions.map((user) => {
      const mutualFriends = user.friends.filter((f) =>
        currentUser.friends.map((id) => id.toString()).includes(f.toString())
      );
      return {
        ...user.toObject(),
        mutualFriendsCount: mutualFriends.length,
      };
    });

    return res.status(200).json({ success: true, data: suggestions });
  } catch (error) {
    console.error("Error fetching suggestions:", error.message);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

const getUserStats = async (req, res) => {
  try {
    const userId = req.user._id;
    const progress = await getUserProgress(userId);
    return res.status(200).json({ success: true, data: progress });
  } catch (error) {
    console.error("Get user stats error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Something went wrong" });
  }
};

const addUserRingtone = async (req, res) => {
  try {
    const userId = req.user._id;
    const { name } = req.body;
    const file = req.file;

    if (!file) {
      return res
        .status(400)
        .json({ success: false, message: "File mp3 is required" });
    }

    const uploaded = await uploadToCloudinary(file.buffer, "ringtone");
    const publicId = uploaded.public_id;

    const user = await userModel.findById(userId);

    const newRingtone = {
      name: name || file.originalname,
      url: publicId,
    };

    user.ringtones.push(newRingtone);
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Ringtone added successfully",
      data: newRingtone,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

const renameUserRingtone = async (req, res) => {
  try {
    const userId = req.user._id;
    const { ringtoneId } = req.params;
    const { name } = req.body;
    const user = await userModel.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const ringtone = user.ringtones.id(ringtoneId);
    if (!ringtone) {
      return res.status(404).json({
        success: false,
        message: "Ringtone not found",
      });
    }
    ringtone.name = name || ringtone.name;
    await user.save();
    return res.status(200).json({
      success: true,
      message: "Ringtone renamed successfully",
      data: ringtone,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

const deleteUserRingtone = async (req, res) => {
  try {
    const userId = req.user._id;
    const { ringtoneId } = req.params;

    const user = await userModel.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Tìm ringtone theo id trong mảng
    const ringtone = user.ringtones.id(ringtoneId);

    if (!ringtone) {
      return res.status(404).json({
        success: false,
        message: "Ringtone not found",
      });
    }

    const oldFileUrl = ringtone.url; // lưu URL trước khi xoá

    // Nếu ringtone đang active → clear active
    if (String(user.activeRingtone) === String(ringtoneId)) {
      user.activeRingtone = null;
    }

    // Xoá khỏi mảng
    ringtone.deleteOne(); // cách mới & sạch hơn pull()

    await user.save();

    await deleteFromCloudinary(oldFileUrl);

    return res.status(200).json({
      success: true,
      message: "Ringtone deleted successfully",
      data: ringtoneId,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message,
    });
  }
};

const setActiveRingtone = async (req, res) => {
  try {
    const userId = req.user._id;
    const { ringtoneId } = req.params;

    const user = await userModel.findById(userId);
    // kiểm tra ringtone có tồn tại không
    const ringtone = user.ringtones.id(ringtoneId);
    if (!ringtone) {
      return res
        .status(404)
        .json({ success: false, message: "Ringtone not found" });
    }

    user.activeRingtone = ringtoneId;
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Ringtone set as active",
      data: ringtoneId,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  setAvatar,
  setCoverPhoto,
  getUserProfile,
  getUserByName,
  sendFriendRequest,
  cancelFriendRequest,
  acceptFriendRequest,
  removeFriend,
  declineFriendRequest,
  getAllUsers,
  getFriendSuggestions,
  updateUserInfo,
  getUserProfileBySlug,
  getUserStats,
  getUserProgress,
  addUserRingtone,
  deleteUserRingtone,
  setActiveRingtone,
  renameUserRingtone,
};
