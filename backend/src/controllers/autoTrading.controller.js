/**
 * Auto Trading Controller
 * REST API endpoints for managing automated trading
 */

import {
  enableAutoTrading,
  disableAutoTrading,
  isAutoTradingActive,
  getAutoTradingStatus,
  emergencyStop,
  testTradingSystem,
  processRAGResponse,
} from "../services/autoTrading.service.js";

import {
  getSignalStatus,
  resetSignals,
} from "../services/signalManager.service.js";
import { Message } from "../models/message.js";

/**
 * Enable automated trading
 */
export async function enableAutoTradingController(req, res) {
  try {
    enableAutoTrading();

    res.json({
      success: true,
      message: "Automated trading enabled",
      status: getAutoTradingStatus(),
    });
  } catch (error) {
    console.error("💥 Error enabling auto trading:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to enable automated trading",
      error: error.message,
    });
  }
}

/**
 * Disable automated trading
 */
export async function disableAutoTradingController(req, res) {
  try {
    disableAutoTrading();

    res.json({
      success: true,
      message: "Automated trading disabled",
      status: getAutoTradingStatus(),
    });
  } catch (error) {
    console.error("💥 Error disabling auto trading:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to disable automated trading",
      error: error.message,
    });
  }
}

/**
 * Get automated trading status
 */
export async function getAutoTradingStatusController(req, res) {
  try {
    const status = getAutoTradingStatus();

    res.json({
      success: true,
      data: status,
    });
  } catch (error) {
    console.error("💥 Error getting auto trading status:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to get trading status",
      error: error.message,
    });
  }
}

/**
 * Emergency stop - immediately disable all trading
 */
export async function emergencyStopController(req, res) {
  try {
    emergencyStop();

    res.json({
      success: true,
      message: "Emergency stop activated - all trading disabled",
      status: getAutoTradingStatus(),
    });
  } catch (error) {
    console.error("💥 Error during emergency stop:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to execute emergency stop",
      error: error.message,
    });
  }
}

/**
 * Test the trading system with sample RAG response
 */
export async function testTradingSystemController(req, res) {
  try {
    const { testResponse } = req.body;

    if (!testResponse) {
      return res.status(400).json({
        success: false,
        message: "testResponse is required",
      });
    }

    await testTradingSystem(testResponse);

    res.json({
      success: true,
      message: "Trading system test completed",
      status: getAutoTradingStatus(),
    });
  } catch (error) {
    console.error("💥 Error testing trading system:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to test trading system",
      error: error.message,
    });
  }
}

/**
 * Manually process a RAG response for testing
 */
export async function processRAGResponseController(req, res) {
  try {
    const { ragResponse, source } = req.body;

    if (!ragResponse) {
      return res.status(400).json({
        success: false,
        message: "ragResponse is required",
      });
    }

    await processRAGResponse(ragResponse, source || "MANUAL_API");

    res.json({
      success: true,
      message: "RAG response processed",
      status: getAutoTradingStatus(),
    });
  } catch (error) {
    console.error("💥 Error processing RAG response:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to process RAG response",
      error: error.message,
    });
  }
}

/**
 * Get signal management status
 */
export async function getSignalStatusController(req, res) {
  try {
    const signalStatus = getSignalStatus();

    res.json({
      success: true,
      data: signalStatus,
    });
  } catch (error) {
    console.error("💥 Error getting signal status:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to get signal status",
      error: error.message,
    });
  }
}

/**
 * Reset all signals (for testing/emergency)
 */
export async function resetSignalsController(req, res) {
  try {
    resetSignals();

    res.json({
      success: true,
      message: "All signals reset",
      status: getSignalStatus(),
    });
  } catch (error) {
    console.error("💥 Error resetting signals:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to reset signals",
      error: error.message,
    });
  }
}

/**
 * Check for latest RAG response in chat and process for trading signals
 */
export async function checkRAGResponseController(req, res) {
  try {
    const { chatId, source } = req.body;

    if (!chatId) {
      return res.status(400).json({
        success: false,
        message: "chatId is required",
      });
    }

    if (!isAutoTradingActive()) {
      return res.json({
        success: true,
        message: "Auto trading disabled - RAG response not processed",
        auto_trading_enabled: false,
      });
    }

    // Get the latest RAG (assistant) message from the chat
    const latestRAGMessage = await Message.findOne({
      chatId: chatId,
      role: "assistant",
    })
      .sort({ createdAt: -1 })
      .limit(1);

    if (!latestRAGMessage) {
      return res.json({
        success: true,
        message: "No RAG response found in chat",
        processed: false,
      });
    }

    // Extract text content from the message
    const ragResponse =
      latestRAGMessage.content?.text || latestRAGMessage.content;

    if (!ragResponse) {
      return res.json({
        success: true,
        message: "RAG response has no text content",
        processed: false,
      });
    }

    console.log(`🔍 Processing latest RAG response from chat ${chatId}`);
    console.log(`📝 RAG response length: ${ragResponse.length} characters`);

    // Process the RAG response for trading signals
    await processRAGResponse(ragResponse, source || `CHAT_${chatId}`);

    res.json({
      success: true,
      message: "RAG response processed for trading signals",
      chat_id: chatId,
      response_length: ragResponse.length,
      status: getAutoTradingStatus(),
    });
  } catch (error) {
    console.error("💥 Error checking RAG response:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to check RAG response",
      error: error.message,
    });
  }
}
