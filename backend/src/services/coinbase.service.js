import WebSocket from "ws";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import axios from "axios";
import { generateJWT } from "../utils/coinbase.utils.js";
import { addCandle, getAllCompletedCandles } from "./candleBuffer.service.js";

// State tracking for candle completion detection
let lastKnownCandleStartTime = null;

/* Buy and sell functions */

export async function createOrder(payload) {
  try {
    console.log("This is the payload:", payload);

    // Hardcoded JWT token for testing
    const token = generateJWT(
      "api.coinbase.com",
      "/api/v3/brokerage/orders",
      "POST"
    );

    if (!token) {
      throw new Error("Failed to generate JWT token");
    }

    const url = "https://api.coinbase.com/api/v3/brokerage/orders";
    const { data } = await axios.post(url, payload, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      timeout: 10000,
    });
    console.log("This is the data:", data);

    if (data.success) {
      console.log("✅ Order created successfully:", data.success_response);
      return { success: true, data: data.success_response };
    } else {
      console.error("❌ Order creation failed:", data.error_response || data);
      return { success: false, error: data.error_response || data };
    }
  } catch (error) {
    console.error("💥 Order creation error:", error.message);
    if (error.response) {
      console.error("💥 Coinbase error details:", error.response.data);
      console.error("💥 Status:", error.response.status);
    }
    return { success: false, error: error.response?.data || error.message };
  }
}

export async function getOrders() {
  try {
    const token = generateJWT(
      "api.coinbase.com",
      "/api/v3/brokerage/orders/historical/fills",
      "GET"
    );
    if (!token) {
      throw new Error("Failed to generate JWT token");
    }

    const url =
      "https://api.coinbase.com/api/v3/brokerage/orders/historical/fills?product_ids=BTC-EUR&&limit=50";
    const { data } = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      timeout: 10000,
    });
    console.log("This is the data:", data);

    if (data.success) {
      console.log("✅ Orders retrieved successfully:", data.success_response);
      return { success: true, data: data.success_response };
    } else {
      console.error("❌ Order retrieval failed:", data.error_response || data);
      return { success: false, error: data.error_response || data };
    }
  } catch (error) {
    console.error("💥 Order retrieval error:", error.message);
    if (error.response) {
      console.error("💥 Coinbase error details:", error.response.data);
      console.error("💥 Status:", error.response.status);
    }
    return { success: false, error: error.response?.data || error.message };
  }
}

/* End of buy and sell functions */

/**
 * Check for candle completion and trigger RAG analysis
 * @param {Object} candleMessage - Raw WebSocket candle message
 */
async function checkForCandleCompletion(candleMessage) {
  try {
    if (
      !candleMessage.events ||
      !candleMessage.events[0] ||
      !candleMessage.events[0].candles
    ) {
      return;
    }

    const currentCandle = candleMessage.events[0].candles[0];
    const currentStartTime = parseInt(currentCandle.start);

    if (
      lastKnownCandleStartTime &&
      currentStartTime !== lastKnownCandleStartTime
    ) {
      // Candle completion detected!
      console.log(`🎯 CANDLE COMPLETION DETECTED!`);
      console.log(
        `   Previous: ${new Date(
          lastKnownCandleStartTime * 1000
        ).toISOString()}`
      );
      console.log(
        `   Current: ${new Date(currentStartTime * 1000).toISOString()}`
      );

      // Send completed candle to RAG
      await triggerRAGForCompletedCandle(lastKnownCandleStartTime);
    }

    // Update tracking
    lastKnownCandleStartTime = currentStartTime;
  } catch (error) {
    console.error("💥 Error in candle completion check:", error.message);
  }
}

/**
 * Send completed candle to RAG for analysis
 * @param {number} completedStartTime - Start time of completed candle
 */
