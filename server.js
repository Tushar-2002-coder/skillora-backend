import "dotenv/config";
import express from "express";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";

import connectDB from "./config/db.js";

import authRoutes from "./routes/authRoutes.js";
import videoRoutes from "./routes/videoRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import chatRoutes from "./routes/chatRoutes.js";
import quizRoutes from "./routes/quizRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import youtubeRoutes from "./routes/youtubeRoutes.js";

import Message from "./models/Message.js";
import Notification from "./models/Notification.js";
import QuizAttempt from "./models/QuizAttempt.js";

const app = express();
const server = http.createServer(app);

// ===============================
// Configuration
// ===============================
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";
const PORT = process.env.PORT || 5000;

// ===============================
// Middleware
// ===============================
app.use(
  cors({
    origin: CLIENT_URL,
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);

app.use(express.json({ limit: "5mb" }));

// ===============================
// Socket.io
// ===============================
const io = new Server(server, {
  cors: {
    origin: CLIENT_URL,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// ===============================
// Database
// ===============================
connectDB();

// ===============================
// API Routes
// ===============================
app.use("/api/auth", authRoutes);
app.use("/api/videos", videoRoutes);
app.use("/api/users", userRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/quizzes", quizRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/youtube", youtubeRoutes);
app.get("/api/test", (req, res) => {
  res.json({ message: "API working" });
});

// ===============================
// Home Route
// ===============================
app.get("/", (req, res) => {
  res.send("🚀 Skillora API is running successfully!");
});

app.set("io", io);

// ===============================
// Socket Events
// ===============================
io.on("connection", (socket) => {
  console.log(`🔌 Socket connected: ${socket.id}`);

  // Chat Room
  socket.on("join_conversation", (conversationId) => {
    socket.join(conversationId);
  });

  socket.on("send_message", async (data) => {
    try {
      const { conversationId, senderId, senderRole, messageText } = data;

      const saved = await Message.create({
        sender: senderId,
        senderRole,
        messageText,
        conversationId,
      });

      io.to(conversationId).emit("receive_message", {
        _id: saved._id,
        sender: senderId,
        senderRole,
        messageText,
        conversationId,
        createdAt: saved.createdAt,
      });
    } catch (error) {
      console.error("❌ Message save error:", error);
    }
  });

  socket.on("chat_cleared", ({ conversationId }) => {
    io.to(conversationId).emit("chat_cleared", { conversationId });
  });

  // Quiz Room
  socket.on("join_quiz_room", (quizId) => {
    socket.join(`quiz_${quizId}`);
  });

  socket.on("leave_quiz_room", (quizId) => {
    socket.leave(`quiz_${quizId}`);
  });

  socket.on("quiz_score_submitted", async ({ quizId }) => {
    try {
      const attempts = await QuizAttempt.find({ quiz: quizId })
        .populate("student", "name")
        .sort({ score: -1, timeTakenSeconds: 1 });

      const leaderboard = attempts.map((attempt, index) => ({
        rank: index + 1,
        studentId: attempt.student?._id,
        studentName: attempt.student?.name || "Unknown",
        score: attempt.score,
        totalMarks: attempt.totalMarks,
        timeTakenSeconds: attempt.timeTakenSeconds,
      }));

      io.to(`quiz_${quizId}`).emit("leaderboard_update", leaderboard);
    } catch (error) {
      console.error("❌ Leaderboard error:", error);
    }
  });

  // Notifications
  socket.on("notification_broadcast", async ({ notificationId }) => {
    try {
      const notification = await Notification.findById(notificationId);

      if (!notification) return;

      io.emit("new_notification", {
        _id: notification._id,
        title: notification.title,
        message: notification.message,
        link: notification.link,
        createdAt: notification.createdAt,
      });
    } catch (error) {
      console.error("❌ Notification broadcast error:", error);
    }
  });

  socket.on("disconnect", () => {
    console.log(`🔌 Socket disconnected: ${socket.id}`);
  });
});

// ===============================
// Start Server
// ===============================
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});