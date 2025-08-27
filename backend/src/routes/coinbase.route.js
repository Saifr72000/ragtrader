import express from "express";
import {
  connect,
  subscribeRoute,
  unsubscribeRoute,
  lastMessage,
  sseStream,
  createOrderController,
  getAccounts,
  getOrdersController,
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
router.get("/orders", getOrdersController);

// Test API permissions
router.get("/accounts", getAccounts);

export default router;
