import Message from "../models/Message.js";
import User from "../models/User.js";

// @route GET /api/chat/conversations (admin only) - list all students who have chatted
export const getConversations = async (req, res) => {
  try {
    const conversationIds = await Message.distinct("conversationId");

    const conversations = await Promise.all(
      conversationIds.map(async (conversationId) => {
        const lastMessage = await Message.findOne({ conversationId }).sort({ createdAt: -1 });
        const studentId = conversationId.split("_")[0];
        const student = await User.findById(studentId).select("name email");
        return {
          conversationId,
          student,
          lastMessage: lastMessage?.messageText || "",
          lastMessageAt: lastMessage?.createdAt || null,
        };
      })
    );

    res.json(conversations.sort((a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt)));
  } catch (error) {
    console.error("Get conversations error:", error);
    res.status(500).json({ message: "Failed to fetch conversations." });
  }
};

// @route GET /api/chat/:conversationId - get all messages in a conversation
export const getMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const messages = await Message.find({ conversationId }).sort({ createdAt: 1 });
    res.json(messages);
  } catch (error) {
    console.error("Get messages error:", error);
    res.status(500).json({ message: "Failed to fetch messages." });
  }
};
