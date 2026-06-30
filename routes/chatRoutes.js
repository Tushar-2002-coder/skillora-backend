import express from "express";
import { getConversations, getMessages, markConversationRead } from "../controllers/chatController.js";
import { protect, adminOnly } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/conversations", protect, adminOnly, getConversations);
router.get("/:conversationId", protect, getMessages);
router.post("/:conversationId/read", protect, adminOnly, markConversationRead);

export default router;
