import mongoose from "mongoose";

const chatSchema = new mongoose.Schema(
  {
    title: { type: String },
    lastMessage: { type: String, default: "Start a new conversation..." },
  },
  {
    timestamps: true, // auto-manages `createdAt` and `updatedAt`
  }
);

export const Chat = mongoose.model("Chat", chatSchema);
