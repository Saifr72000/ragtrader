import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
  chatId: { type: mongoose.Types.ObjectId, ref: "Chat", required: true },
  role: { type: String, enum: ["system", "user", "assistant"], required: true },
  content: [
    {
      text: { type: String },
      image_url: { type: String },
    },
  ],
  timestamp: { type: Date, default: Date.now },
});

export const Message = mongoose.model("Message", messageSchema);
