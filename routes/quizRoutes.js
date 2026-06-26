import express from "express";
import {
  getQuizzes,
  getQuizById,
  createQuiz,
  deleteQuiz,
  submitBuilderQuiz,
  submitHtmlQuizScore,
  getLeaderboard,
  getMyQuizHistory,
  getAllQuizHistory,
} from "../controllers/quizController.js";
import { protect, adminOnly } from "../middleware/authMiddleware.js";

const router = express.Router();

// Specific routes BEFORE the "/:id" routes, otherwise Express would treat
// "history" or "all" as a quiz id and these endpoints would never get hit.
router.get("/history/me", protect, getMyQuizHistory);
router.get("/history/all", protect, adminOnly, getAllQuizHistory);

router.get("/", protect, getQuizzes);
router.post("/", protect, adminOnly, createQuiz);
router.get("/:id", protect, getQuizById);
router.delete("/:id", protect, adminOnly, deleteQuiz);
router.post("/:id/submit", protect, submitBuilderQuiz);
router.post("/:id/submit-score", protect, submitHtmlQuizScore);
router.get("/:id/leaderboard", protect, getLeaderboard);

export default router;
