import { createOrder } from "./coinbase.service.js";
import { v4 as uuidv4 } from "uuid";

// Trading constants
const TRADING_CONFIG = {
  BTC_POSITION_SIZE: "0.00010246", // Fixed BTC amount - never exceed this
  PRODUCT_ID: "BTC-USD",
  ORDER_TYPE: "market_market_ioc",
};

export async function executeBuySignal(args) {
  const client_order_id = uuidv4();

  try {
    const orderPayload = {
      client_order_id: client_order_id,
      product_id: TRADING_CONFIG.PRODUCT_ID,
      side: args.action,
      order_configuration: {
        trigger_bracket_gtc: {
          base_size: TRADING_CONFIG.BTC_POSITION_SIZE,
          limit_price: `${args.take_profit}`, // TAKE PROFIT
          stop_trigger_price: `${args.trigger_price}`, // ENTRY trigger
        },
      },
      attached_order_configuration: {
        stop_limit_stop_limit_gtc: {
          base_size: TRADING_CONFIG.BTC_POSITION_SIZE,
          limit_price: `${args.stop_loss}`, // STOP LOSS
          stop_price: `${args.stop_loss}`, // STOP LOSS trigger
          stop_direction:
            args.action === "BUY"
              ? "STOP_DIRECTION_STOP_DOWN"
              : "STOP_DIRECTION_STOP_UP", // For SELL; use "STOP_DIRECTION_STOP_DOWN" for BUY
        },
      },
    };

    console.log("📤 Sending BUY order:", JSON.stringify(orderPayload, null, 2));

    const result = await createOrder(orderPayload);
    return result;
  } catch (error) {
    console.error("💥 Execute buy signal error:", error.message);
    return { success: false, error: error.message };
  }
}

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

export function calculatePositionValue(btcPrice) {
  const btcAmount = parseFloat(TRADING_CONFIG.BTC_POSITION_SIZE);
  return btcAmount * btcPrice;
}

export async function executeBuyOrder(orderConfig) {
  try {
    console.log(`🤖 AI Agent executing BUY order`);

    const { trigger_price, stop_loss, take_profit, ...restConfig } =
      orderConfig;

    // Build enhanced order with native Coinbase risk management
    const enhancedOrder = buildEnhancedBuyOrder({
      trigger_price,
      stop_loss,
      take_profit,
      baseConfig: restConfig,
    });

    console.log(
      "📤 Enhanced order config:",
      JSON.stringify(enhancedOrder, null, 2)
    );

    const result = await createOrder(enhancedOrder);

    if (result.success) {
      console.log("✅ AI Agent BUY order executed successfully:", result.data);
      return {
        success: true,
        orderId: result.data.order_id,
        orderData: result.data,
        executedBy: "AI_AGENT",
        nativeStopLoss: !!stop_loss,
        nativeTakeProfit: !!take_profit,
      };
    } else {
      console.error("❌ AI Agent BUY order failed:", result.error);
      return { success: false, error: result.error };
    }
  } catch (error) {
    console.error("💥 AI Agent buy order error:", error.message);
    return { success: false, error: error.message };
  }
}

export async function executeSellOrder(orderConfig) {
  try {
    console.log(`🤖 AI Agent executing SELL order`);

    const { trigger_price, stop_loss, take_profit, ...restConfig } =
      orderConfig;

    // Build enhanced order with native Coinbase risk management
    const enhancedOrder = buildEnhancedSellOrder({
      trigger_price,
      stop_loss,
      take_profit,
      baseConfig: restConfig,
    });

    console.log(
      "📤 Enhanced order config:",
      JSON.stringify(enhancedOrder, null, 2)
    );

    const result = await createOrder(enhancedOrder);

    if (result.success) {
      console.log("✅ AI Agent SELL order executed successfully:", result.data);
      return {
        success: true,
        orderId: result.data.order_id,
        orderData: result.data,
        executedBy: "AI_AGENT",
        nativeStopLoss: !!stop_loss,
        nativeTakeProfit: !!take_profit,
      };
    } else {
      console.error("❌ AI Agent SELL order failed:", result.error);
      return { success: false, error: result.error };
    }
  } catch (error) {
    console.error("💥 AI Agent sell order error:", error.message);
    return { success: false, error: error.message };
  }
}

function buildEnhancedBuyOrder({
  trigger_price,
  stop_loss,
  take_profit,
  baseConfig,
}) {
  const baseOrder = {
    client_order_id:
      baseConfig.client_order_id ||
      `ai_buy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    product_id: baseConfig.product_id || TRADING_CONFIG.PRODUCT_ID,
    side: "BUY",
  };

  // If we have stop loss, use stop limit order instead of market order
  if (stop_loss) {
    console.log(
      `🛑 Setting up BUY order with native stop loss at $${stop_loss}`
    );

    baseOrder.order_configuration = {
      stop_limit_stop_limit_gtc: {
        base_size: baseConfig.base_size || TRADING_CONFIG.BTC_POSITION_SIZE,
        limit_price: trigger_price.toString(),
        stop_price: stop_loss.toString(),
        stop_direction: "BELOW",
      },
    };
  } else {
    // Regular market order
    baseOrder.order_configuration = baseConfig.order_configuration || {
      market_market_ioc: {
        base_size: baseConfig.base_size || TRADING_CONFIG.BTC_POSITION_SIZE,
      },
    };
  }

  // Add take profit as attached order if specified
  if (take_profit) {
    console.log(
      `💰 Setting up BUY order with native take profit at $${take_profit}`
    );

    baseOrder.attached_order_configuration = {
      limit_limit_gtc: {
        base_size: baseConfig.base_size || TRADING_CONFIG.BTC_POSITION_SIZE,
        limit_price: take_profit.toString(),
        post_only: false,
      },
    };
  }

  return baseOrder;
}

function buildEnhancedSellOrder({
  trigger_price,
  stop_loss,
  take_profit,
  baseConfig,
}) {
  const baseOrder = {
    client_order_id:
      baseConfig.client_order_id ||
      `ai_sell_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    product_id: baseConfig.product_id || TRADING_CONFIG.PRODUCT_ID,
    side: "SELL",
  };

  // If we have stop loss, use stop limit order instead of market order
  if (stop_loss) {
    console.log(
      `🛑 Setting up SELL order with native stop loss at $${stop_loss}`
    );

    baseOrder.order_configuration = {
      stop_limit_stop_limit_gtc: {
        base_size: baseConfig.base_size || TRADING_CONFIG.BTC_POSITION_SIZE,
        limit_price: trigger_price.toString(),
        stop_price: stop_loss.toString(),
        stop_direction: "ABOVE",
      },
    };
  } else {
    // Regular market order
    baseOrder.order_configuration = baseConfig.order_configuration || {
      market_market_ioc: {
        base_size: baseConfig.base_size || TRADING_CONFIG.BTC_POSITION_SIZE,
      },
    };
  }

  // Add take profit as attached order if specified
  if (take_profit) {
    console.log(
      `💰 Setting up SELL order with native take profit at $${take_profit}`
    );

    baseOrder.attached_order_configuration = {
      limit_limit_gtc: {
        base_size: baseConfig.base_size || TRADING_CONFIG.BTC_POSITION_SIZE,
        limit_price: take_profit.toString(),
        post_only: false,
      },
    };
  }

  return baseOrder;
}

/**
 * Get trading configuration
 */
export function getTradingConfig() {
  return TRADING_CONFIG;
}
