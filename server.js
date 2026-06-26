import "dotenv/config";
import express from "express";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";

import connectDB from "./config/db.js";
import Message from "./models/Message.js";
import Notification from "./models/Notification.js";
import QuizAttempt from "./models/QuizAttempt.js";

import authRoutes from "./routes/authRoutes.js";
import videoRoutes from "./routes/videoRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import chatRoutes from "./routes/chatRoutes.js";
import quizRoutes from "./routes/quizRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";

const app = express();
const server = http.createServer(app);

// 🛡️ CORS - allow the frontend dev server to talk to this API
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    methods: ["GET", "POST"],
  },
});

app.use(cors({ origin: process.env.CLIENT_URL || "http://localhost:5173" }));
app.use(express.json({ limit: "5mb" })); // raised limit to allow uploaded HTML quiz files

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

// Make `io` available to route handlers that want to broadcast
// (used by notificationController via app.set, see below)
app.set("io", io);

// ===========================
// 💬 Socket.io - Real-time Events
// ===========================
io.on("connection", (socket) => {
  console.log(`🔌 Socket connected: ${socket.id}`);

  // ---- Chat ----
  // Each student has a private conversation with admin support.
  // conversationId format: "<studentId>_support"
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

      io.to(conversationId).emit("receive_message", {
        _id: saved._id,
        sender: senderId,
        senderRole,
        messageText,
        conversationId,
        createdAt: saved.createdAt,
      });
    } catch (error) {
      console.error("Socket message save error:", error);
    }
  });

  // ---- Live Quiz Leaderboard ----
  // Everyone viewing a quiz's leaderboard joins a room named "quiz_<quizId>"
  socket.on("join_quiz_room", (quizId) => {
    socket.join(`quiz_${quizId}`);
  });

  socket.on("leave_quiz_room", (quizId) => {
    socket.leave(`quiz_${quizId}`);
  });

  // Called by the frontend right after a score is successfully saved via the REST API,
  // so everyone watching the leaderboard sees the update immediately.
  socket.on("quiz_score_submitted", async ({ quizId }) => {
    try {
      const attempts = await QuizAttempt.find({ quiz: quizId })
        .populate("student", "name")
        .sort({ score: -1, timeTakenSeconds: 1 });

      const leaderboard = attempts.map((a, index) => ({
        rank: index + 1,
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

  // ---- Notifications ----
  // Called right after the admin successfully creates a notification via REST API,
  // so it appears instantly in every connected student's bell icon.
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
