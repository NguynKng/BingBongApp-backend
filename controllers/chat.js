const chatModel = require("../models/chatModel");
const { emitToUser } = require("../sockets/chatSocket");
const { userSocketMap } = require("../sockets/chatSocket");

const getChatIdByUserId = async (req, res) => {
  const { userId } = req.params;
  const myUserId = req.user._id;

  try {
    let chat = await chatModel
      .findOne({
        participants: { $all: [myUserId, userId] },
        isGroup: false,
      })
      .populate("participants", "fullName avatar slug")
      .populate({
        path: "lastMessage",
        populate: { path: "sender", select: "fullName avatar slug" },
      });

    // If not exist => create new
    if (!chat) {
      const newChat = new chatModel({
        participants: [myUserId, userId],
        isGroup: false,
        createdBy: myUserId,
      });

      await newChat.save();

      chat = await chatModel
        .findById(newChat._id)
        .populate("participants", "fullName avatar slug")
        .populate({
          path: "lastMessage",
          populate: { path: "sender", select: "fullName avatar slug" },
        });
    }

    return res.status(200).json({ success: true, data: chat });
  } catch (error) {
    console.error("Error fetching chat:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const getChatById = async (req, res) => {
  const { chatId } = req.params;

  try {
    const chat = await chatModel
      .findById(chatId)
      .populate("participants", "fullName avatar slug")
      .populate({
        path: "lastMessage",
        populate: { path: "sender", select: "fullName avatar slug" },
      });

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: "Chat not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: chat,
    });
  } catch (error) {
    console.error("Error fetching chat by chatId:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const createGroupChat = async (req, res) => {
  try {
    const { userIds, groupName } = req.body;
    const myUserId = req.user._id;

    if (!groupName?.trim() || !userIds || userIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Group name and user IDs are required.",
      });
    }

    const participants = [...new Set([...userIds, myUserId])];

    const newGroupChat = new chatModel({
      participants,
      isGroup: true,
      createdBy: myUserId,
      groupName,
    });

    await newGroupChat.save();

    const fullGroupChat = await chatModel
      .findById(newGroupChat._id)
      .populate("participants", "fullName avatar slug")
      .populate({
        path: "lastMessage",
        populate: { path: "sender", select: "fullName avatar slug" },
      })
      .lean();

    fullGroupChat.participants.forEach((user) => {
      const uid = user._id.toString();
      if (userSocketMap[uid]) {
        emitToUser(uid, "newGroupChatAdd", {
          chat: fullGroupChat,
        });
      }
    });

    return res.status(200).json({ success: true, data: fullGroupChat });
  } catch (error) {
    console.error("Error creating group chat:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const getRecentChats = async (req, res) => {
  try {
    const userId = req.user._id;

    const chats = await chatModel
      .find({
        participants: { $in: [userId] },
        $or: [
          { isGroup: true }, // tất cả group
          { isGroup: false, lastMessage: { $ne: null } }, // chat 1-1 phải có lastMessage
        ],
      })
      .populate("participants", "fullName avatar slug")
      .populate({
        path: "lastMessage",
        populate: { path: "sender", select: "fullName avatar slug" },
      })
      .sort({ updatedAt: -1 });

    return res.status(200).json({
      success: true,
      data: chats,
    });
  } catch (error) {
    console.error("Error fetching recent chats:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

module.exports = {
  getChatIdByUserId,
  getChatById,
  createGroupChat,
  getRecentChats,
};
