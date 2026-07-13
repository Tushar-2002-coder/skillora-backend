// routes/youtubeRoutes.js
import express from "express";
import {
  fetchVideoInfo,
  saveVideo,
  listVideos,
  updateVideo,
  deleteYoutubeVideo,
} from "../controllers/youtubeController.js";
import { protect, adminOnly } from "../middleware/authMiddleware.js";

const router = express.Router();

// All YouTube import routes are admin-only
router.post("/fetch-video", protect, adminOnly, fetchVideoInfo);
router.post("/save-video", protect, adminOnly, saveVideo);
router.get("/videos", protect, adminOnly, listVideos);
router.put("/video/:id", protect, adminOnly, updateVideo);
router.delete("/video/:id", protect, adminOnly, deleteYoutubeVideo);

export default router;
