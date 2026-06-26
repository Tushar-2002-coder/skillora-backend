import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null, // null = general admin support inbox
    },
    senderRole: {
      type: String,
      enum: ["student", "admin"],
      required: true,
    },
    messageText: {
      type: String,
      required: true,
    },
    // Groups messages between one student and admin support
    conversationId: {
      type: String,
      required: true,
      index: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Message", messageSchema);
