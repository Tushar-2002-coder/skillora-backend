// routes/watchHistory.route.js  — Skillora Backend (Express + MongoDB)
// POST /api/watch-history   — called every 15s from frontend

import express from "express";
import { protect } from "../middleware/auth.middleware.js"; // your existing JWT middleware
import WatchHistory from "../models/WatchHistory.model.js";
import Video from "../models/Video.model.js";

const router = express.Router();

/**
 * POST /api/watch-history
 * Body: { videoId, watchedSeconds }
 *
 * Algorithm:
 *   completionRate = watchedSeconds / video.durationSeconds * 100
 *   if completionRate >= 80%  → mark completed, award XP (once per video)
 *   Always upsert the record so the latest watchedSeconds is stored.
 */
router.post("/", protect, async (req, res) => {
  try {
    const { videoId, watchedSeconds } = req.body;
    const userId = req.user._id;

    if (!videoId || typeof watchedSeconds !== "number") {
      return res.status(400).json({ message: "videoId and watchedSeconds required" });
    }

    // Fetch video to get total duration
    const video = await Video.findById(videoId).select("durationSeconds title course");
    if (!video) return res.status(404).json({ message: "Video not found" });

    // Completion rate
    const completionRate = video.durationSeconds > 0
      ? Math.min((watchedSeconds / video.durationSeconds) * 100, 100)
      : 0;

    const isCompleted = completionRate >= 80;

    // Upsert watch history record
    const existing = await WatchHistory.findOne({ user: userId, video: videoId });

    if (existing) {
      // Only move forward — never decrease watchedSeconds
      if (watchedSeconds > existing.watchedSeconds) {
        existing.watchedSeconds = watchedSeconds;
        existing.completionRate = completionRate;
        existing.lastWatched = new Date();

        // Award XP only once when first completed
        if (isCompleted && !existing.isCompleted) {
          existing.isCompleted = true;
          await awardXP(userId, 10, `Completed: ${video.title}`);
        }

        await existing.save();
      }
    } else {
      await WatchHistory.create({
        user: userId,
        video: videoId,
        course: video.course,
        watchedSeconds,
        completionRate,
        isCompleted,
        lastWatched: new Date(),
      });

      if (isCompleted) {
        await awardXP(userId, 10, `Completed: ${video.title}`);
      }
    }

    return res.json({ success: true, completionRate: Math.round(completionRate) });
  } catch (err) {
    console.error("[WatchHistory] Error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * GET /api/watch-history
 * Returns the authenticated user's full watch history (latest 50)
 */
router.get("/", protect, async (req, res) => {
  try {
    const history = await WatchHistory.find({ user: req.user._id })
      .populate("video", "title thumbnail duration category")
      .sort({ lastWatched: -1 })
      .limit(50);

    res.json(history);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// ── Helper: Award XP ──────────────────────────────────────────────────────────
async function awardXP(userId, xp, reason) {
  try {
    const User = (await import("../models/User.model.js")).default;
    await User.findByIdAndUpdate(userId, {
      $inc: { xp },
      $push: { xpLog: { amount: xp, reason, date: new Date() } },
    });
    console.log(`[XP] +${xp} awarded to ${userId}: ${reason}`);
  } catch (e) {
    console.error("[XP] Failed to award:", e);
  }
}

export default router;
