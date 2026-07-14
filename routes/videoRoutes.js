// routes/videoRoutes.js
import express from "express";
import {
  getVideos,
  getVideoById,
  getRelatedVideos,
  createVideo,
  updateVideo,
  deleteVideo,
  recordWatch,
} from "../controllers/videoController.js";
import { protect, adminOnly, requireAuth } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", protect, getVideos);
router.get("/:id/related", protect, getRelatedVideos);
router.get("/:id", getVideoById);

// Watch history — requireAuth (must be logged in)
router.post("/:id/watch", requireAuth, recordWatch);

// Admin only
router.post("/", protect, adminOnly, createVideo);
router.put("/:id", protect, adminOnly, updateVideo);
router.delete("/:id", protect, adminOnly, deleteVideo);

export default router;
