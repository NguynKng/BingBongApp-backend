const { FRONTEND_URL } = require("../config/envVars");

const clients = {}; // Store clients as: { [userId]: res }

const sseHandler = (req, res) => {
  const userId = req.params.userId;
  if (!userId) {
    res.status(400).end("Missing userId");
    return;
  }

  // Set SSE headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("Access-Control-Allow-Origin", FRONTEND_URL);

  // Save client
  clients[userId] = res;

  const interval = setInterval(() => {
    const data = {
      message: `ping ${new Date().toISOString()}`,
      clients: Object.keys(clients),
    };
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  }, 15000); // ping every 15s

  // Remove client on disconnect
  req.on("close", () => {
    clearInterval(interval);
    delete clients[userId];
  });
};

module.exports = {
  sseHandler,
  clients,
};
