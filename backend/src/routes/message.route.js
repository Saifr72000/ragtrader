import express from "express";
import { createMessage } from "../controllers/message.controller.js";
import { openTest } from "../controllers/openai.controller.js";
import multer from "multer";

const upload = multer({ storage: multer.memoryStorage() });

const router = express.Router();

router.post("/", upload.single("content[file]"), createMessage);
router.post("/openai", openTest);

export default router;
