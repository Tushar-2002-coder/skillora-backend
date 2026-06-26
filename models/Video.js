import mongoose from "mongoose";

const videoSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    thumbnailUrl: {
      type: String,
      default: "",
    },
    embedUrl: {
      type: String,
      required: true,
    },
    durationInSeconds: {
      type: Number,
      default: 0,
    },
    category: {
      type: String,
      default: "General",
    },
    views: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Video", videoSchema);
