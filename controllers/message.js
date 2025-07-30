const Message = require("../models/messageModel");
const { getAIResponse } = require("../services/gemini/client");

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
          _id: {
            $cond: [
              { $gt: ["$senderId", "$receiverId"] },
              { senderId: "$receiverId", receiverId: "$senderId" },
              { senderId: "$senderId", receiverId: "$receiverId" },
            ],
          },
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
          lastMessage: {
            text: "$lastMessage.text",
            createdAt: "$lastMessage.createdAt",
            isSentByMe: {
              $cond: {
                if: { $eq: ["$lastMessage.senderId", userId] },
                then: true,
                else: false,
              },
            },
          },
          senderId: "$lastMessage.senderId",
          receiverId: "$lastMessage.receiverId",
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

const generateAiResponse = async (req, res) => {
  const { prompt } = req.body;

  if (!prompt) {
    return res.status(400).json({ message: "Prompt is required" });
  }

  try {
    const response = await getAIResponse(prompt);
    return res.status(200).json({ success: true, data: response });
  } catch (error) {
    console.error("❌ generateAiResponse error:", error);
    return res.status(500).json({ message: "Failed to generate AI response" });
  }
};

module.exports = {
  getAllChats,
  generateAiResponse,
};
