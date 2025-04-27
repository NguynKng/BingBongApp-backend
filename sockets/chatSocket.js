// sockets/chatSocket.js
const { Server } = require("socket.io");
const Message = require("../models/messageModel"); // Import Message model
const { FRONTEND_URL } = require("../config/envVars");
const User = require("../models/userModel") // Import frontend URL from envVars // Log the frontend URL for debugging

function setupSocket(server) {
  const io = new Server(server, {
    cors: {
      origin: FRONTEND_URL,
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    console.log("New client connected:", socket.id);

    socket.on("joinRoom", async (roomId) => {
      socket.join(roomId);
      console.log(`Socket ${socket.id} joined room ${roomId}`);

      try {
        const messages = await Message.find({ roomId }).sort({ createdAt: 1 });
        // Gửi lịch sử chat về cho client
        socket.emit("loadChatHistory", messages);
      } catch (error) {
        console.error("Error loading chat history:", error.message);
      }
    });

    socket.on("sendMessage", async (data) => {
      const { roomId, senderId, receiverId, text } = data;
      console.log(`${senderId} sent a message to ${receiverId}: ${text}`);
      try {
        // Lưu tin nhắn vào database
        const message = await Message.create({
          senderId,
          receiverId,
          text,
          roomId,
        });

        // Emit tin nhắn mới cho tất cả người trong phòng (trừ người gửi)
        socket.to(roomId).emit("receiveMessage", {
          _id: message._id,
          senderId: message.senderId,
          receiverId: message.receiverId,
          text: message.text,
          roomId: message.roomId,
          timestamp: message.createdAt,
        });
        socket.emit("receiveMessage", {
          _id: message._id,
          senderId: message.senderId,
          receiverId: message.receiverId,
          text: message.text,
          roomId: message.roomId,
          timestamp: message.createdAt,
        });
        const sender = await User.findById(senderId).select('_id fullName avatar');
        const receiver = await User.findById(receiverId).select('_id fullName avatar');
        socket.to(roomId).emit("newMessage", {
          roomId: message.roomId,
          lastMessage: {
            text: message.text,
            createdAt: message.createdAt,
          },
          participant: {
            _id: sender._id,
            fullName: sender.fullName,
            avatar: sender.avatar,
          },
          senderId: senderId,
            receiverId: receiverId,
        });
        socket.emit("newMessage", {
          roomId: message.roomId,
          lastMessage: {
            text: message.text,
            createdAt: message.createdAt,
          },
          participant: {
            _id: receiver._id,
            fullName: receiver.fullName,
            avatar: receiver.avatar,
          },
          senderId: senderId,
            receiverId: receiverId,
        });
      } catch (error) {
        console.error("Error sending message:", error.message);
      }
    });

    socket.on("disconnect", () => {
      console.log("Client disconnected:", socket.id);
    });
  });
}

module.exports = setupSocket;
