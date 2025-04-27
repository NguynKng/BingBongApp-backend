const Message = require("../models/messageModel");

const getAllChats = async (req, res) => {
  try {
    const userId = req.user._id;

    const chats = await Message.aggregate([
      {
        $match: {
          $or: [{ senderId: userId }, { receiverId: userId }],
        },
      },
      {
        $sort: { createdAt: -1 },
      },
      {
        $group: {
          _id: "$roomId",
          lastMessage: { $first: "$$ROOT" },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "lastMessage.senderId",
          foreignField: "_id",
          as: "sender",
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "lastMessage.receiverId",
          foreignField: "_id",
          as: "receiver",
        },
      },
      {
        $project: {
          roomId: "$_id",
          lastMessage: {
            text: "$lastMessage.text",
            createdAt: "$lastMessage.createdAt",
            isSentByMe: { $eq: ["$lastMessage.senderId", userId] },
          },
          participant: {
            $cond: {
              if: { $eq: ["$lastMessage.senderId", userId] },
              then: {
                _id: { $arrayElemAt: ["$receiver._id", 0] },
                fullName: { $arrayElemAt: ["$receiver.fullName", 0] },
                avatar: { $arrayElemAt: ["$receiver.avatar", 0] },
              },
              else: {
                _id: { $arrayElemAt: ["$sender._id", 0] },
                fullName: { $arrayElemAt: ["$sender.fullName", 0] },
                avatar: { $arrayElemAt: ["$sender.avatar", 0] },
              },
            },
          },
        },
      },
      {
        $sort: { "lastMessage.createdAt": -1 },
      },
    ]);

    return res.status(200).json({ success: true, data: chats });
  } catch (error) {
    console.error("❌ getRecentChats error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = {
    getAllChats,
    getMessagesByRoomId,
}
