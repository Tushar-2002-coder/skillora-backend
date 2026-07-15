import express from "express";
import {
  getVideos,
  getVideoById,
  createVideo,
  updateVideo,
  deleteVideo,
  fetchVideoMetadata // Naya function import karo
} from "../controllers/videoController.js";
import { protect, adminOnly } from "../middleware/authMiddleware.js";

const router = express.Router();

// Metadata fetch karne ka route
router.post("/fetch-metadata", protect, adminOnly, fetchVideoMetadata);

router.get("/", getVideos);
router.post("/", protect, adminOnly, createVideo);
router.get("/:id", getVideoById);
router.put("/:id", protect, adminOnly, updateVideo);
router.delete("/:id", protect, adminOnly, deleteVideo);
router.get("/:id/related", protect, getRelatedVideos);

export default router;