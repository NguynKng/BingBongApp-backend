const UserModel = require("../models/userModel");
const Notification = require("../models/notificationModel");
const { emitToUser } = require("../sockets/chatSocket");

const sendNotification = async (userIds, actorId, type, data = {}) => {
  if (!userIds) return;

  // Convert thành array
  const receivers = Array.isArray(userIds) ? userIds : [userIds];

  // Lấy actor 1 lần
  const actor = await UserModel.findById(actorId).select(
    "fullName avatar slug"
  );
  if (!actor) throw new Error("Actor not found");

  const content = getNotificationContent(type);

  // Build documents
  const docs = receivers.map((uid) => ({
    user: uid,
    actor: actorId,
    type,
    content,
    data,
  }));

  // Insert 1 lần cho tất cả → NHANH
  const inserted = await Notification.insertMany(docs);

  // Populate 1 lần
  const populated = await Notification.find({
    _id: { $in: inserted.map((n) => n._id) },
  })
    .populate("actor", "fullName avatar slug")
    .lean();

  // Emit socket cho từng user
  populated.forEach((notif) => {
    emitToUser(notif.user.toString(), "new_notification", {
      notification: notif,
    });
  });

  return populated;
};

/**
 * Gửi thông báo cho tất cả bạn bè khi user đăng bài
 */
const sendNotificationToFriends = async (actorId, type, data) => {
  const user = await UserModel.findById(actorId).select("friends");
  if (!user) throw new Error("User not found");

  const friendIds = user.friends.filter(
    (id) => id.toString() !== actorId.toString()
  );

  return sendNotification(friendIds, actorId, type, data);
};

/**
 * Nội dung thông báo
 */
const getNotificationContent = (type) => {
  switch (type) {
    case "react_post":
      return `reacted to your post.`;
    case "comment_post":
      return `commented on your post.`;
    case "reply_comment":
      return `replied to your comment.`;
    case "new_post":
      return `posted a new status.`;
    case "tagged_in_post":
      return `tagged you in a post.`;
    case "friend_request":
      return `sent you a friend request.`;
    case "accepted_request":
      return `accepted your friend request.`;
    case "new_shop_follower":
      return `started following your shop.`;
    case "new_order":
      return `placed a new order.`;
    case "accepted_order":
      return `accepted your order.`;
    case "shipping_order":
      return `marked your order as shipping.`;
    case "received_order":
      return `indicated they have received your order.`;
    case "shop_cancelled_order":
      return `cancelled your order.`;
    case "user_cancelled_order":
      return `cancelled their order.`;
    case "group_join_request":
      return `requested to join your group.`;
    case "group_new_member":
      return `joined your group.`;
    case "accepted_join_request":
      return `accepted your request to join the group.`;
    case "like_short":
      return `liked your short.`;
    case "comment_short":
      return `commented on your short.`;
    case "reply_comment_short":
      return `replied to your comment on a short.`;
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
      message: "Failed to get notifications",
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
      message: "All notifications marked as read.",
      data: updatedNotifications,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error marking notifications as read.",
    });
  }
};

module.exports = {
  sendNotification,
  sendNotificationToFriends,
  getNotification,
  markAsAllRead,
};
