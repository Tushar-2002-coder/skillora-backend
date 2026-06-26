import express from "express";
import {
  getNotifications,
  createNotification,
  markAsRead,
  markAllAsRead,
} from "../controllers/notificationController.js";
import { protect, adminOnly } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", protect, getNotifications);
router.post("/", protect, adminOnly, createNotification);
router.post("/:id/read", protect, markAsRead);
router.post("/read-all", protect, markAllAsRead);

export default router;
