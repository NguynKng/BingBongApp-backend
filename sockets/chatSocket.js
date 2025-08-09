// sockets/chatSocket.js
const { Server } = require("socket.io");
const Message = require("../models/messageModel");
const { FRONTEND_URL } = require("../config/envVars");
const { setSocketInstance } = require("./socketInstance");

const userSocketMap = {};
const rooms = {};

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
  userSocketMap,
};
