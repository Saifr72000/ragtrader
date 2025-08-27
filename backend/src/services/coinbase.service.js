import WebSocket from "ws";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import axios from "axios";
import { generateJWT } from "../utils/coinbase.utils.js";

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

  ws.on("message", (data) => {
    try {
      const msg = JSON.parse(data.toString());

      // Log different message types for debugging
      if (msg.channel === "candles") {
        console.log("🕯️ Received candles data:", JSON.stringify(msg, null, 2));
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
