// sockets/chatSocket.js
const { Server } = require("socket.io");
const { FRONTEND_URL, TURN_HOST, TURN_PORT, TURN_SECRET } = require("../config/envVars");
const { setSocketInstance } = require("./socketInstance");
const crypto = require("crypto");

// userId -> Set(socketId)
const userSocketMap = {};
// roomId -> Set(socketId)
const rooms = {};

function addUserSocket(userId, socketId) {
  if (!userSocketMap[userId]) userSocketMap[userId] = new Set();
  userSocketMap[userId].add(socketId);
}
function removeUserSocket(userId, socketId) {
  if (!userSocketMap[userId]) return;
  userSocketMap[userId].delete(socketId);
  if (userSocketMap[userId].size === 0) delete userSocketMap[userId];
}
function getSocketsByUser(userId) {
  return userSocketMap[userId] ? Array.from(userSocketMap[userId]) : [];
}

function addRoomSocket(roomId, socketId) {
  if (!rooms[roomId]) rooms[roomId] = new Set();
  rooms[roomId].add(socketId);
}
function removeRoomSocket(roomId, socketId) {
  if (!rooms[roomId]) return;
  rooms[roomId].delete(socketId);
  if (rooms[roomId].size === 0) delete rooms[roomId];
}

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

    // OPTIONAL: validate token here (socket.handshake.auth.token) for security
    // io.use((socket, next) => { ... });

    socket.on("setup", (userId) => {
      if (!userId) return;
      // store on socket for later use
      socket.data.userId = userId;

      addUserSocket(userId, socket.id);
      socket.join(userId);

      console.log(`[USER ONLINE] ${userId} -> ${socket.id}`);

      // Send list of online users to the newly connected user
      socket.emit("getOnlineUsers", Object.keys(userSocketMap));
      // Broadcast updated list to all clients
      io.emit("getOnlineUsers", Object.keys(userSocketMap));
    });

    // Request TURN credentials via socket (echo requestId if provided)
    socket.on("request-turn", (payload = {}) => {
      const userId = socket.data.userId || payload.userId || "anonymous";
      const requestId = payload.requestId;

      if (TURN_HOST && TURN_SECRET) {
        const ttl = parseInt(payload.ttl || "600", 10);
        const unixTs = Math.floor(Date.now() / 1000);
        const exp = unixTs + ttl;
        const username = `${exp}:${userId}`;
        const hmac = crypto.createHmac("sha1", TURN_SECRET);
        hmac.update(username);
        const credential = hmac.digest("base64");
        const urls = [
          `turn:${TURN_HOST}:${TURN_PORT}?transport=udp`,
          `turn:${TURN_HOST}:${TURN_PORT}?transport=tcp`,
        ];
        socket.emit("turn-credentials", {
          requestId,
          data: { iceServers: [{ urls, username, credential }] },
          ttl,
        });
      } else {
        socket.emit("turn-credentials", {
          requestId,
          data: { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] },
        });
      }
    });

    // Call flow
    socket.on("call-user", ({ to, from, callId, metadata }) => {
      if (!to) return;
      const targets = getSocketsByUser(to);
      if (targets.length === 0) {
        socket.emit("call-rejected", { reason: "user-offline", callId });
        return;
      }
      io.to(from).emit("call-initiated", { to, callId, metadata });
      // Notify callee sockets
      targets.forEach((sid) => {
        io.to(sid).emit("incoming-call", { from, callId, metadata });
      });

      // OPTIONAL: set server-side timeout to auto-reject if no response in X seconds
      // setTimeout(() => { io.to(callerSocketId).emit('call-timeout', { callId }) }, 30000);
    });

    socket.on("accept-call", ({ to /* caller userId */, from /* callee userId */, callId }) => {
      const callers = getSocketsByUser(to);
      // provide roomId = callId so both can join the same room
      callers.forEach((sid) => io.to(sid).emit("call-accepted", { from, callId }));
    });

    socket.on("reject-call", ({ to, from, callId, reason }) => {
      const callers = getSocketsByUser(to);
      callers.forEach((sid) => io.to(sid).emit("call-rejected", { from, callId, reason }));
    });

    // Join/leave room & signaling
    socket.on("join", ({ roomId, userId }) => {
      if (!roomId) return;
      socket.join(roomId);
      socket.data.roomId = roomId;
      addRoomSocket(roomId, socket.id);

      const count = rooms[roomId].size;
      io.to(socket.id).emit("room-info", { count });
      socket.to(roomId).emit("peer-joined", { socketId: socket.id, userId });
      console.log(`[JOIN] ${userId} joined room ${roomId} (count=${count})`);
    });

    socket.on("offer", ({ roomId, sdp }) => {
      socket.to(roomId).emit("offer", { sdp, from: socket.id });
    });
    socket.on("answer", ({ roomId, sdp }) => {
      socket.to(roomId).emit("answer", { sdp, from: socket.id });
    });
    socket.on("ice-candidate", ({ roomId, candidate }) => {
      socket.to(roomId).emit("ice-candidate", { candidate, from: socket.id });
    });

    socket.on("end-call", ({ roomId }) => {
      socket.to(roomId).emit("end-call", { from: socket.id });
    });

    socket.on("leave", ({ roomId }) => {
      socket.leave(roomId);
      removeRoomSocket(roomId, socket.id);
      socket.to(roomId).emit("peer-left", { socketId: socket.id });
    });

    socket.on("disconnect", () => {
      console.log(`[SOCKET DISCONNECTED] ${socket.id}`);
      // remove from userSocketMap
      const uid = socket.data.userId;
      if (uid) removeUserSocket(uid, socket.id);

      // remove from any rooms map
      for (const rId in rooms) {
        if (rooms[rId].has(socket.id)) {
          rooms[rId].delete(socket.id);
          socket.to(rId).emit("peer-left", { socketId: socket.id });
          if (rooms[rId].size === 0) delete rooms[rId];
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
