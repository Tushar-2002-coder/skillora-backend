import express from "express";
import {
  getVideos,
  getVideoById,
  createVideo,
  updateVideo,
  deleteVideo,
  fetchVideoMetadata,
  getRelatedVideos // <--- Yeh import ensure karein
} from "../controllers/videoController.js";
import { protect, adminOnly } from "../middleware/authMiddleware.js";

const router = express.Router();

// Routes
router.post("/fetch-metadata", protect, adminOnly, fetchVideoMetadata);
router.get("/", getVideos);
router.post("/", protect, adminOnly, createVideo);
router.get("/:id", getVideoById);
router.get("/:id/related", protect, getRelatedVideos); // <--- Ab ye kaam karega
router.put("/:id", protect, adminOnly, updateVideo);
router.delete("/:id", protect, adminOnly, deleteVideo);

export default router;