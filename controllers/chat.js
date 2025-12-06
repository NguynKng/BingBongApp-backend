const chatModel = require("../models/chatModel");
const shopModel = require("../models/shopModel");
const { emitToUser } = require("../sockets/chatSocket");
const { userSocketMap } = require("../sockets/chatSocket");
const groupModel = require("../models/groupModel");

const getChatIdByTypeId = async (req, res) => {
  const { userId, shopId, fanpageId, groupId, type } = req.query; // flexible
  const myUserId = req.user._id;

  try {
    let filter = { type };
    let shouldCreate = true;

    switch (type) {
      case "private":
        if (!userId)
          return res
            .status(400)
            .json({ success: false, message: "Missing userId" });

        filter.participants = { $all: [myUserId, userId] };
        break;

      case "shop":
        if (!shopId)
          return res
            .status(400)
            .json({ success: false, message: "Missing shopId" });

        filter.shopId = shopId;
        filter.participants = { $all: [myUserId] }; // user ↔ shop owner (added later)
        break;

      case "shop_channel":
        if (!shopId)
          return res
            .status(400)
            .json({ success: false, message: "Missing shopId" });

        filter.shopId = shopId;
        shouldCreate = false; // channel tạo khi shop tạo → không auto create tại đây
        break;

      case "fanpage":
        if (!fanpageId)
          return res
            .status(400)
            .json({ success: false, message: "Missing fanpageId" });

        filter.fanpageId = fanpageId;
        break;

      default:
        return res
          .status(400)
          .json({ success: false, message: "Invalid chat type" });
    }

    // Tìm chat theo filter
    let chat = await chatModel
      .findOne(filter)
      .populate("participants", "fullName avatar slug")
      .populate("shopId", "name avatar slug owner")
      .populate("fanpageId", "name avatar slug")
      .populate({
        path: "lastMessage",
        populate: { path: "sender", select: "fullName avatar slug" },
      });

    // Nếu không tìm thấy → Tạo mới tùy loại
    if (!chat && shouldCreate) {
      let payload = {
        type,
        createdBy: myUserId,
        participants: [myUserId],
      };

      if (type === "private") {
        payload.participants.push(userId);
      }

      if (type === "shop") {
        payload.shopId = shopId;

        // Lấy owner
        const shop = await shopModel.findById(shopId).select("owner");
        if (!shop) {
          return res
            .status(404)
            .json({ success: false, message: "Shop not found" });
        }

        payload.participants.push(shop.owner);
      }

        if (type === "fanpage") {
          payload.fanpageId = fanpageId;

          const page = await groupModel.findById(fanpageId)
          if (!page) {
            return res
              .status(404)
              .json({ success: false, message: "Fanpage not found" });
          }
        }

      const newChat = await chatModel.create(payload);

      chat = await chatModel
        .findById(newChat._id)
        .populate("participants", "fullName avatar slug")
        .populate("shopId", "name avatar slug owner")
        .populate("fanpageId", "name avatar slug")
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
      .populate("shopId", "name avatar slug owner")
      .populate("fanpageId", "name avatar slug")
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
      type: "group",
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
          { type: "fanpage" },
          { type: "shop" },
          { type: "group" }, // tất cả group
          { type: "private", lastMessage: { $ne: null } }, // chat 1-1 phải có lastMessage
        ],
      })
      .populate("participants", "fullName avatar slug")
      .populate("shopId", "name avatar slug owner")
        .populate("fanpageId", "name avatar slug")
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
  getChatIdByTypeId,
  getChatById,
  createGroupChat,
  getRecentChats,
};