async function triggerRAGForCompletedCandle(completedStartTime) {
  try {
    console.log(
      `🚀 COMPLETED 5-MIN CANDLE READY FOR RAG: ${new Date(
        completedStartTime * 1000
      ).toISOString()}`
    );
    console.log(`📊 Fetching actual OHLC data and emitting to frontend...`);

    // Get the completed candle data from buffer
    const completedCandlesArray = getAllCompletedCandles();
    if (!completedCandlesArray || completedCandlesArray.length === 0) {
      console.error("💥 No completed candle data available in buffer");
      return;
    }

    // Find the specific completed candle
    const completedCandle = completedCandlesArray.find(
      (candle) => candle.start_time === completedStartTime
    );

    // If we can't find the exact candle, use the most recent one
    const candleToAnalyze =
      completedCandle ||
      (completedCandlesArray.length > 0
        ? completedCandlesArray[completedCandlesArray.length - 1]
        : null);

    if (!candleToAnalyze) {
      console.error(`💥 No suitable candle found for analysis`);
      return;
    }

    if (!completedCandle) {
      console.log(
        `📊 Using most recent completed candle instead: ${new Date(
          candleToAnalyze.start_time * 1000
        ).toISOString()}`
      );
    }

    // Format the OHLC data for display
    const ohlcDisplay = `
📊 **COMPLETED 5-MINUTE CANDLE DATA:**
⏰ **Time**: ${new Date(candleToAnalyze.start_time * 1000).toISOString()}
📈 **Open**: $${candleToAnalyze.open.toLocaleString()}
📈 **High**: $${candleToAnalyze.high.toLocaleString()}
📉 **Low**: $${candleToAnalyze.low.toLocaleString()}
📈 **Close**: $${candleToAnalyze.close.toLocaleString()}
📊 **Volume**: ${candleToAnalyze.volume} BTC
🎯 **Product**: ${candleToAnalyze.product_id}
`;

    // Create completion event for frontend
    const completionEvent = {
      type: "candle_completed",
      timestamp: new Date().toISOString(),
      completed_candle_time: new Date(
        candleToAnalyze.start_time * 1000
      ).toISOString(),
      completed_start_time: candleToAnalyze.start_time,
      candle_data: candleToAnalyze,
      message: `🕯️ **NEW COMPLETED 5-MINUTE CANDLE DETECTED**

${ohlcDisplay}

**🎯 EVENT**: 5-minute candle just completed with final OHLCV values

This candle has just finished and represents the final OHLCV data for this 5-minute period. Please analyze this completed candle in the context of recent market trends and provide any trading insights or pattern observations.

**🔍 ANALYSIS REQUEST**: Based on the OHLC data above, please provide technical analysis for this newly completed 5-minute bar. Look for:
- **Candle Pattern**: Identify the candlestick pattern (doji, hammer, engulfing, etc.)
- **Support/Resistance**: Key levels tested or broken
- **Trend Analysis**: Continuation or reversal signals  
- **Volume Analysis**: Volume compared to recent averages
- **Entry/Exit Signals**: Specific trade opportunities
- **Risk Management**: Stop-loss and take-profit suggestions
- **Market Psychology**: What this candle tells us about buyer/seller sentiment

Please provide specific, actionable trading insights based on this exact candle data.`,
    };

    // Emit to all WebSocket listeners (including frontend)
    for (const fn of listeners) {
      try {
        fn(completionEvent);
      } catch (error) {
        console.error("💥 Error notifying listener:", error.message);
      }
    }

    console.log(
      `✅ Completion event with OHLC data emitted - frontend should auto-send to active chat`
    );
    console.log(
      `📊 Completed candle: O:$${candleToAnalyze.open} H:$${candleToAnalyze.high} L:$${candleToAnalyze.low} C:$${candleToAnalyze.close} V:${candleToAnalyze.volume}`
    );
  } catch (error) {
    console.error("💥 Error processing completed candle:", error.message);
  }
}

/* Websocket code */
let ws = null;
let lastMessage = null;
let lastUrl = "wss://advanced-trade-ws.coinbase.com";
const listeners = new Set();

const subscriptions = new Set();

const API_KEY = process.env.COINBASE_API_KEY; // organizations/{orgId}/apiKeys/{keyId}
const RAW = process.env.COINBASE_PRIVATE_KEY || "";
const SIGNING_KEY_PEM = RAW.replace(/\\n/g, "\n"); // real newlines
const USE_AUTH = !!(API_KEY && SIGNING_KEY_PEM);

function makeJwt() {
  if (!USE_AUTH) return undefined;
  return jwt.sign(
    {
      iss: "cdp",
      nbf: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 120,
      sub: API_KEY,
    },
    SIGNING_KEY_PEM,
    {
      algorithm: "ES256",
      header: { kid: API_KEY, nonce: crypto.randomBytes(16).toString("hex") },
    }
  );
}

