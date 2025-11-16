// sockets/chatSocket.js
const { Server } = require("socket.io");
const {
  FRONTEND_URL,
  TURN_HOST,
  TURN_PORT,
  TURN_SECRET,
} = require("../config/envVars");
const { setSocketInstance, getSocketInstance } = require("./socketInstance");
const crypto = require("crypto");

// userId -> Set(socketId)
const userSocketMap = {};
// roomId -> Set(socketId)
const rooms = {};
const pendingCalls = new Map();

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

function emitToUser(userId, event, payload) {
    const io = getSocketInstance();
    const sids = getSocketsByUser(userId) || [];
    sids.forEach((sid) => io.to(sid).emit(event, payload));
  }

// dọn dẹp 1 pending call
function clearPending(callId) {
  const entry = pendingCalls.get(callId);
  if (!entry) return;
  try {
    clearTimeout(entry.timeout);
  } catch {}
  pendingCalls.delete(callId);
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
    socket.on("call-user", ({ to, from, callId, metadata, toData }) => {
      if (!to || !from || !callId) return;
      emitToUser(from, "call-initiated", { to, callId, toData });
      // Notify callee sockets
      emitToUser(to, "incoming-call", { from, callId, metadata });

      // Lập timeout 30s nếu chưa ai phản hồi
      const timeout = setTimeout(() => {
        // Nếu còn pending -> bắn timeout cho cả 2 và dọn dẹp
        if (pendingCalls.has(callId)) {
          emitToUser(from, "call-timeout", { callId });
          emitToUser(to, "call-timeout", { callId });
          clearPending(callId);
        }
      }, 30000);

      // Lưu trạng thái chờ
      pendingCalls.set(callId, { from, to, timeout });
    });

    socket.on(
      "accept-call",
      ({
        to /* caller userId */,
        from /* callee userId */,
        callId,
        metadata,
      }) => {
        if (!callId) return;

        const entry = pendingCalls.get(callId);
        // Nếu có pending -> dọn dẹp timeout
        if (entry) clearPending(callId);

        // Thông báo cho caller (tất cả thiết bị)
        emitToUser(to, "call-accepted", { from, callId, metadata });
      }
    );

    socket.on("reject-call", ({ to, from, callId, reason }) => {
      if (!callId) return;

      const entry = pendingCalls.get(callId);
      if (entry) clearPending(callId);

      // Thông báo cho phía đối tác
      emitToUser(to, "call-rejected", { from, callId, reason });
    });

    // ---------- Room / signaling handlers ----------
    socket.on("join-room", (roomId) => {
      if (!roomId) return;
      socket.join(roomId);
      addRoomSocket(roomId, socket.id);
      const count = rooms[roomId] ? rooms[roomId].size : 0;
      console.log(`[join-room] ${socket.id} joined ${roomId} (count=${count})`);

      // send room info to the joining socket
      io.to(socket.id).emit("room-info", { count });

      // notify others in room that a peer joined
      socket.to(roomId).emit("peer-joined", {
        socketId: socket.id,
        userId: socket.data.userId || null,
      });
    });

    // generic signal forward (simple-peer)
    socket.on("signal", ({ roomId, data, fromUserId }) => {
      if (!roomId || !data) return;
      socket.to(roomId).emit("signal", {
        data,
        from: fromUserId || socket.data.userId || null,
      });
    });
    socket.on("audio-toggle", ({ roomId, userId, audioOn }) => {
      // forward tới mọi socket trong room (trừ sender)
      socket.to(roomId).emit("peer-audio-toggle", { userId, audioOn });
    });

    // inside io.on("connection", socket => { ... })
    socket.on("video-toggle", ({ roomId, userId, videoOn }) => {
      if (!roomId) return;
      // broadcast to others in room
      socket.to(roomId).emit("peer-video-toggle", { userId, videoOn });
    });

    socket.on("transcript", ({ roomId, userId, text, isFinal }) => {
      // broadcast cho tất cả trong room (trừ sender) hoặc cho roomId
      socket.to(roomId).emit("transcript", { roomId, userId, text, isFinal });
    });

    socket.on("translated", ({ roomId, userId, translation, original }) => {
      // broadcast cho tất cả trong room (trừ sender) hoặc cho roomId
      socket
        .to(roomId)
        .emit("translated", { roomId, userId, translation, original });
    });

    // end call / leave room
    socket.on("end-call", ({ roomId, from }) => {
      if (!roomId) return;
      socket.to(roomId).emit("end-call", { from });
      removeRoomSocket(roomId, socket.id);
      socket.leave(roomId);
    });

    socket.on("leave", ({ roomId }) => {
      if (!roomId) return;
      removeRoomSocket(roomId, socket.id);
      socket.leave(roomId);
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
  emitToUser
};
