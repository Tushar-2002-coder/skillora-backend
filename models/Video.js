import mongoose from "mongoose";

const videoSchema = new mongoose.Schema(
  {
    // ===========================
    // Basic Video Information
    // ===========================
    title: {
      type: String,
      required: true,
      trim: true,
    },

    embedUrl: {
      type: String,
      required: true,
    },

    thumbnailUrl: {
      type: String,
      default: "",
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

    // ===========================
    // YouTube Import Fields
    // ===========================
    videoId: {
      type: String,
      default: null,
      unique: true,
      sparse: true,
      index: true,
    },

    youtubeUrl: {
      type: String,
      default: "",
    },

    description: {
      type: String,
      default: "",
    },

    durationText: {
      type: String,
      default: "",
    },

    channelName: {
      type: String,
      default: "",
    },

    publishDate: {
      type: Date,
      default: null,
    },

    tags: {
      type: [String],
      default: [],
    },

    slug: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);



export default mongoose.model("Video", videoSchema);