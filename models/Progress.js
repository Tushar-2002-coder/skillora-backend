import mongoose from "mongoose";

const progressSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    video: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Video",
      required: true,
    },
    completed: {
      type: Boolean,
      default: false,
    },
    watchedSeconds: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

// Ek user ek video ke liye sirf ek hi progress record rakhe
progressSchema.index({ user: 1, video: 1 }, { unique: true });

export default mongoose.model("Progress", progressSchema);
