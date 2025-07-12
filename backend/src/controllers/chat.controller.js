import { Chat } from "../models/chat.js";
import { Message } from "../models/message.js";

export const createChat = async (req, res) => {
  try {
    const chat = await Chat.create({ title: req.body.title || "New Chat" });
    res.status(201).json(chat);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getAllChats = async (req, res) => {
  try {
    const chats = await Chat.find().sort({ updatedAt: -1 });
    res.status(200).json(chats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getChatWithMessages = async (req, res) => {
  try {
    const chat = await Chat.findById(req.params.id);
    const messages = await Message.find({ chatId: chat._id }).sort({
      timestamp: 1,
    });
    res.status(200).json({ chat, messages });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const deleteChat = async (req, res) => {
  try {
    await Message.deleteMany({ chatId: req.params.id });
    await Chat.findByIdAndDelete(req.params.id);
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
