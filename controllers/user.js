const userModel = require("../models/userModel");
const { removeDiacritics } = require("../helper/helper");
const { sendNotificationToUser } = require("../controllers/notification");

// Set avatar for user
const setAvatar = async (req, res) => {
  try {
    if (!req.file) {
      return res
        .status(400)
        .json({ success: false, message: "No file uploaded" });
    }

    const userId = req.user._id;
    const fileName = req.file.filename;
    const avatarPath = `/uploads/user/${userId}/avatar/${fileName}`;

    // Update user avatar in database
    const updatedUser = await userModel
      .findByIdAndUpdate(userId, { avatar: avatarPath }, { new: true })
      .select("-password");

    if (!updatedUser) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Avatar updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    console.error("Set avatar error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Something went wrong" });
  }
};

// Set cover photo for user
const setCoverPhoto = async (req, res) => {
  try {
    if (!req.file) {
      return res
        .status(400)
        .json({ success: false, message: "No file uploaded" });
    }

    const userId = req.user._id;
    const fileName = req.file.filename;
    const coverPhotoPath = `/uploads/user/${userId}/cover_photo/${fileName}`;

    // Update user cover photo in database
    const updatedUser = await userModel
      .findByIdAndUpdate(userId, { coverPhoto: coverPhotoPath }, { new: true })
      .select("-password");

    if (!updatedUser) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Cover photo updated successfully",
      user: updatedUser,
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
        select: "fullName avatar", // chỉ lấy các field cần thiết
      })
      .populate({
        path: "friendRequests",
        select: "fullName avatar",
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

const getUserByName = async (req, res) => {
  try {
    const { name } = req.query;

    if (!name || name.trim() === "") {
      return res
        .status(400)
        .json({ success: false, message: "Name query is required" });
    }

    const normalizedInput = removeDiacritics(name.toLowerCase());

    const users = await userModel.find().select("fullName email avatar"); // exclude password

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
        message: "Không thể gửi lời mời cho chính mình",
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
      return res
        .status(400)
        .json({ success: false, message: "Đã gửi lời mời hoặc đã là bạn" });
    }

    receiver.friendRequests.push(senderId);
    await receiver.save();

    const updatedSender = await userModel
      .findById(senderId)
      .select("-password");
    await sendNotificationToUser(receiverId, senderId, "friend_request");

    return res.status(200).json({
      success: true,
      message: "Đã gửi lời mời kết bạn",
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
      message: "Đã hủy lời mời kết bạn",
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
        .json({ success: false, message: "Không có lời mời kết bạn" });
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
    await sendNotificationToUser(senderId, receiverId, "f");

    return res.status(200).json({
      success: true,
      message: "Đã chấp nhận lời mời kết bạn",
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
        .json({ success: false, message: "Không có lời mời kết bạn" });
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
      message: "Đã từ chối lời mời kết bạn",
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
      message: "Đã hủy kết bạn",
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
        "_id email avatar fullName createdAt isVerified block role gender phoneNumber"
      );
    return res
      .status(200)
      .json({ success: true, data: users });
  } catch (error) {
    console.error("Get all users error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Something went wrong" });
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
};
