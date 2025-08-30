import { getStatus } from "./candleBuffer.service.js";
import { executeBuySignal, executeSellSignal } from "./trading.service.js";
import { onMessage } from "./coinbase.service.js";

/**
 * Trading Engine - Functional Programming Style
 * Orchestrates automated trading flow with manual analysis via chat
 */

// Module state (instead of class properties)
let isActive = false;
let activeSignals = [];
let executedTrades = [];
let lastAnalysis = null;
let analysisInterval = null;
let wsUnsubscribe = null;

// Configuration
const config = {
  analysisIntervalMs: 90000, // 90 seconds between RAG analyses
  minConfidence: 75, // Minimum signal confidence
  maxActiveSignals: 5, // Maximum concurrent signals
  enablePaperTrading: true, // Set false for real trading
  priceTolerancePercent: 0.001, // 0.1% price tolerance for triggers
};

console.log("🚀 Trading Engine initialized with config:", config);

/**
 * Start the automated trading engine
 */
export async function start() {
  try {
    if (isActive) {
      console.log("⚠️ Trading engine already active");
      return { success: false, message: "Already running" };
    }

    console.log("🚀 Starting Trading Engine...");
    isActive = true;

    // Subscribe to WebSocket messages for price monitoring
    wsUnsubscribe = onMessage((message) => {
      handleWebSocketMessage(message);
    });

    // Trading engine is now active and monitoring
    // Manual analysis via chat system when user sends candle data

    console.log("✅ Trading Engine started successfully");
    return { success: true, message: "Trading engine started" };
  } catch (error) {
    console.error("💥 Failed to start trading engine:", error.message);
    isActive = false;
    return { success: false, error: error.message };
  }
}

/**
 * Stop the trading engine
 */
