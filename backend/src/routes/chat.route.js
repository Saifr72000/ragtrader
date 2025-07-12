import express from "express";
import {
  createChat,
  getAllChats,
  getChatWithMessages,
  deleteChat,
} from "../controllers/chat.controller.js";

const router = express.Router();

router.post("/", createChat);
router.get("/", getAllChats);
router.get("/:id", getChatWithMessages);
router.delete("/:id", deleteChat);

export default router;
