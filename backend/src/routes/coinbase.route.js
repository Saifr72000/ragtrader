import express from "express";
import {
  connect,
  subscribeRoute,
  unsubscribeRoute,
  lastMessage,
  sseStream,
  createOrderController,
} from "../controllers/coinbase.controller.js";

const router = express.Router();

router.get("/ws/connect", connect);
router.post("/ws/subscribe", subscribeRoute);
router.post("/ws/unsubscribe", unsubscribeRoute);
router.get("/ws/last", lastMessage);

// Optional: live push to the browser via Server-Sent Events
router.get("/ws/stream", sseStream);

// Order management
router.post("/orders", createOrderController);

// Test API permissions

export default router;
