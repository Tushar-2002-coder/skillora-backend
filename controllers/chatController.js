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

        // Unread = student ke messages jo admin ne abhi tak nahi padhe
        // (yahan simple version: admin ki taraf se "unread" track karne ke liye
        // hum bas last message ka sender check karte hain)
        const unreadCount = await Message.countDocuments({
          conversationId,
          senderRole: "student",
          readByAdmin: { $ne: true },
        });

        return {
          conversationId,
          student,
          lastMessage: lastMessage?.messageText || "",
          lastMessageAt: lastMessage?.createdAt || null,
          lastSenderRole: lastMessage?.senderRole || null,
          unreadCount,
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

// @route POST /api/chat/:conversationId/read - mark all student messages in this conversation as read by admin
export const markConversationRead = async (req, res) => {
  try {
    const { conversationId } = req.params;
    await Message.updateMany(
      { conversationId, senderRole: "student" },
      { $set: { readByAdmin: true } }
    );
    res.json({ message: "Marked as read." });
  } catch (error) {
    console.error("Mark conversation read error:", error);
    res.status(500).json({ message: "Failed to update messages." });
  }
};

// @route DELETE /api/chat/:conversationId (admin only) - permanently delete every message in a conversation
export const clearConversation = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const result = await Message.deleteMany({ conversationId });
    res.json({ message: "Chat cleared successfully.", deletedCount: result.deletedCount });
  } catch (error) {
    console.error("Clear conversation error:", error);
    res.status(500).json({ message: "Failed to clear chat." });
  }
};
