const express = require("express");
const app = express();
const path = require("path");
const { PORT, FRONTEND_URL, EXPO_URL } = require("./config/envVars");
const connectDB = require("./config/dbConnect");
const cookieParser = require("cookie-parser");
const morgan = require("morgan");
const cors = require("cors");
const { setupSocket } = require("./sockets/chatSocket");
const http = require("http");

const corsOptions = {
  origin: [FRONTEND_URL, "http://192.168.2.245:5173", EXPO_URL], // Change this to your frontend's URL
  methods: ["GET", "POST", "PUT", "DELETE"], // Allowed HTTP methods
  credentials: true, // Allow credentials   
};

app.use(morgan("dev"));
app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());

// Serve static files from public directory (path already set up)
app.use(express.static(path.join(__dirname, "public")));

app.use("/api/v1", require("./routes/index"));

app.use("/", (req, res) => {
  res.send("API is running");
});

const server = http.createServer(app);

setupSocket(server); // <-- Setup socket with the server

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Server started at http://localhost:${PORT}`);
  connectDB();
});
