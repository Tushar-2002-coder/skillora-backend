import mongoose from "mongoose";

const quizAttemptSchema = new mongoose.Schema(
  {
    quiz: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Quiz",
      required: true,
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    score: {
      type: Number,
      required: true,
    },
    totalMarks: {
      type: Number,
      required: true,
    },
    // For builder quizzes: which option index the student picked per question
    answers: {
      type: [Number],
      default: [],
    },
    timeTakenSeconds: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

// Ek student ek quiz sirf ek baar attempt kar sake
quizAttemptSchema.index({ quiz: 1, student: 1 }, { unique: true });

export default mongoose.model("QuizAttempt", quizAttemptSchema);
