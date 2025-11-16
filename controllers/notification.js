const UserModel = require("../models/userModel");
const Notification = require("../models/notificationModel");
const { emitToUser } = require("../sockets/chatSocket");

const sendNotificationToUser = async (
  targetUserId,
  actorId,
  type,
  postId = null
) => {
  const actor = await UserModel.findById(actorId).select(
    "fullName avatar slug"
  );
  if (!actor) throw new Error("Actor not found");

  const notification = new Notification({
    user: targetUserId,
    actor: actorId,
    type,
    post: postId,
    content: getNotificationContent(type),
    createdAt: new Date(),
  });

  await notification.save();

  // Populate actor sau khi save
  const populatedNotification = await Notification.findById(notification._id)
    .populate("actor", "fullName avatar slug")
    .lean();

  //   const io = getSocketInstance();
  //   io.to(targetUserId).emit("new_notification", {
  //     notification: populatedNotification,
  //   });
  emitToUser(targetUserId, "new_notification", {
    notification: populatedNotification,
  });
};

const createAndSendNotificationForFriend = async (
  actorId,
  type,
  postId = null
) => {
  const user = await UserModel.findById(actorId).select("friends");
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
      content: getNotificationContent(type),
      createdAt: new Date(),
    });

    const populatedNotification = await notification.populate(
      "actor",
      "fullName avatar slug"
    );

    // const io = getSocketInstance();
    // io.to(friendId.toString()).emit("new_notification", {
    //   notification: populatedNotification,
    // });
    emitToUser(friendId.toString(), "new_notification", {
      notification: populatedNotification,
    });

    notificationsToSave.push(notification.save());
  }

  await Promise.all(notificationsToSave);
};

const getNotificationContent = (type) => {
  switch (type) {
    case "react_post":
      return `đã thả cảm xúc vào bài viết của bạn.`;
    case "comment_post":
      return `đã bình luận về bài viết của bạn.`;
    case "new_post":
      return `vừa đăng một bài viết mới.`;
    case "friend_request":
      return `đã gửi cho bạn một lời mời kết bạn.`;
    case "accepted_request":
      return `đã chấp nhận lời mời kết bạn của bạn.`;
    default:
      return "";
  }
};

const getNotification = async (req, res) => {
  try {
    const userId = req.user._id;
    const page = parseInt(req.query.page) || 1; // Mặc định page = 1 nếu không truyền

    const limit = 10;
    const skip = (page - 1) * limit;

    const notifications = await Notification.find({ user: userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("actor", "fullName avatar slug");

    const total = await Notification.countDocuments({ user: userId });

    res.status(200).json({
      success: true,
      data: notifications,
      pagination: {
        total,
        page,
        totalPages: Math.ceil(total / limit),
        hasMore: skip + limit < total,
      },
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
    const updatedNotifications = await Notification.find({ user: userId })
      .sort({ createdAt: -1 })
      .populate("actor", "fullName avatar slug");

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
  sendNotificationToUser,
  createAndSendNotificationForFriend,
  getNotification,
  markAsAllRead,
};