export function stop() {
  try {
    console.log("🛑 Stopping Trading Engine...");

    isActive = false;
    activeSignals = [];

    // Clean up any intervals if they exist
    if (analysisInterval) {
      clearInterval(analysisInterval);
      analysisInterval = null;
    }

    // Unsubscribe from WebSocket
    if (wsUnsubscribe) {
      wsUnsubscribe();
      wsUnsubscribe = null;
    }

    console.log("✅ Trading Engine stopped");
    return { success: true, message: "Trading engine stopped" };
  } catch (error) {
    console.error("💥 Error stopping trading engine:", error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Update active trading signals
 * @param {Array} newSignals - New signals from RAG analysis
 */
export function updateActiveSignals(newSignals) {
  // Clear old signals
  activeSignals = [];

  // Add new valid signals
  newSignals.forEach((signal) => {
    if (activeSignals.length < config.maxActiveSignals) {
      activeSignals.push(signal);
    }
  });

  console.log(
    `🔄 Active signals updated: ${activeSignals.length} signals loaded`
  );
}

/**
 * Handle incoming WebSocket messages for price monitoring
 * @param {Object} message - WebSocket message
 */
function handleWebSocketMessage(message) {
  try {
    // Only process relevant messages when trading engine is active
    if (!isActive) {
      return;
    }

    // Handle TICKER channel for precise trigger detection
    if (message.channel === "ticker") {
      const tickerEvent = message.events?.[0];
      if (!tickerEvent || tickerEvent.type !== "update") {
        return;
      }

      const ticker = tickerEvent.tickers?.[0];
      if (!ticker) {
        return;
      }

      const currentPrice = parseFloat(ticker.price);
      const bestBid = parseFloat(ticker.best_bid);
      const bestAsk = parseFloat(ticker.best_ask);

      console.log(
        `🎯 TRADING ENGINE - TICKER: $${currentPrice} (Bid: ${bestBid}, Ask: ${bestAsk})`
      );

      // Check all active signals for triggers using real-time price
      checkSignalTriggers(currentPrice);

      return; // Don't process candles if we have ticker data
    }

    // Handle CANDLES channel for additional context (fallback)
    if (message.channel === "candles") {
      const candleEvent = message.events?.[0];
      if (!candleEvent) {
        return;
      }

      // For trading triggers, we want BOTH snapshot and update events
      // - UPDATE: Real-time price movements for immediate trigger detection
      // - SNAPSHOT: Completed candles that might trigger end-of-candle signals
      if (candleEvent.type !== "snapshot" && candleEvent.type !== "update") {
        return;
      }

      const candle = candleEvent.candles?.[0];
      if (!candle) {
        return;
      }

      const currentPrice = parseFloat(candle.close);
      const currentHigh = parseFloat(candle.high);
      const currentLow = parseFloat(candle.low);
      const currentVolume = parseFloat(candle.volume);

      // Log different types of price events
      if (candleEvent.type === "update") {
        console.log(
          `📊 TRADING ENGINE - CANDLE UPDATE: $${currentPrice} (H:${currentHigh} L:${currentLow} V:${currentVolume})`
        );
      } else if (candleEvent.type === "snapshot") {
        console.log(
          `🏁 TRADING ENGINE - COMPLETED CANDLE: $${currentPrice} (Final OHLCV)`
        );
      }

      // Check all active signals for triggers using candle price (fallback if no ticker)
      checkSignalTriggers(currentPrice);
    }
  } catch (error) {
    console.error("💥 Error handling WebSocket message:", error.message);
  }
}

/**
 * Check if current price triggers any active signals
 * @param {number} currentPrice - Current BTC price
 */
async function checkSignalTriggers(currentPrice) {
  const triggeredSignals = [];

  for (const signal of activeSignals) {
    if (signal.executed) continue;

    const shouldTrigger = shouldTriggerSignal(signal, currentPrice);

    if (shouldTrigger) {
      console.log(
        `🎯 TRIGGER HIT! ${signal.action} signal at ${currentPrice} (target: ${signal.trigger_price})`
      );
      console.log(
        `📋 Pattern: ${signal.pattern} | Confidence: ${signal.confidence}%`
      );

      triggeredSignals.push(signal);
    }
  }

  // Execute triggered signals
  for (const signal of triggeredSignals) {
    await executeSignal(signal, currentPrice);
  }
}

/**
 * Determine if a signal should be triggered
 * @param {Object} signal - Trading signal
 * @param {number} currentPrice - Current price
 * @returns {boolean} Should trigger
 */
function shouldTriggerSignal(signal, currentPrice) {
  const tolerance = signal.trigger_price * (config.priceTolerancePercent / 100);

  if (signal.action === "BUY") {
    // Buy when price crosses above trigger level
    return currentPrice >= signal.trigger_price - tolerance;
  } else if (signal.action === "SELL") {
    // Sell when price crosses below trigger level
    return currentPrice <= signal.trigger_price + tolerance;
  }

  return false;
}

/**
 * Execute a triggered trading signal
 * @param {Object} signal - Trading signal to execute
 * @param {number} actualPrice - Actual execution price
 */
async function executeSignal(signal, actualPrice) {
  try {
    signal.executed = true;
    signal.execution_time = new Date().toISOString();
    signal.execution_price = actualPrice;

    console.log(`🚀 EXECUTING ${signal.action} ORDER`);
    console.log(
      `📊 Signal: ${signal.pattern} | Price: ${actualPrice} | Confidence: ${signal.confidence}%`
    );

    if (config.enablePaperTrading) {
      // Paper trading - log only
      console.log("📝 PAPER TRADE - No real order placed");

      const paperResult = {
        success: true,
        orderId: `paper_${Date.now()}`,
        btcAmount: "0.00010246",
        executionPrice: actualPrice,
        signal: signal,
      };

      recordTrade(paperResult, signal);
    } else {
      // Real trading
      let result;

      if (signal.action === "BUY") {
        result = await executeBuySignal(signal);
      } else if (signal.action === "SELL") {
        result = await executeSellSignal(signal);
      }

      recordTrade(result, signal);
    }
  } catch (error) {
    console.error("💥 Signal execution error:", error.message);
    signal.execution_error = error.message;
  }
}

/**
 * Record executed trade
 * @param {Object} tradeResult - Result from order execution
 * @param {Object} signal - Original trading signal
 */
function recordTrade(tradeResult, signal) {
  const trade = {
    timestamp: new Date().toISOString(),
    signal: signal,
    result: tradeResult,
    paperTrade: config.enablePaperTrading,
  };

  executedTrades.push(trade);

  console.log(
    `📊 Trade recorded: ${signal.action} | Success: ${tradeResult.success}`
  );

  // Keep only last 100 trades
  if (executedTrades.length > 100) {
    executedTrades = executedTrades.slice(-100);
  }
}

/**
 * Log active signals for debugging
 */
export function logActiveSignals() {
  if (activeSignals.length === 0) {
    console.log("📊 No active trading signals");
    return;
  }

  console.log("📊 Active Trading Signals:");
  activeSignals.forEach((signal, index) => {
    console.log(
      `   ${index + 1}. ${signal.action} at ${signal.trigger_price} | ${
        signal.pattern
      } | ${signal.confidence}%`
    );
  });
}

/**
 * Get trading engine status
 * @returns {Object} Current status
 */
export function getTradingStatus() {
  return {
    isActive: isActive,
    config: config,
    activeSignals: activeSignals.length,
    executedTrades: executedTrades.length,
    lastAnalysis: lastAnalysis
      ? {
          timestamp: lastAnalysis.timestamp,
          success: lastAnalysis.success,
          signalsFound: lastAnalysis.analysis?.active_signals?.length || 0,
        }
      : null,
    candleBuffer: getStatus(),
  };
}

/**
 * Get recent trades
 * @param {number} limit - Number of recent trades to return
 * @returns {Array} Recent trades
 */
export function getRecentTrades(limit = 10) {
  return executedTrades.slice(-limit);
}
