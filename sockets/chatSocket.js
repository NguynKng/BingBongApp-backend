// sockets/chatSocket.js
const { Server } = require("socket.io");
const Message = require("../models/messageModel");
const User = require("../models/userModel");
const { FRONTEND_URL } = require("../config/envVars");
const { setSocketInstance } = require("./socketInstance")

function setupSocket(server) {
  const io = new Server(server, {
    cors: {
      origin: FRONTEND_URL,
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  const userSocketMap = {}; // { userId: socketId }
  setSocketInstance(io);

  io.on("connection", (socket) => {
    console.log(`[SOCKET CONNECTED] ${socket.id}`);

    socket.on("setup", (userId) => {
      if (!userId) return;
      userSocketMap[userId] = socket.id;
      socket.join(userId);
      console.log(`[USER ONLINE] UserId ${userId} connected`);

      // Send list of online users to the newly connected user
      socket.emit("getOnlineUsers", Object.keys(userSocketMap));

      // Broadcast updated list to all clients
      io.emit("getOnlineUsers", Object.keys(userSocketMap));
    });

    socket.on("loadChatHistory", async ({ userId1, userId2 }) => {
      if (!userId1 || !userId2) return;
      try {
        const messages = await Message.find({
          $or: [
            { senderId: userId1, receiverId: userId2 },
            { senderId: userId2, receiverId: userId1 },
          ],
        }).sort({ timestamp: 1 });

        socket.emit("loadChatHistory", messages);
        console.log(`[LOAD HISTORY] ${messages.length} messages sent`);
      } catch (error) {
        console.error("[LOAD HISTORY ERROR]:", error);
      }
    });

    socket.on(
      "sendMessage",
      async ({ senderId, receiverId, text, createdAt }) => {
        try {
          console.log(`[SEND MESSAGE] ${senderId} -> ${receiverId}: ${text}`);

          const newMessage = await Message.create({
            senderId,
            receiverId,
            text,
            createdAt: new Date(createdAt),
          });

          const messagePayload = {
            _id: newMessage._id,
            senderId,
            receiverId,
            text,
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
          const sender = await User.findById(senderId).select(
            "_id fullName avatar"
          );
          const receiver = await User.findById(receiverId).select(
            "_id fullName avatar"
          );

          // Send recent chat info
          const recentMessage = {
            lastMessage: {
              text: newMessage.text,
              createdAt: newMessage.createdAt,
            },
            senderId,
            receiverId,
          };

          io.to(receiverId).emit('getNewMessage', {
            _id: sender?._id,
            fullName: sender?.fullName,
            avatar: sender?.avatar
          })

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
        } catch (error) {
          console.error("[SEND MESSAGE ERROR]:", error);
        }
      }
    );

    socket.on("disconnect", () => {
      console.log(`[SOCKET DISCONNECTED] ${socket.id}`);
      for (const userId in userSocketMap) {
        if (userSocketMap[userId] === socket.id) {
          delete userSocketMap[userId];
          break;
        }
      }

      // Broadcast updated online users list
      io.emit("getOnlineUsers", Object.keys(userSocketMap));
    });
  });
}

module.exports = setupSocket;
