// models/WatchHistory.js
import mongoose from "mongoose";

const watchHistorySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    video: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Video",
      required: true,
    },
    // Video category at the time of watching (denormalized for fast algorithm queries)
    category: {
      type: String,
      default: "General",
    },
    // How many seconds the user actually watched
    watchedSeconds: {
      type: Number,
      default: 0,
    },
    // Total duration of the video (for completion % calculation)
    totalSeconds: {
      type: Number,
      default: 0,
    },
    // Completion percentage 0-100
    completionPct: {
      type: Number,
      default: 0,
    },
    // How many times this user opened this specific video
    playCount: {
      type: Number,
      default: 1,
    },
  },
  { timestamps: true }
);

// One record per user+video combination (upsert pattern)
watchHistorySchema.index({ user: 1, video: 1 }, { unique: true });

export default mongoose.model("WatchHistory", watchHistorySchema);