function send(msg) {
  if (!ws || ws.readyState !== WebSocket.OPEN) return false;
  const jwt = USE_AUTH ? { jwt: makeJwt() } : {};
  ws.send(JSON.stringify({ ...msg, ...jwt }));
  return true;
}

export function connectToCoinbase(url = lastUrl) {
  lastUrl = url;
  ws = new WebSocket(url);

  ws.on("open", () => {
    console.log("✅ Connected to Coinbase Advanced Trade WebSocket");

    // Subscribe to heartbeats to keep connection alive
    console.log("🔔 Subscribing to heartbeats...");
    send({
      type: "subscribe",
      channel: "heartbeats",
      product_ids: ["BTC-USD"],
    });

    // re-subscribe to anything we were on before
    for (const key of subscriptions) {
      const [channel, list] = key.split("|");
      const product_ids = list.split(",");
      console.log(
        `🔄 Re-subscribing to ${channel} for ${product_ids.join(", ")}`
      );
      send({ type: "subscribe", channel, product_ids });
    }
  });

  ws.on("message", async (data) => {
    try {
      const msg = JSON.parse(data.toString());

      // Log different message types for debugging
      if (msg.channel === "candles") {
        console.log("🕯️ Received candles data - FULL PAYLOAD:");
        console.log(JSON.stringify(msg, null, 2));

        // Add candle to buffer for RAG analysis
        const added = addCandle(msg);
        if (added) {
          console.log("✅ Candle added to buffer successfully");
        }

        // Check for candle completion and trigger RAG analysis
        await checkForCandleCompletion(msg);
      } else if (msg.channel === "ticker") {
        console.log("📊 Received ticker data");
      } else if (msg.channel === "heartbeats") {
        console.log("💓 Heartbeat received");
      } else {
        console.log(
          "📨 Received message:",
          msg.channel || msg.type || "unknown"
        );
      }

      lastMessage = msg;
      for (const fn of listeners) fn(msg);
    } catch (e) {
      console.error("⚠️ WS parse error:", e.message);
    }
  });

  ws.on("close", () => {
    console.log("⚠️ WS closed. Reconnecting in 5s…");
    setTimeout(() => connectToCoinbase(lastUrl), 5000);
  });

  ws.on("error", (err) => {
    console.error("❌ WS error:", err.message);
  });
}

export function subscribe(channel, product_ids) {
  // e.g., subscribe("candles", ["BTC-USD"])
  console.log(
    `🔔 Subscribing to ${channel} channel for ${product_ids.join(", ")}`
  );
  const message = { type: "subscribe", channel, product_ids };
  console.log(
    "📤 Sending subscription message:",
    JSON.stringify(message, null, 2)
  );

  const ok = send(message);
  if (ok) {
    subscriptions.add(`${channel}|${product_ids.join(",")}`);
    console.log(
      `✅ Added to subscriptions: ${channel}|${product_ids.join(",")}`
    );
  } else {
    console.log("❌ Failed to send subscription message");
  }
  return ok;
}

export function unsubscribe(channel, product_ids = []) {
  console.log(
    `🚫 Unsubscribing from ${channel} channel for ${product_ids.join(", ")}`
  );
  const message = { type: "unsubscribe", channel, product_ids };
  console.log(
    "📤 Sending unsubscribe message:",
    JSON.stringify(message, null, 2)
  );

  const ok = send(message);
  // remove exact key or entire channel if product_ids empty
  if (ok) {
    if (product_ids.length) {
      const key = `${channel}|${product_ids.join(",")}`;
      subscriptions.delete(key);
      console.log(`✅ Removed from subscriptions: ${key}`);
    } else {
      for (const key of [...subscriptions]) {
        if (key.startsWith(`${channel}|`)) {
          subscriptions.delete(key);
          console.log(`✅ Removed from subscriptions: ${key}`);
        }
      }
    }
    console.log(`📋 Current subscriptions:`, Array.from(subscriptions));
  } else {
    console.log("❌ Failed to send unsubscribe message");
  }
  return ok;
}

export function onMessage(handler) {
  listeners.add(handler);
  return () => listeners.delete(handler); // <- per-listener unsubscribe
}

export function getLastMessage() {
  return lastMessage;
}

export function close() {
  try {
    ws?.close();
  } catch {}
  ws = null;
}
/* End of websocket code */
