import mongoose from "mongoose";

const questionSchema = new mongoose.Schema(
  {
    questionText: { type: String, required: true },
    options: {
      type: [String],
      required: true,
      validate: (arr) => arr.length === 4,
    },
    correctAnswerIndex: { type: Number, required: true, min: 0, max: 3 },
  },
  { _id: false }
);

const quizSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
    },
    // "builder" = made with our question/option form, "html" = admin-uploaded standalone HTML file
    sourceType: {
      type: String,
      enum: ["builder", "html"],
      required: true,
    },
    // Used when sourceType === "builder"
    questions: {
      type: [questionSchema],
      default: [],
    },
    // Used when sourceType === "html" - the raw HTML content of the quiz file
    htmlContent: {
      type: String,
      default: "",
    },
    totalQuestions: {
      type: Number,
      default: 0,
    },
    // If set, this quiz is a scheduled "live" competition
    isLive: {
      type: Boolean,
      default: false,
    },
    scheduledAt: {
      type: Date,
      default: null,
    },
    // Live quiz window closes automatically after this many minutes from scheduledAt
    durationMinutes: {
      type: Number,
      default: 30,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Quiz", quizSchema);
