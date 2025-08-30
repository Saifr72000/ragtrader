import {
  connectToCoinbase,
  subscribe,
  unsubscribe,
  onMessage,
  getLastMessage,
  close,
  createOrder,
  getOrders,
} from "../services/coinbase.service.js";
import { generateJWT } from "../utils/coinbase.utils.js";
import {
  getForRAGAnalysis,
  getStatus,
  reset,
  getCurrentLiveCandle,
  getAllCompletedCandles,
  getAvailableCandles,
  getRawCandleData,
} from "../services/candleBuffer.service.js";
import {
  start,
  stop,
  getTradingStatus,
  getRecentTrades as getTradingRecentTrades,
} from "../services/tradingEngine.service.js";
import axios from "axios";

/** GET /api/coinbase/ws/connect */
export function connect(req, res) {
  connectToCoinbase(); // no-op if already connected
  res.json({ ok: true, msg: "WS connecting/connected" });
}

/** POST /api/coinbase/ws/subscribe
 * body: { channel: "candles" | "ticker" | "level2", product_ids: ["BTC-USD","ETH-USD"] }
 */
export function subscribeRoute(req, res) {
  const { channel, product_ids } = req.body || {};
  if (!channel || !Array.isArray(product_ids) || product_ids.length === 0) {
    return res
      .status(400)
      .json({ ok: false, msg: "channel and product_ids[] required" });
  }
  const ok = subscribe(channel, product_ids);
  res.json({ ok, channel, product_ids });
}

/** POST /api/coinbase/ws/unsubscribe
 * body: { channel: "candles", product_ids?: ["BTC-USD"] }  // omit product_ids to unsubscribe whole channel
 */
export function unsubscribeRoute(req, res) {
  const { channel, product_ids = [] } = req.body || {};
  if (!channel)
    return res.status(400).json({ ok: false, msg: "channel required" });
  const ok = unsubscribe(channel, product_ids);
  res.json({ ok, channel, product_ids });
}

/** GET /api/coinbase/ws/last */
export function lastMessage(req, res) {
  res.json({ ok: true, last: getLastMessage() });
}

/** GET /api/coinbase/ws/stream  (Optional SSE stream for frontend) */
export function sseStream(req, res) {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();

  const off = onMessage((msg) => {
    res.write(`data: ${JSON.stringify(msg)}\n\n`);
  });

  // send a hello event immediately
  res.write(`event: init\ndata: ${JSON.stringify({ ok: true })}\n\n`);

  req.on("close", () => {
    off(); // unsubscribe this client's listener
    res.end();
  });
}

/** POST /api/coinbase/orders
 * body: {
 *   product_id: "BTC-USD",
 *   side: "BUY" | "SELL",
 *   order_type: "market_market_ioc" | "limit_limit_gtc",
 *   size?: "0.001",
 *   quote_size?: "10.00",
 *   limit_price?: "50000.00"
 * }
 */
