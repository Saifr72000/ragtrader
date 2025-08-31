/**
 * Automated Trading Service
 * Orchestrates RAG response parsing, signal management, ticker monitoring, and trade execution
 */

import { executeTradingFunction } from "./functionExecutor.service.js";
import {
  checkAllTriggers,
  getActiveTriggers,
  clearAllTriggers,
  getMonitoringStats,
  getExecutionHistory,
} from "./priceMonitor.service.js";
import { runChatCompletion } from "../utils/openai.utils.js";
import {
  setActiveSignal,
  getActiveSignal,
  clearActiveSignal,
  triggerSignal,
  markSignalExecuted,
  markSignalFailed,
  getSignalStatus,
} from "./signalManager.service.js";
import { createOrder } from "./coinbase.service.js";

// Trading engine state
let isAutoTradingEnabled = false;
let lastProcessedMessageId = null;
let tickerMonitoringActive = false;

/**
 * Initialize auto trading - called when system starts
 */
export function initializeAutoTrading() {
  isAutoTradingEnabled = true;
  console.log("🚀 Auto trading initialized and enabled by default");
}

/**
 * Enable automated trading
 */
export function enableAutoTrading() {
  isAutoTradingEnabled = true;
  console.log("🚀 Automated trading ENABLED");
}

/**
 * Disable automated trading
 */
export function disableAutoTrading() {
  isAutoTradingEnabled = false;
  clearActiveSignal("AUTO_TRADING_DISABLED");
  console.log("🛑 Automated trading DISABLED");
}

/**
 * Check if auto trading is enabled
 * @returns {boolean} Auto trading status
 */
export function isAutoTradingActive() {
  return isAutoTradingEnabled;
}

/**
 * Process RAG response using AI Agent Function Calling
 * @param {string} ragResponse - RAG's latest trading analysis message content
 * @param {string} source - Source identifier (e.g., chat ID)
 * @param {Object} tickerData - Current live ticker data
 */
