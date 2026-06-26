import Quiz from "../models/Quiz.js";
import QuizAttempt from "../models/QuizAttempt.js";

// @route GET /api/quizzes - list all quizzes (students see upcoming/live/past, admin sees all)
export const getQuizzes = async (req, res) => {
  try {
    const quizzes = await Quiz.find().sort({ createdAt: -1 }).select("-questions.correctAnswerIndex -htmlContent");
    res.json(quizzes);
  } catch (error) {
    console.error("Get quizzes error:", error);
    res.status(500).json({ message: "Failed to fetch quizzes." });
  }
};

// @route GET /api/quizzes/:id - get a single quiz to attempt
// Strips correct answers for builder quizzes so students can't cheat by inspecting the response
export const getQuizById = async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) {
      return res.status(404).json({ message: "Quiz not found." });
    }

    const existingAttempt = await QuizAttempt.findOne({ quiz: quiz._id, student: req.user._id });

    const safeQuiz = quiz.toObject();
    if (safeQuiz.sourceType === "builder" && req.user.role !== "admin") {
      safeQuiz.questions = safeQuiz.questions.map((q) => ({
        questionText: q.questionText,
        options: q.options,
      }));
    }

    res.json({ quiz: safeQuiz, alreadyAttempted: !!existingAttempt, existingAttempt });
  } catch (error) {
    console.error("Get quiz error:", error);
    res.status(500).json({ message: "Failed to fetch quiz." });
  }
};

// @route POST /api/quizzes (admin only) - create a quiz, either "builder" (questions[]) or "html" (htmlContent)
export const createQuiz = async (req, res) => {
  try {
    const { title, description, sourceType, questions, htmlContent, isLive, scheduledAt, durationMinutes } = req.body;

    if (!title || !sourceType) {
      return res.status(400).json({ message: "Title and sourceType are required." });
    }

    if (sourceType === "builder" && (!questions || questions.length === 0)) {
      return res.status(400).json({ message: "At least one question is required for a builder quiz." });
    }

    if (sourceType === "html" && !htmlContent) {
      return res.status(400).json({ message: "HTML content is required for an HTML quiz." });
    }

    const quiz = await Quiz.create({
      title,
      description,
      sourceType,
      questions: sourceType === "builder" ? questions : [],
      htmlContent: sourceType === "html" ? htmlContent : "",
      totalQuestions: sourceType === "builder" ? questions.length : 0,
      isLive: !!isLive,
      scheduledAt: scheduledAt || null,
      durationMinutes: durationMinutes || 30,
      createdBy: req.user._id,
    });

    res.status(201).json(quiz);
  } catch (error) {
    console.error("Create quiz error:", error);
    res.status(500).json({ message: "Failed to create quiz." });
  }
};

// @route DELETE /api/quizzes/:id (admin only)
export const deleteQuiz = async (req, res) => {
  try {
    const quiz = await Quiz.findByIdAndDelete(req.params.id);
    if (!quiz) {
      return res.status(404).json({ message: "Quiz not found." });
    }
    await QuizAttempt.deleteMany({ quiz: req.params.id });
    res.json({ message: "Quiz deleted successfully." });
  } catch (error) {
    console.error("Delete quiz error:", error);
    res.status(500).json({ message: "Failed to delete quiz." });
  }
};

// @route POST /api/quizzes/:id/submit - submit answers for a builder quiz, server grades it
export const submitBuilderQuiz = async (req, res) => {
  try {
    const { answers, timeTakenSeconds } = req.body; // answers = [optionIndex, optionIndex, ...]
    const quiz = await Quiz.findById(req.params.id);

    if (!quiz) {
      return res.status(404).json({ message: "Quiz not found." });
    }
    if (quiz.sourceType !== "builder") {
      return res.status(400).json({ message: "This quiz must be submitted via the HTML score endpoint." });
    }

    const existing = await QuizAttempt.findOne({ quiz: quiz._id, student: req.user._id });
    if (existing) {
      return res.status(400).json({ message: "You have already attempted this quiz." });
    }

    let score = 0;
    quiz.questions.forEach((q, i) => {
      if (answers[i] === q.correctAnswerIndex) score += 1;
    });

    const attempt = await QuizAttempt.create({
      quiz: quiz._id,
      student: req.user._id,
      score,
      totalMarks: quiz.questions.length,
      answers,
      timeTakenSeconds: timeTakenSeconds || 0,
    });

    res.status(201).json(attempt);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: "You have already attempted this quiz." });
    }
    console.error("Submit quiz error:", error);
    res.status(500).json({ message: "Failed to submit quiz." });
  }
};

// @route POST /api/quizzes/:id/submit-score - record a score reported by a standalone HTML quiz
export const submitHtmlQuizScore = async (req, res) => {
  try {
    const { score, totalMarks, timeTakenSeconds } = req.body;
    const quiz = await Quiz.findById(req.params.id);

    if (!quiz) {
      return res.status(404).json({ message: "Quiz not found." });
    }
    if (typeof score !== "number" || typeof totalMarks !== "number") {
      return res.status(400).json({ message: "score and totalMarks must be numbers." });
    }

    const attempt = await QuizAttempt.findOneAndUpdate(
      { quiz: quiz._id, student: req.user._id },
      { $setOnInsert: { score, totalMarks, timeTakenSeconds: timeTakenSeconds || 0 } },
      { new: true, upsert: true }
    );

    res.status(201).json(attempt);
  } catch (error) {
    console.error("Submit HTML quiz score error:", error);
    res.status(500).json({ message: "Failed to record score." });
  }
};

// @route GET /api/quizzes/:id/leaderboard - live + final leaderboard for a quiz
export const getLeaderboard = async (req, res) => {
  try {
    const attempts = await QuizAttempt.find({ quiz: req.params.id })
      .populate("student", "name")
      .sort({ score: -1, timeTakenSeconds: 1 });

    const leaderboard = attempts.map((a, index) => ({
      rank: index + 1,
      studentId: a.student?._id,
      studentName: a.student?.name || "Unknown",
      score: a.score,
      totalMarks: a.totalMarks,
      timeTakenSeconds: a.timeTakenSeconds,
    }));

    res.json(leaderboard);
  } catch (error) {
    console.error("Get leaderboard error:", error);
    res.status(500).json({ message: "Failed to fetch leaderboard." });
  }
};

// @route GET /api/quizzes/history/me - student's own quiz attempt history
export const getMyQuizHistory = async (req, res) => {
  try {
    const attempts = await QuizAttempt.find({ student: req.user._id })
      .populate("quiz", "title")
      .sort({ createdAt: -1 });
    res.json(attempts);
  } catch (error) {
    console.error("Get quiz history error:", error);
    res.status(500).json({ message: "Failed to fetch quiz history." });
  }
};

// @route GET /api/quizzes/history/all (admin only) - every student's attempts, for the admin dashboard
export const getAllQuizHistory = async (req, res) => {
  try {
    const attempts = await QuizAttempt.find()
      .populate("student", "name email")
      .populate("quiz", "title")
      .sort({ createdAt: -1 });
    res.json(attempts);
  } catch (error) {
    console.error("Get all quiz history error:", error);
    res.status(500).json({ message: "Failed to fetch quiz history." });
  }
};
