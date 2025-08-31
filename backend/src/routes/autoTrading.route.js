/**
 * Auto Trading Routes
 * API routes for automated trading management
 */

import express from "express";
import {
  enableAutoTradingController,
  disableAutoTradingController,
  getAutoTradingStatusController,
  emergencyStopController,
  testTradingSystemController,
  processRAGResponseController,
  getSignalStatusController,
  resetSignalsController,
  checkRAGResponseController,
} from "../controllers/autoTrading.controller.js";

const router = express.Router();

// Trading control endpoints
router.post("/enable", enableAutoTradingController);
router.post("/disable", disableAutoTradingController);
router.get("/status", getAutoTradingStatusController);
router.post("/emergency-stop", emergencyStopController);

// RAG response processing
router.post("/check-rag-response", checkRAGResponseController);
router.post("/process-rag", processRAGResponseController);

// Testing endpoints
router.post("/test", testTradingSystemController);

// Signal management endpoints
router.get("/signals/status", getSignalStatusController);
router.post("/signals/reset", resetSignalsController);

export default router;
