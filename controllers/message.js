const Message = require("../models/messageModel");
const { getAIResponse } = require("../services/gemini/client");
const { userSocketMap } = require("../sockets/chatSocket");
const axios = require("axios");
const { BACKEND_AI_PYTHON_URL } = require("../config/envVars");
const { emitToUser } = require("../sockets/chatSocket");
const Chat = require("../models/chatModel");
const { uploadToCloudinary } = require("../services/cloudinary/upload");

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
  try {
    const { text, chatId } = req.body;
    const senderId = req.user._id;

    let targetChatId = chatId;

    // ======================================================
    // 🔥 2. Upload media (nếu có)
    // ======================================================
    const mediaPaths = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const uploaded = await uploadToCloudinary(
          file.buffer,
          "message"
        );
        mediaPaths.push(uploaded.public_id);
      }
    }

    // ======================================================
    // 🔥 3. Tạo tin nhắn
    // ======================================================
    const newMessage = await Message.create({
      chatId: targetChatId,
      sender: senderId,
      text: text || "",
      media: mediaPaths,
    });

    // ======================================================
    // 🔥 4. Cập nhật lastMessage vào Chat
    // ======================================================
    await Chat.findByIdAndUpdate(targetChatId, {
      lastMessage: newMessage._id,
      updatedAt: new Date(),
    });

    // ======================================================
    // 🔥 5. Populate message để trả về + emit
    // ======================================================
    const fullMessage = await Message.findById(newMessage._id)
      .populate("sender", "fullName avatar slug")
      .populate("chatId");

    // ======================================================
    // 🔥 6. Emit socket tới tất cả participants
    // ======================================================
    const chat = await Chat.findById(targetChatId)
      .populate("participants", "fullName avatar slug")
      .populate("shopId", "name slug avatar owner")
        .populate("fanpageId", "name slug avatar")
      .populate({
        path: "lastMessage",
        populate: { path: "sender", select: "fullName avatar slug" },
      });

    chat.participants.forEach((user) => {
      const uid = user._id.toString();
      if (userSocketMap[uid]) {
        if (uid !== senderId.toString()) {
          emitToUser(uid, "getNewMessage", {
            chat
          });
        }
        emitToUser(uid, "receiveMessage", fullMessage);
        emitToUser(uid, "newMessage", {
          chat,
        });
      }
    });

    return res.status(201).json({
      success: true,
      data: fullMessage,
    });
  } catch (error) {
    console.error("❌ sendMessage error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to send message",
    });
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

const getHistoryChat = async (req, res) => {
  const { chatId } = req.params;
  try {
    const messages = await Message.find({ chatId })
      .populate("sender", "fullName avatar slug")
      .populate("chatId")
      .sort({ createdAt: 1 });
    return res.status(200).json({ success: true, data: messages });
  } catch (error) {
    console.error("❌ getHistoryChat error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = {
  generateAiResponse,
  sendMessage,
  getHistoryChat,
  translateText,
};
