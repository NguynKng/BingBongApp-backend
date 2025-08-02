const Message = require("../models/messageModel");
const { getAIResponse } = require("../services/gemini/client");
const { getSocketInstance } = require("../sockets/socketInstance");
const { userSocketMap } = require("../sockets/chatSocket");
const User = require("../models/userModel");
const fs = require("fs");
const path = require("path");
const { ensureDirectoryExists } = require("../middleware/upload");

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
    const newMessage = await Message.create({
      senderId,
      receiverId,
      text,
      createdAt: new Date(),
    });
    // Process uploaded files if there are any
    if (req.files && req.files.length > 0) {
      try {
        // Create directory for post images with postId
        const uploadDir = path.join(
          __dirname,
          "..",
          "public",
          "uploads",
          "messages-images"
        );
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }

        // Move files from temp directory to final location
        const mediaPaths = [];

        for (const file of req.files) {
          const tempPath = file.path;
          const fileName = path.basename(tempPath);
          const targetPath = path.join(uploadDir, fileName);

          // Move the file
          if (fs.existsSync(tempPath)) {
            // Create the target directory if it doesn't exist
            ensureDirectoryExists(path.dirname(targetPath));

            // Copy the file to the new location
            fs.copyFileSync(tempPath, targetPath);

            // Delete the original file
            fs.unlinkSync(tempPath);

            // Add the path to our array
            mediaPaths.push(`/uploads/messages-images/${fileName}`);
          }
        }

        // Add media paths to the post
        newMessage.media = mediaPaths;
        await newMessage.save();
      } catch (error) {
        console.error("Error processing uploaded files:", error);
      }
    }
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
    const sender = await User.findById(senderId).select("_id fullName avatar");
    const receiver = await User.findById(receiverId).select(
      "_id fullName avatar"
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

module.exports = {
  getAllChats,
  generateAiResponse,
  sendMessage,
};
