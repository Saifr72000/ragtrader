/**
 * Function Executor Service
 * Handles execution of AI agent function calls for trading operations
 */

import {
  registerPriceMonitor,
  clearAllTriggers,
  getActiveTriggers,
} from "./priceMonitor.service.js";
import { executeBuyOrder, executeSellOrder } from "./trading.service.js";

/**
 * Execute a function call from the AI agent
 * @param {Object} functionCall - The function call from OpenAI
 * @param {Object} tickerData - Current live ticker data
 * @returns {Object} Execution result
 */
export async function executeTradingFunction(functionCall, tickerData) {
  const { name, arguments: args } = functionCall;

  console.log(`🤖 AI Agent calling function: ${name}`);
  console.log(`📊 Function arguments:`, args);
  console.log(`💰 Current price: $${tickerData?.price || "N/A"}`);

  try {
    switch (name) {
      case "execute_buy_trade":
        return await handleBuyTrade(args, tickerData);

      case "execute_sell_trade":
        return await handleSellTrade(args, tickerData);

      case "modify_active_trade":
        return await handleModifyTrade(args, tickerData);

      case "close_all_positions":
        return await handleClosePositions(args, tickerData);

      case "wait_for_confirmation":
        return await handleWaitForConfirmation(args, tickerData);

      default:
        throw new Error(`Unknown function: ${name}`);
    }
  } catch (error) {
    console.error(`💥 Function execution error:`, error);
    return {
      success: false,
      error: error.message,
      function_name: name,
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Handle buy trade execution
 * @param {Object} args - Function arguments
 * @param {Object} tickerData - Current ticker data
 * @returns {Object} Execution result
 */
async function handleBuyTrade(args, tickerData) {
  const {
    trigger_condition,
    trigger_price,
    stop_loss,
    take_profit,
    confidence,
    reasoning,
  } = args;

  console.log(`🔵 AI Agent wants to BUY:`);
  console.log(`🎯 Trigger: ${trigger_condition} $${trigger_price}`);
  console.log(`🛑 Stop Loss: $${stop_loss || "None"}`);
  console.log(`💰 Take Profit: $${take_profit || "None"}`);
  console.log(`📊 Confidence: ${confidence}`);
  console.log(`💭 Reasoning: ${reasoning}`);

  // Validate confidence level
  if (confidence === "LOW") {
    console.log(
      `⚠️ Low confidence signal rejected. AI should use MEDIUM or HIGH confidence only.`
    );
    return {
      success: false,
      rejected: true,
      reason: "Low confidence signals are rejected by risk management rules",
      function_name: "execute_buy_trade",
      timestamp: new Date().toISOString(),
    };
  }

  const currentPrice = parseFloat(tickerData?.price || 0);

  // Check if trigger condition is already met for immediate execution
  if (
    trigger_condition === "IMMEDIATE" ||
    shouldExecuteImmediately(trigger_condition, currentPrice, trigger_price)
  ) {
    console.log(`🚀 IMMEDIATE EXECUTION: Condition already met`);

    if (trigger_condition !== "IMMEDIATE") {
      console.log(
        `💡 Price ${currentPrice} already meets condition ${trigger_condition} ${trigger_price}`
      );
    }

    try {
      const tradeResult = await executeBuyOrder({
        product_id: "BTC-EUR",
        base_size: "0.00010246",
        order_configuration: { market_market_ioc: {} },
        client_order_id: `ai_buy_${Date.now()}_${Math.random()
          .toString(36)
          .substr(2, 9)}`,
      });

      // Set up stop loss and take profit monitoring if specified
      if (stop_loss || take_profit) {
        setupPostTradeMonitoring(
          "BUY",
          currentPrice,
          stop_loss,
          take_profit,
          reasoning
        );
      }

      return {
        success: true,
        executed: true,
        action: "BUY",
        execution_price: currentPrice,
        trade_result: tradeResult,
        stop_loss,
        take_profit,
        confidence,
        reasoning,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error(`💥 Immediate buy execution failed:`, error);
      return {
        success: false,
        executed: false,
        action: "BUY",
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  // Condition not met yet - set up monitoring
  console.log(`⏳ CONDITION NOT MET: Setting up price monitoring`);
  console.log(
    `📊 Current: $${currentPrice} | Target: ${trigger_condition} $${trigger_price}`
  );

  const triggerId = registerPriceMonitor({
    condition: trigger_condition,
    trigger_price: trigger_price,
    action: "BUY",
    stop_loss,
    take_profit,
    confidence,
    reasoning: reasoning,
    source: "AI_AGENT",
  });

  return {
    success: true,
    monitoring: true,
    action: "BUY",
    trigger_id: triggerId,
    trigger_condition,
    trigger_price,
    current_price: currentPrice,
    stop_loss,
    take_profit,
    confidence,
    reasoning,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Handle sell trade execution
 * @param {Object} args - Function arguments
 * @param {Object} tickerData - Current ticker data
 * @returns {Object} Execution result
 */
async function handleSellTrade(args, tickerData) {
  const {
    trigger_condition,
    trigger_price,
    stop_loss,
    take_profit,
    confidence,
    reasoning,
  } = args;

  console.log(`🔴 AI Agent wants to SELL:`);
  console.log(`🎯 Trigger: ${trigger_condition} $${trigger_price}`);
  console.log(`🛑 Stop Loss: $${stop_loss || "None"}`);
  console.log(`💰 Take Profit: $${take_profit || "None"}`);
  console.log(`📊 Confidence: ${confidence}`);
  console.log(`💭 Reasoning: ${reasoning}`);

  // Validate confidence level
  if (confidence === "LOW") {
    console.log(
      `⚠️ Low confidence signal rejected. AI should use MEDIUM or HIGH confidence only.`
    );
    return {
      success: false,
      rejected: true,
      reason: "Low confidence signals are rejected by risk management rules",
      function_name: "execute_sell_trade",
      timestamp: new Date().toISOString(),
    };
  }

  const currentPrice = parseFloat(tickerData?.price || 0);

  // Check if trigger condition is already met for immediate execution
  if (
    trigger_condition === "IMMEDIATE" ||
    shouldExecuteImmediately(trigger_condition, currentPrice, trigger_price)
  ) {
    console.log(`🚀 IMMEDIATE EXECUTION: Condition already met`);

    if (trigger_condition !== "IMMEDIATE") {
      console.log(
        `💡 Price ${currentPrice} already meets condition ${trigger_condition} ${trigger_price}`
      );
    }

    try {
      const tradeResult = await executeSellOrder({
        product_id: "BTC-EUR",
        base_size: "0.00010246",
        order_configuration: { market_market_ioc: {} },
        client_order_id: `ai_sell_${Date.now()}_${Math.random()
          .toString(36)
          .substr(2, 9)}`,
      });

      // Set up stop loss and take profit monitoring if specified
      if (stop_loss || take_profit) {
        setupPostTradeMonitoring(
          "SELL",
          currentPrice,
          stop_loss,
          take_profit,
          reasoning
        );
      }

      return {
        success: true,
        executed: true,
        action: "SELL",
        execution_price: currentPrice,
        trade_result: tradeResult,
        stop_loss,
        take_profit,
        confidence,
        reasoning,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error(`💥 Immediate sell execution failed:`, error);
      return {
        success: false,
        executed: false,
        action: "SELL",
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  // Condition not met yet - set up monitoring
  console.log(`⏳ CONDITION NOT MET: Setting up price monitoring`);
  console.log(
    `📊 Current: $${currentPrice} | Target: ${trigger_condition} $${trigger_price}`
  );

  const triggerId = registerPriceMonitor({
    condition: trigger_condition,
    trigger_price: trigger_price,
    action: "SELL",
    stop_loss,
    take_profit,
    confidence,
    reasoning: reasoning,
    source: "AI_AGENT",
  });

  return {
    success: true,
    monitoring: true,
    action: "SELL",
    trigger_id: triggerId,
    trigger_condition,
    trigger_price,
    current_price: currentPrice,
    stop_loss,
    take_profit,
    confidence,
    reasoning,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Handle trade modification
 * @param {Object} args - Function arguments
 * @param {Object} tickerData - Current ticker data
 * @returns {Object} Execution result
 */
async function handleModifyTrade(args, tickerData) {
  const { new_stop_loss, new_take_profit, reason } = args;

  console.log(`🔧 AI Agent wants to modify active trades:`);
  console.log(`🛑 New Stop Loss: $${new_stop_loss || "No change"}`);
  console.log(`💰 New Take Profit: $${new_take_profit || "No change"}`);
  console.log(`💭 Reason: ${reason}`);

  // Get current active triggers
  const activeTriggers = getActiveTriggers();
  const tradeTriggers = activeTriggers.filter(
    (t) => t.action === "BUY" || t.action === "SELL"
  );

  if (tradeTriggers.length === 0) {
    return {
      success: false,
      reason: "No active trades to modify",
      function_name: "modify_active_trade",
      timestamp: new Date().toISOString(),
    };
  }

  // For simplicity, we'll modify the most recent trade trigger
  // In a more sophisticated system, we'd need trade position tracking
  const latestTrade = tradeTriggers[tradeTriggers.length - 1];

  console.log(
    `🎯 Modifying trade: ${latestTrade.action} trigger at $${latestTrade.trigger_price}`
  );

  // This is a simplified implementation
  // In practice, you'd need proper position tracking and order management
  return {
    success: true,
    modified: true,
    original_trade: latestTrade,
    modifications: {
      new_stop_loss,
      new_take_profit,
    },
    reason,
    function_name: "modify_active_trade",
    timestamp: new Date().toISOString(),
    note: "Trade modification logged. Full implementation requires position tracking system.",
  };
}

/**
 * Handle closing all positions
 * @param {Object} args - Function arguments
 * @param {Object} tickerData - Current ticker data
 * @returns {Object} Execution result
 */
async function handleClosePositions(args, tickerData) {
  const { reason } = args;

  console.log(`🚨 AI Agent wants to close ALL positions!`);
  console.log(`💭 Reason: ${reason}`);

  // Clear all active triggers
  clearAllTriggers();

  // In a real system, you'd also close actual open positions here
  // For now, we'll just clear the monitoring triggers

  return {
    success: true,
    action: "CLOSE_ALL",
    triggers_cleared: true,
    reason,
    function_name: "close_all_positions",
    timestamp: new Date().toISOString(),
    note: "All price triggers cleared. Actual position closing would require position tracking.",
  };
}

/**
 * Handle wait for confirmation
 * @param {Object} args - Function arguments
 * @param {Object} tickerData - Current ticker data
 * @returns {Object} Execution result
 */
async function handleWaitForConfirmation(args, tickerData) {
  const { watch_levels, reasoning } = args;

  console.log(`⏸️ AI Agent wants to WAIT for confirmation`);
  console.log(
    `👁️ Watch levels: ${
      watch_levels
        ? watch_levels.map((l) => `$${l}`).join(", ")
        : "None specified"
    }`
  );
  console.log(`💭 Reasoning: ${reasoning}`);

  return {
    success: true,
    action: "WAIT",
    watch_levels,
    reasoning,
    current_price: parseFloat(tickerData?.price || 0),
    function_name: "wait_for_confirmation",
    timestamp: new Date().toISOString(),
  };
}

/**
 * Check if trigger condition is already met for immediate execution
 * @param {string} condition - ABOVE, BELOW, EQUAL
 * @param {number} currentPrice - Current market price
 * @param {number} triggerPrice - Trigger price level
 * @returns {boolean} True if condition is already met
 */
function shouldExecuteImmediately(condition, currentPrice, triggerPrice) {
  switch (condition.toUpperCase()) {
    case "ABOVE":
      return currentPrice > triggerPrice;
    case "BELOW":
      return currentPrice < triggerPrice;
    case "EQUAL":
      return Math.abs(currentPrice - triggerPrice) <= 1; // Within $1
    default:
      return false;
  }
}

/**
 * Set up stop loss and take profit monitoring after immediate trade execution
 * @param {string} action - BUY or SELL
 * @param {number} entryPrice - Entry price
 * @param {number} stopLoss - Stop loss price
 * @param {number} takeProfit - Take profit price
 * @param {string} reasoning - Original reasoning
 */
function setupPostTradeMonitoring(
  action,
  entryPrice,
  stopLoss,
  takeProfit,
  reasoning
) {
  console.log(`🛡️ Setting up post-trade risk management monitoring...`);

  if (stopLoss) {
    const stopCondition = action === "BUY" ? "BELOW" : "ABOVE";
    registerPriceMonitor({
      condition: stopCondition,
      trigger_price: stopLoss,
      action: action === "BUY" ? "SELL" : "BUY",
      reasoning: `Stop loss for ${action} executed at $${entryPrice}. Original: ${reasoning}`,
      source: "AI_AGENT_RISK_MGMT",
    });
    console.log(`🛑 Stop loss set: ${stopCondition} $${stopLoss}`);
  }

  if (takeProfit) {
    const profitCondition = action === "BUY" ? "ABOVE" : "BELOW";
    registerPriceMonitor({
      condition: profitCondition,
      trigger_price: takeProfit,
      action: action === "BUY" ? "SELL" : "BUY",
      reasoning: `Take profit for ${action} executed at $${entryPrice}. Original: ${reasoning}`,
      source: "AI_AGENT_RISK_MGMT",
    });
    console.log(`💰 Take profit set: ${profitCondition} $${takeProfit}`);
  }
}
