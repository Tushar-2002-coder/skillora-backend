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

import Message from "./models/Message.js";
import Notification from "./models/Notification.js";
import QuizAttempt from "./models/QuizAttempt.js";

const app = express();
const server = http.createServer(app);

// ✅ CLIENT_URL env variable se lo — localhost bhi kaam kare, Vercel bhi
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";

app.use(cors({
  origin: CLIENT_URL,
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true,
}));

app.use(express.json({ limit: "5mb" }));

// ✅ Socket.io — same CLIENT_URL use karo
const io = new Server(server, {
  cors: {
    origin: CLIENT_URL,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

connectDB();

app.use("/api/auth", authRoutes);
app.use("/api/videos", videoRoutes);
app.use("/api/users", userRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/quizzes", quizRoutes);
app.use("/api/notifications", notificationRoutes);

app.get("/", (req, res) => res.send("Skillora API is running ✅"));
app.set("io", io);

// ─────────────────────────────────────────
// Socket.io Event Handlers
// ─────────────────────────────────────────
io.on("connection", (socket) => {
  console.log(`🔌 Socket connected: ${socket.id}`);

  // ── Chat ──
  socket.on("join_conversation", (conversationId) => {
    socket.join(conversationId);
  });

  socket.on("send_message", async (data) => {
    const { conversationId, senderId, senderRole, messageText } = data;
    try {
      const saved = await Message.create({
        sender: senderId,
        senderRole,
        messageText,
        conversationId,
      });
      // Broadcast to everyone in the room (sender + receiver)
      io.to(conversationId).emit("receive_message", {
        _id: saved._id,
        sender: senderId,
        senderRole,
        messageText,
        conversationId,
        createdAt: saved.createdAt,
      });
    } catch (error) {
      console.error("Message save error:", error);
    }
  });

  // ── Live Quiz Leaderboard ──
  socket.on("join_quiz_room", (quizId) => socket.join(`quiz_${quizId}`));
  socket.on("leave_quiz_room", (quizId) => socket.leave(`quiz_${quizId}`));

  socket.on("quiz_score_submitted", async ({ quizId }) => {
    try {
      const attempts = await QuizAttempt.find({ quiz: quizId })
        .populate("student", "name")
        .sort({ score: -1, timeTakenSeconds: 1 });

      const leaderboard = attempts.map((a, i) => ({
        rank: i + 1,
        studentId: a.student?._id,
        studentName: a.student?.name || "Unknown",
        score: a.score,
        totalMarks: a.totalMarks,
        timeTakenSeconds: a.timeTakenSeconds,
      }));

      io.to(`quiz_${quizId}`).emit("leaderboard_update", leaderboard);
    } catch (error) {
      console.error("Leaderboard broadcast error:", error);
    }
  });

  // ── Notifications ──
  socket.on("notification_broadcast", async ({ notificationId }) => {
    try {
      const notification = await Notification.findById(notificationId);
      if (notification) {
        io.emit("new_notification", {
          _id: notification._id,
          title: notification.title,
          message: notification.message,
          link: notification.link,
          createdAt: notification.createdAt,
        });
      }
    } catch (error) {
      console.error("Notification broadcast error:", error);
    }
  });

  socket.on("disconnect", () => {
    console.log(`🔌 Socket disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
