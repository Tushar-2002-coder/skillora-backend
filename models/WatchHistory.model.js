// models/WatchHistory.model.js — Skillora
import mongoose from "mongoose";

const WatchHistorySchema = new mongoose.Schema(
  {
    user:           { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    video:          { type: mongoose.Schema.Types.ObjectId, ref: "Video", required: true },
    course:         { type: mongoose.Schema.Types.ObjectId, ref: "Course" },

    // ── Tracking fields ──────────────────────────────────────────────────────
    watchedSeconds: { type: Number, default: 0, min: 0 },

    // Formula: completionRate = (watchedSeconds / video.durationSeconds) * 100
    // Capped at 100. Computed server-side on every POST.
    completionRate: { type: Number, default: 0, min: 0, max: 100 },

    // True once completionRate >= 80 (set only once, never reverted)
    isCompleted:    { type: Boolean, default: false },

    lastWatched:    { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// One record per user per video
WatchHistorySchema.index({ user: 1, video: 1 }, { unique: true });
// Fast lookup: all videos watched by a user
WatchHistorySchema.index({ user: 1, lastWatched: -1 });

export default mongoose.model("WatchHistory", WatchHistorySchema);
