// sockets/chatSocket.js
const { Server } = require("socket.io");
const Message = require("../models/messageModel");
const { FRONTEND_URL } = require("../config/envVars");
const { setSocketInstance } = require("./socketInstance")

const userSocketMap = {};

function setupSocket(server) {
  const io = new Server(server, {
    cors: {
      origin: FRONTEND_URL,
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

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

module.exports = {
  setupSocket,
  userSocketMap
};
