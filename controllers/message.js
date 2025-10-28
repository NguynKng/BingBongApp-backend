const Message = require("../models/messageModel");
const { getAIResponse } = require("../services/gemini/client");
const { getSocketInstance } = require("../sockets/socketInstance");
const { userSocketMap } = require("../sockets/chatSocket");
const User = require("../models/userModel");
const fs = require("fs");
const path = require("path");
const { ensureDirectoryExists } = require("../middleware/upload");
const axios = require("axios");
const { BACKEND_AI_PYTHON_URL } = require("../config/envVars");

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
            media: "$lastMessage.media",
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

const getHistoryChat = async (req, res) => {
  try {
    const userId = req.user._id;
    const { userChatId } = req.params;
    if (!userChatId) {
      return res.status(400).json({ message: "User chat ID is required" });
    }
    const messages = await Message.find({
      $or: [
        { senderId: userId, receiverId: userChatId },
        { senderId: userChatId, receiverId: userId },
      ],
    }).sort({ timestamp: 1 });

    return res.status(200).json({ success: true, data: messages });
  } catch (error) {
    console.error("❌ getHistoryChat error:", error);
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

const sendMessage = async (req, res) => {
  const io = getSocketInstance();
  const { senderId, receiverId, text } = req.body;
  if (!senderId || !receiverId) {
    return res
      .status(400)
      .json({ message: "Sender, receiver and text are required" });
  }
  try {
    const mediaPaths = [];
    // Process uploaded files if there are any
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const tempPath = file.path;
        const fileName = path.basename(tempPath);

        // Move the file
        if (fs.existsSync(tempPath)) {
          mediaPaths.push(`/uploads/messages-images/${fileName}`);
        }
      }
    }
    const newMessage = await Message.create({
      senderId,
      receiverId,
      text,
      media: mediaPaths,
      createdAt: new Date(),
    });

    const messagePayload = {
      _id: newMessage._id,
      senderId,
      receiverId,
      text,
      media: newMessage.media || [],
      createdAt: newMessage.createdAt,
    };
    // Emit to receiver if online
    if (userSocketMap[receiverId]) {
      io.to(receiverId).emit("receiveMessage", messagePayload);
    }

    // Emit to sender if online
    if (userSocketMap[senderId]) {
      io.to(senderId).emit("receiveMessage", messagePayload);
    }

    // Lookup sender/receiver user data
    const sender = await User.findById(senderId).select("_id fullName avatar slug");
    const receiver = await User.findById(receiverId).select(
      "_id fullName avatar slug"
    );

    // Send recent chat info
    const recentMessage = {
      lastMessage: {
        media: newMessage.media || [],
        text: newMessage.text,
        createdAt: newMessage.createdAt,
      },
      senderId,
      receiverId,
    };

    io.to(receiverId).emit("getNewMessage", {
      _id: sender?._id,
      fullName: sender?.fullName,
      avatar: sender?.avatar,
        slug: sender?.slug,
    });

    if (userSocketMap[receiverId]) {
      io.to(receiverId).emit("newMessage", {
        ...recentMessage,
        participant: {
          _id: sender?._id,
          fullName: sender?.fullName,
          avatar: sender?.avatar,
        },
      });
    }

    if (userSocketMap[senderId]) {
      io.to(senderId).emit("newMessage", {
        ...recentMessage,
        participant: {
          _id: receiver?._id,
          fullName: receiver?.fullName,
          avatar: receiver?.avatar,
        },
      });
    }
    return res.status(201).json({
      success: true,
      message: "Message sent successfully",
    });
  } catch (error) {
    console.error("❌ sendMessage error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to send message" });
  }
};

const translateText = async (req, res) => {
  const { text } = req.body;
  try {
    const response = await axios.post(
      `${BACKEND_AI_PYTHON_URL}/translate-text`,
      {
        text,
      }
    );
    return res.json(response.data);
  } catch (error) {
    console.error("❌ translateText error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to translate text" });
  }
};

module.exports = {
  getAllChats,
  generateAiResponse,
  sendMessage,
  getHistoryChat,
  translateText,
};
