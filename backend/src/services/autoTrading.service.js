/**
 * Automated Trading Service
 * Orchestrates RAG response parsing, signal management, ticker monitoring, and trade execution
 */

import { extractTradingSignal } from "./signalExtractor.service.js";
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
 * Process RAG response for trading signals
 * @param {string} ragResponse - RAG's latest trading analysis
 * @param {string} source - Source identifier (e.g., chat ID)
 */
export async function processRAGResponse(ragResponse, source = "unknown") {
  try {
    if (!isAutoTradingEnabled) {
      console.log("⚠️ Auto trading disabled, skipping RAG processing");
      return;
    }

    console.log("🔍 Processing RAG response for trading signals...");

    // Extract trading signal from RAG response (no additional OpenAI call needed)
    const extractedSignal = extractTradingSignal(ragResponse);

    if (!extractedSignal) {
      console.error("💥 Failed to extract trading signal");
      return;
    }

    // Clear any existing signal (new 5-min analysis overwrites previous)
    clearActiveSignal("NEW_5MIN_ANALYSIS");

    // Set new active signal if actionable
    if (extractedSignal.action === "BUY" || extractedSignal.action === "SELL") {
      const signalSet = setActiveSignal(extractedSignal, source);

      if (signalSet) {
        console.log(
          `🎯 New trading signal activated: ${extractedSignal.action}`
        );

        // Start ticker monitoring if we have a conditional signal
        if (
          extractedSignal.trigger_type &&
          extractedSignal.trigger_type !== "IMMEDIATE"
        ) {
          startTickerMonitoring();
        } else if (extractedSignal.trigger_type === "IMMEDIATE") {
          // Execute immediately
          await executeSignalImmediately(extractedSignal);
        }
      }
    } else {
      console.log("⚪ RAG signal: WAIT - No trading action required");
    }
  } catch (error) {
    console.error("💥 Error processing RAG response:", error.message);
  }
}

/**
 * Monitor ticker data for signal triggers
 * @param {Object} tickerData - Real-time ticker data
 */
export function monitorTickerForSignals(tickerData) {
  try {
    if (!isAutoTradingEnabled || !tickerMonitoringActive) {
      return;
    }

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
 * Get auto trading status
 * @returns {Object} Complete trading engine status
 */
export function getAutoTradingStatus() {
  return {
    auto_trading_enabled: isAutoTradingEnabled,
    ticker_monitoring_active: tickerMonitoringActive,
    last_processed_message: lastProcessedMessageId,
    signal_status: getSignalStatus(),
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
