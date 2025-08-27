import {
  connectToCoinbase,
  subscribe,
  unsubscribe,
  onMessage,
  getLastMessage,
  close,
  createOrder,
} from "../services/coinbase.service.js";

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
