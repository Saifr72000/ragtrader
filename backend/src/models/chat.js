import mongoose from "mongoose";

const chatSchema = new mongoose.Schema(
  {
    title: { type: String },
  },
  {
    timestamps: true, // auto-manages `createdAt` and `updatedAt`
  }
);

export const Chat = mongoose.model("Chat", chatSchema);