export async function processRAGResponse(
  ragResponse,
  source = "unknown",
  tickerData = null
) {
  try {
    if (!isAutoTradingEnabled) {
      console.log("⚠️ Auto trading disabled, skipping RAG processing");
      return { success: false, reason: "Auto trading disabled" };
    }

    console.log("🤖 Processing RAG response with AI Agent Function Calling...");
    console.log(`📊 Source: ${source}`);

    if (!tickerData) {
      console.warn(
        "⚠️ No ticker data provided - function calling needs live market context"
      );
      return {
        success: false,
        reason: "Live ticker data required for AI agent",
      };
    }

    // Use function calling to let AI agent make trading decisions
    const messages = [
      {
        role: "user",
        content: `Based on this completed 5-minute candle analysis, make your trading decision:

${ragResponse}

Current market context:
- Live Price: $${tickerData.price}
- 24h Change: ${tickerData.price_percent_change_24_h}%
- Volume: ${tickerData.volume_24h} BTC

Use your function calling capabilities to execute the appropriate trading action based on this analysis.`,
      },
    ];

    console.log("🚀 Sending analysis to AI Agent with function calling...");

    // Call OpenAI with function calling enabled
    const aiResponse = await runChatCompletion({
      messages,
      tickerData,
      useFunctionCalling: true,
    });

    // Check if AI called a function
    if (aiResponse.message.function_call) {
      console.log(
        `🎯 AI Agent made a function call: ${aiResponse.message.function_call.name}`
      );

      // Execute the function call
      const functionResult = await executeTradingFunction(
        aiResponse.message.function_call,
        tickerData
      );

      console.log("✅ Function execution result:", functionResult);

      // Clear old signals since we're using the new price monitoring system
      clearActiveSignal("AI_AGENT_NEW_DECISION");

      return {
        success: true,
        ai_function_called: aiResponse.message.function_call.name,
        function_arguments: JSON.parse(
          aiResponse.message.function_call.arguments
        ),
        execution_result: functionResult,
        source,
        timestamp: new Date().toISOString(),
      };
    } else {
      // AI chose not to call any functions (likely wait_for_confirmation)
      console.log("⏸️ AI Agent chose to wait - no function called");
      console.log("💬 AI Response:", aiResponse.message.content);

      // Clear any active triggers since AI is waiting
      clearAllTriggers();
      clearActiveSignal("AI_AGENT_WAITING");

      return {
        success: true,
        ai_decision: "WAIT",
        ai_reasoning: aiResponse.message.content,
        source,
        timestamp: new Date().toISOString(),
      };
    }
  } catch (error) {
    console.error("💥 Error in AI Agent processing:", error.message);
    return {
      success: false,
      error: error.message,
      source,
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Monitor ticker data for AI Agent triggers (Real-time execution engine)
 * @param {Object} tickerData - Real-time ticker data
 */
export async function monitorTickerForSignals(tickerData) {
  try {
    if (!isAutoTradingEnabled) {
      return;
    }

    // Use the new price monitoring system for real-time trigger checking
    await checkAllTriggers(tickerData);

    // Legacy signal monitoring (keep for backward compatibility)
    const activeSignal = getActiveSignal();
    if (!activeSignal || activeSignal.status !== "ACTIVE") {
      return;
    }

    // Extract current price from ticker
    const currentPrice = parseFloat(tickerData.price);
    if (isNaN(currentPrice)) {
      console.warn("⚠️ Invalid ticker price data");
      return;
    }

    // Check if signal should trigger
    const shouldTrigger = checkSignalTrigger(activeSignal, currentPrice);

    if (shouldTrigger) {
      console.log(`🎯 SIGNAL TRIGGER DETECTED! Price: $${currentPrice}`);
      executeTriggeredSignal(activeSignal, currentPrice);
    }
  } catch (error) {
    console.error("💥 Error monitoring ticker for signals:", error.message);
  }
}

/**
 * Check if signal should trigger based on current price
 * @param {Object} signal - Active signal
 * @param {number} currentPrice - Current market price
 * @returns {boolean} Whether signal should trigger
 */
function checkSignalTrigger(signal, currentPrice) {
  if (!signal.trigger_type || !signal.trigger_price) {
    return false;
  }

  const triggerPrice = signal.trigger_price;

  switch (signal.trigger_type) {
    case "ABOVE":
      return currentPrice > triggerPrice;

    case "BELOW":
      return currentPrice < triggerPrice;

    case "EQUAL":
      // Allow small tolerance for "equal" (within 0.01%)
      const tolerance = triggerPrice * 0.0001;
      return Math.abs(currentPrice - triggerPrice) <= tolerance;

    default:
      return false;
  }
}

/**
 * Execute triggered signal
 * @param {Object} signal - Triggered signal
 * @param {number} triggerPrice - Price at which signal triggered
 */
async function executeTriggeredSignal(signal, triggerPrice) {
  try {
    // Mark signal as triggered
    const triggeredSignal = triggerSignal(triggerPrice);

    if (!triggeredSignal) {
      console.error("💥 Failed to trigger signal");
      return;
    }

    // Execute the trade
    await executeTrade(triggeredSignal);

    // Stop ticker monitoring for this signal
    stopTickerMonitoring();
  } catch (error) {
    console.error("💥 Error executing triggered signal:", error.message);
    markSignalFailed(`Execution error: ${error.message}`);
  }
}

/**
 * Execute signal immediately (no ticker monitoring)
 * @param {Object} signal - Signal to execute
 */
async function executeSignalImmediately(signal) {
  try {
    console.log("⚡ Executing signal immediately...");
    await executeTrade(signal);
  } catch (error) {
    console.error("💥 Error executing immediate signal:", error.message);
    markSignalFailed(`Immediate execution error: ${error.message}`);
  }
}

/**
 * Execute the actual trade order
 * @param {Object} signal - Signal to execute
 */
async function executeTrade(signal) {
  try {
    console.log(`📊 Executing ${signal.action} trade...`);

    // Generate unique client order ID
    const clientOrderId = `auto_trade_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    // Prepare order payload using your specified format
    const orderPayload = {
      client_order_id: clientOrderId,
      product_id: "BTC-EUR",
      side: signal.action, // "BUY" or "SELL"
      order_configuration: {
        market_market_ioc: {
          base_size: "0.00010246",
        },
      },
    };

    console.log(`📤 Submitting order:`, orderPayload);

    // Execute order via Coinbase API
    const orderResult = await createOrder(orderPayload);

    if (orderResult.success) {
      console.log(`✅ Trade executed successfully!`);
      console.log(`📊 Order ID: ${orderResult.data?.order_id || "Unknown"}`);

      // Mark signal as executed
      markSignalExecuted({
        order_id: orderResult.data?.order_id,
        client_order_id: clientOrderId,
        side: signal.action,
        base_size: "0.00010246",
        product_id: "BTC-EUR",
        execution_time: new Date().toISOString(),
        api_response: orderResult.data,
      });
    } else {
      console.error(`❌ Trade execution failed:`, orderResult.error);
      markSignalFailed(`API error: ${orderResult.error}`);
    }
  } catch (error) {
    console.error("💥 Trade execution error:", error.message);
    markSignalFailed(`Trade error: ${error.message}`);
  }
}

/**
 * Start ticker monitoring
 */
function startTickerMonitoring() {
  tickerMonitoringActive = true;
  console.log("👁️ Ticker monitoring STARTED");
}

/**
 * Stop ticker monitoring
 */
function stopTickerMonitoring() {
  tickerMonitoringActive = false;
  console.log("👁️ Ticker monitoring STOPPED");
}

/**
 * Get auto trading status including AI Agent monitoring
 * @returns {Object} Complete trading engine status
 */
export function getAutoTradingStatus() {
  const monitoringStats = getMonitoringStats();
  const activeTriggers = getActiveTriggers();
  const executionHistory = getExecutionHistory();

  return {
    auto_trading_enabled: isAutoTradingEnabled,
    ticker_monitoring_active: tickerMonitoringActive,
    last_processed_message: lastProcessedMessageId,
    signal_status: getSignalStatus(),
    // New AI Agent monitoring data
    ai_agent_mode: true,
    price_monitoring: {
      active_triggers: activeTriggers.length,
      monitoring_stats: monitoringStats,
      recent_triggers: activeTriggers.slice(0, 5), // Show last 5 triggers
    },
    execution_history: {
      total_executions: executionHistory.length,
      recent_executions: executionHistory.slice(-5), // Show last 5 executions
      success_rate: monitoringStats.success_rate,
    },
  };
}

/**
 * Emergency stop - disable trading and clear all signals
 */
export function emergencyStop() {
  console.log("🚨 EMERGENCY STOP ACTIVATED");
  disableAutoTrading();
  stopTickerMonitoring();
  clearActiveSignal("EMERGENCY_STOP");

  // Clear all AI Agent price triggers
  clearAllTriggers();
  console.log("🧹 All AI Agent price triggers cleared");
}

/**
 * Test the trading system with a sample RAG response
 * @param {string} testResponse - Test RAG response
 */
export async function testTradingSystem(testResponse) {
  console.log("🧪 Testing trading system...");
  console.log("📝 Test RAG Response:", testResponse);

  // Temporarily enable auto trading for test
  const wasEnabled = isAutoTradingEnabled;
  enableAutoTrading();

  try {
    await processRAGResponse(testResponse, "TEST");
    console.log("🎯 Trading system test completed");
    console.log("📊 Status:", getAutoTradingStatus());
  } finally {
    // Restore original state
    if (!wasEnabled) {
      disableAutoTrading();
    }
  }
}
