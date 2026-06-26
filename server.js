import "dotenv/config";
import express from "express";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";
import connectDB from "./config/db.js";

// Import your routes
import authRoutes from "./routes/authRoutes.js";
import videoRoutes from "./routes/videoRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import chatRoutes from "./routes/chatRoutes.js";
import quizRoutes from "./routes/quizRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";

// Import Models
import Message from "./models/Message.js";
import Notification from "./models/Notification.js";
import QuizAttempt from "./models/QuizAttempt.js";

const app = express();
const server = http.createServer(app);

// 1. CORS Configuration
const allowedOrigin = "https://skillora-frontend-alpha.vercel.app";

app.use(cors({
  origin: allowedOrigin,
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true,
}));

app.use(express.json({ limit: "5mb" }));

// 2. Socket.io Setup
const io = new Server(server, {
  cors: {
    origin: allowedOrigin,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Connect to MongoDB
connectDB();

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/videos", videoRoutes);
app.use("/api/users", userRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/quizzes", quizRoutes);
app.use("/api/notifications", notificationRoutes);

app.get("/", (req, res) => {
  res.send("Skillora API is running ✅");
});

app.set("io", io);

// 3. Socket.io Logic
io.on("connection", (socket) => {
  console.log(`🔌 Socket connected: ${socket.id}`);

  socket.on("join_conversation", (conversationId) => socket.join(conversationId));

  socket.on("send_message", async (data) => {
    try {
      const saved = await Message.create(data);
      io.to(data.conversationId).emit("receive_message", saved);
    } catch (error) { console.error(error); }
  });

  socket.on("join_quiz_room", (quizId) => socket.join(`quiz_${quizId}`));

  socket.on("quiz_score_submitted", async ({ quizId }) => {
    try {
      const attempts = await QuizAttempt.find({ quiz: quizId }).populate("student", "name");
      io.to(`quiz_${quizId}`).emit("leaderboard_update", attempts);
    } catch (error) { console.error(error); }
  });

  socket.on("disconnect", () => console.log(`🔌 Socket disconnected`));
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});