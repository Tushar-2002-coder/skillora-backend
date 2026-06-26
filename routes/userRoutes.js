import express from "express";
import { getStudents, getMyProgress, updateProgress, updateProfile } from "../controllers/userController.js";
import { protect, adminOnly } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/students", protect, adminOnly, getStudents);
router.get("/progress/me", protect, getMyProgress);
router.post("/progress", protect, updateProgress);
router.put("/profile", protect, updateProfile);

export default router;
