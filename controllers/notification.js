const { clients } = require("./sse");
const UserModel = require("../models/userModel");
const Notification = require("../models/notificationModel");

const createAndSendNotificationForFriend = async (
  actorId,
  type,
  postId = null,
  populatedPost = null
) => {
  const user = await UserModel.findById(actorId).select("friends fullName");
  if (!user) {
    throw new Error("User not found");
  }
  const notificationsToSave = [];
  for (const friendId of user.friends) {
    if (friendId.toString() === actorId.toString()) continue;

    const notification = new Notification({
      user: friendId,
      actor: actorId,
      type,
      post: postId,
      content: getNotificationContent(type, user.fullName),
      createdAt: new Date(),
    });

    const populatedNotification = await notification.populate(
      "actor",
      "fullName avatar"
    );

    const client = clients[friendId.toString()];
    if (client) {
      const data = JSON.stringify({
        type,
        notification: populatedNotification,
        post: populatedPost,
      });
      client.write(`data: ${data}\n\n`);
    }

    notificationsToSave.push(notification.save());
  }

  await Promise.all(notificationsToSave);
};

const getNotificationContent = (type, userName) => {
  switch (type) {
    case "like_post":
      return `${userName} đã thích bài viết của bạn.`;
    case "comment_post":
      return `${userName} đã bình luận về bài viết của bạn.`;
    case "new_post":
      return `${userName} vừa đăng một bài viết mới.`;
    case "friend_request":
      return `${userName} đã gửi cho bạn một lời mời kết bạn.`;
    case "accepted_request":
      return `${userName} đã chấp nhận lời mời kết bạn của bạn.`;
    default:
      return "";
  }
};

const getNotification = async (req, res) => {
  try {
    const userId = req.user._id;
    const notifications = await Notification.find({ user: userId })
      .sort({ createdAt: -1 })
      .limit(50)
      .populate("actor", "fullName avatar")
      .populate("post");

    res.status(200).json({
      success: true,
      data: notifications,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Lỗi khi lấy thông báo",
    });
  }
};

const markAsAllRead = async (req, res) => {
  try {
    const userId = req.user._id;
    await Notification.updateMany(
      { user: userId, isRead: false },
      { $set: { isRead: true } }
    );
    const updatedNotifications = await Notification.find({ user: userId }).sort(
      { createdAt: -1 }
    );

    res.status(200).json({
      success: true,
      message: "Đã đánh dấu tất cả thông báo là đã đọc",
      data: updatedNotifications,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Lỗi khi đánh dấu thông báo là đã đọc",
    });
  }
};

module.exports = {
  createAndSendNotificationForFriend,
  getNotification,
  markAsAllRead,
};
