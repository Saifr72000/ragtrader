import express from "express";
import {
  connect,
  subscribeRoute,
  unsubscribeRoute,
  lastMessage,
  sseStream,
  getCandleBufferStatus,
  getCandleDataForRAG,
  getAvailableCandleData,
  getRawCandleDataForRAG,
  startTradingEngine,
  stopTradingEngine,
  getTradingEngineStatus,
  getRecentTrades,
  getAccounts,
  createOrderController,
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

// Candle buffer endpoints
router.get("/candles/status", getCandleBufferStatus);
router.get("/candles/data", getCandleDataForRAG);
router.get("/candles/available", getAvailableCandleData);
router.get("/candles/raw", getRawCandleDataForRAG);

// Trading engine endpoints
router.post("/trading/start", startTradingEngine);
router.post("/trading/stop", stopTradingEngine);
router.get("/trading/status", getTradingEngineStatus);
router.get("/trading/trades", getRecentTrades);

export default router;