export async function createOrderController(req, res) {
  try {
    const payload = {
      ...req.body,
    };

    const result = await createOrder(payload);
    res.json(result);
  } catch (error) {
    console.error("Order controller error:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
}

/** GET /api/coinbase/accounts - Get all accounts and balances */
export async function getAccounts(req, res) {
  try {
    console.log("🏦 Fetching Coinbase accounts...");

    // Generate JWT token for accounts endpoint
    const token = generateJWT(
      "api.coinbase.com",
      "/api/v3/brokerage/accounts",
      "GET"
    );
    console.log(
      "🎫 Generated JWT token:",
      token ? token.substring(0, 50) + "..." : "NO TOKEN"
    );

    const response = await axios.get(
      "https://api.coinbase.com/api/v3/brokerage/accounts",
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        timeout: 10000,
      }
    );

    console.log(
      "✅ Accounts response:",
      JSON.stringify(response.data, null, 2)
    );
    res.json({
      success: true,
      data: response.data,
      message: "Accounts fetched successfully",
    });
  } catch (error) {
    console.error("❌ Accounts error:", error.message);
    if (error.response) {
      console.error("💥 Coinbase accounts error details:", error.response.data);
      console.error("💥 Status:", error.response.status);
    }
    res.status(error.response?.status || 500).json({
      success: false,
      error: error.response?.data || error.message,
    });
  }
}

export async function getOrdersController(req, res) {
  try {
    const result = await getOrders();
    res.json(result);
  } catch (error) {
    console.error("Order retrieval error:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
}

/** GET /api/coinbase/candles/status - Get candle buffer status */
export async function getCandleBufferStatus(req, res) {
  try {
    const status = getStatus();
    const stats = null; // Removed getPriceStats - can be calculated from candles if needed

    res.json({
      success: true,
      buffer: status,
      priceStats: stats,
      message: status.isReady
        ? "Buffer ready for RAG analysis"
        : `Collecting candles: ${status.count}/${status.maxSize}`,
    });
  } catch (error) {
    console.error("❌ Candle buffer status error:", error.message);
    res.status(500).json({
      success: false,
      error: "Failed to get candle buffer status",
    });
  }
}

/** GET /api/coinbase/candles/data - Get candles for RAG analysis */
export async function getCandleDataForRAG(req, res) {
  try {
    const ragData = getForRAGAnalysis();

    if (!ragData.success) {
      return res.status(400).json({
        success: false,
        message: ragData.message,
        progress: getStatus().progress,
      });
    }

    res.json({
      success: true,
      data: ragData.data,
      message: "Completed candle data ready for RAG analysis",
    });
  } catch (error) {
    console.error("💥 Error getting candle data for RAG:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to get candle data",
      error: error.message,
    });
  }
}

/** GET /api/coinbase/candles/available - Get any available candles (immediate) */
export async function getAvailableCandleData(req, res) {
  try {
    const candleData = getAvailableCandles();

    if (!candleData.success) {
      return res.status(400).json(candleData);
    }

    res.json({
      success: true,
      data: candleData.data,
      message: candleData.data.ready
        ? "Buffer ready - returning completed candles"
        : "Buffer collecting - returning available candles",
    });
  } catch (error) {
    console.error("💥 Error getting available candle data:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to get available candle data",
      error: error.message,
    });
  }
}

/** GET /api/coinbase/candles/raw - Get raw WebSocket candle data (exactly as received) */
export async function getRawCandleDataForRAG(req, res) {
  try {
    const rawData = getRawCandleData();

    if (!rawData.success) {
      return res.status(400).json(rawData);
    }

    res.json({
      success: true,
      data: rawData.data,
      message: "Raw WebSocket candle data from Coinbase API",
    });
  } catch (error) {
    console.error("💥 Error getting raw candle data:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to get raw candle data",
      error: error.message,
    });
  }
}

/** POST /api/coinbase/trading/start - Start automated trading engine */
export async function startTradingEngine(req, res) {
  try {
    const result = await start();

    if (result.success) {
      res.json({
        success: true,
        message: result.message,
        status: getTradingStatus(),
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.message || result.error,
      });
    }
  } catch (error) {
    console.error("❌ Start trading engine error:", error.message);
    res.status(500).json({
      success: false,
      error: "Failed to start trading engine",
    });
  }
}

/** POST /api/coinbase/trading/stop - Stop automated trading engine */
export async function stopTradingEngine(req, res) {
  try {
    const result = stop();

    res.json({
      success: true,
      message: result.message,
      status: tradingEngine.getStatus(),
    });
  } catch (error) {
    console.error("❌ Stop trading engine error:", error.message);
    res.status(500).json({
      success: false,
      error: "Failed to stop trading engine",
    });
  }
}

/** GET /api/coinbase/trading/status - Get trading engine status */
export async function getTradingEngineStatus(req, res) {
  try {
    const status = getTradingStatus();
    const recentTrades = getTradingRecentTrades(5);

    res.json({
      success: true,
      status: status,
      recentTrades: recentTrades,
    });
  } catch (error) {
    console.error("❌ Get trading status error:", error.message);
    res.status(500).json({
      success: false,
      error: "Failed to get trading status",
    });
  }
}

/** GET /api/coinbase/trading/trades - Get recent trades */
export async function getRecentTrades(req, res) {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const trades = tradingEngine.getRecentTrades(limit);

    res.json({
      success: true,
      trades: trades,
      total: trades.length,
    });
  } catch (error) {
    console.error("❌ Get recent trades error:", error.message);
    res.status(500).json({
      success: false,
      error: "Failed to get recent trades",
    });
  }
}
