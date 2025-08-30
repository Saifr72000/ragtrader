import { createOrder } from "./coinbase.service.js";

// Trading constants
const TRADING_CONFIG = {
  BTC_POSITION_SIZE: "0.00010246", // Fixed BTC amount - never exceed this
  PRODUCT_ID: "BTC-USD",
  ORDER_TYPE: "market_market_ioc",
};

/**
 * Execute a buy order based on RAG signal
 * @param {Object} signal - RAG trading signal
 * @param {string} signal.entry - Entry price level
 * @param {string} signal.pattern - Trading pattern identified
 * @returns {Object} Order result
 */
export async function executeBuySignal(signal) {
  try {
    console.log(`🎯 Executing BUY signal for pattern: ${signal.pattern}`);
    console.log(`📍 Entry level: ${signal.entry}`);

    const orderPayload = {
      product_id: TRADING_CONFIG.PRODUCT_ID,
      side: "BUY",
      order_configuration: {
        market_market_ioc: {
          base_size: TRADING_CONFIG.BTC_POSITION_SIZE, // Hardcoded BTC amount
        },
      },
    };

    console.log("📤 Sending BUY order:", JSON.stringify(orderPayload, null, 2));

    const result = await createOrder(orderPayload);

    if (result.success) {
      console.log("✅ BUY order executed successfully:", result.data);
      return {
        success: true,
        orderId: result.data.order_id,
        btcAmount: TRADING_CONFIG.BTC_POSITION_SIZE,
        signal: signal,
      };
    } else {
      console.error("❌ BUY order failed:", result.error);
      return { success: false, error: result.error };
    }
  } catch (error) {
    console.error("💥 Execute buy signal error:", error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Execute a sell order based on RAG signal
 * @param {Object} signal - RAG trading signal
 * @param {string} signal.exit - Exit price level
 * @returns {Object} Order result
 */
export async function executeSellSignal(signal) {
  try {
    console.log(`🎯 Executing SELL signal for pattern: ${signal.pattern}`);
    console.log(`📍 Exit level: ${signal.exit}`);

    const orderPayload = {
      product_id: TRADING_CONFIG.PRODUCT_ID,
      side: "SELL",
      order_configuration: {
        market_market_ioc: {
          base_size: TRADING_CONFIG.BTC_POSITION_SIZE, // Same hardcoded amount
        },
      },
    };

    console.log(
      "📤 Sending SELL order:",
      JSON.stringify(orderPayload, null, 2)
    );

    const result = await createOrder(orderPayload);

    if (result.success) {
      console.log("✅ SELL order executed successfully:", result.data);
      return {
        success: true,
        orderId: result.data.order_id,
        btcAmount: TRADING_CONFIG.BTC_POSITION_SIZE,
        signal: signal,
      };
    } else {
      console.error("❌ SELL order failed:", result.error);
      return { success: false, error: result.error };
    }
  } catch (error) {
    console.error("💥 Execute sell signal error:", error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Calculate position value in USD
 * @param {number} btcPrice - Current BTC price
 * @returns {number} Position value in USD
 */
export function calculatePositionValue(btcPrice) {
  const btcAmount = parseFloat(TRADING_CONFIG.BTC_POSITION_SIZE);
  return btcAmount * btcPrice;
}

/**
 * Get trading configuration
 */
export function getTradingConfig() {
  return TRADING_CONFIG;
}
