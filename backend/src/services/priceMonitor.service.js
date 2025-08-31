/**
 * Real-Time Price Monitor Service
 * Monitors live ticker data and executes trades when trigger conditions are met
 */

import { v4 as uuidv4 } from "uuid";
import { executeBuyOrder, executeSellOrder } from "./trading.service.js";

// Store active price triggers
let activeTriggers = new Map();
let executionHistory = [];

/**
 * Register a new price trigger for monitoring
 * @param {Object} trigger - Trigger configuration
 * @param {string} trigger.condition - ABOVE, BELOW, EQUAL
 * @param {number} trigger.trigger_price - Price level to monitor
 * @param {string} trigger.action - BUY or SELL
 * @param {number} trigger.stop_loss - Stop loss level (optional)
 * @param {number} trigger.take_profit - Take profit level (optional)
 * @param {Function} trigger.callback - Function to execute when triggered
 * @param {string} trigger.reasoning - Why this trigger was set
 */
export function registerPriceMonitor(trigger) {
  const id = trigger.id || uuidv4();
  const triggerWithId = {
    ...trigger,
    id,
    created_at: new Date().toISOString(),
  };

  activeTriggers.set(id, triggerWithId);

  console.log(
    `📊 Price trigger registered: ${trigger.action} ${trigger.condition} $${trigger.trigger_price}`
  );
  console.log(`🎯 Trigger ID: ${id}`);
  console.log(`💭 Reasoning: ${trigger.reasoning}`);

  return id;
}

/**
 * Remove a price trigger from monitoring
 * @param {string} triggerId - ID of trigger to remove
 */
export function removePriceMonitor(triggerId) {
  const trigger = activeTriggers.get(triggerId);
  if (trigger) {
    activeTriggers.delete(triggerId);
    console.log(
      `🗑️ Removed price trigger: ${trigger.action} ${trigger.condition} $${trigger.trigger_price}`
    );
  }
}

/**
 * Get all active triggers
 * @returns {Array} Array of active triggers
 */
export function getActiveTriggers() {
  return Array.from(activeTriggers.values());
}

/**
 * Clear all active triggers
 */
export function clearAllTriggers() {
  const count = activeTriggers.size;
  activeTriggers.clear();
  console.log(`🧹 Cleared ${count} active price triggers`);
}

/**
 * Check all active triggers against new price data
 * Called on every ticker update for real-time monitoring
 * @param {Object} tickerData - Latest ticker data from Coinbase
 */
export async function checkAllTriggers(tickerData) {
  if (activeTriggers.size === 0) return;

  const currentPrice = parseFloat(tickerData.price);
  const timestamp = new Date().toISOString();

  // Check each active trigger
  for (const [id, trigger] of activeTriggers) {
    try {
      if (
        shouldTrigger(trigger.condition, currentPrice, trigger.trigger_price)
      ) {
        console.log(`🚨 TRIGGER ACTIVATED!`);
        console.log(
          `📊 Condition: ${trigger.action} ${trigger.condition} $${trigger.trigger_price}`
        );
        console.log(`💰 Current Price: $${currentPrice}`);
        console.log(`🎯 Trigger ID: ${id}`);

        // Execute the trade
        const result = await executeTrigger(trigger, currentPrice, timestamp);

        // Remove trigger after execution (successful or failed)
        activeTriggers.delete(id);

        // Log execution
        executionHistory.push({
          trigger_id: id,
          executed_at: timestamp,
          execution_price: currentPrice,
          trigger,
          result,
          success: result.success,
        });

        console.log(`✅ Trigger executed successfully:`, result);

        // Set up stop loss and take profit monitoring if specified
        if (result.success && (trigger.stop_loss || trigger.take_profit)) {
          setupRiskManagementMonitoring(trigger, currentPrice, result);
        }
      }
    } catch (error) {
      console.error(`💥 Error checking trigger ${id}:`, error);

      // Log failed execution
      executionHistory.push({
        trigger_id: id,
        executed_at: timestamp,
        execution_price: currentPrice,
        trigger,
        result: { success: false, error: error.message },
        success: false,
      });

      // Remove failed trigger
      activeTriggers.delete(id);
    }
  }
}

/**
 * Check if a trigger condition is met
 * @param {string} condition - ABOVE, BELOW, EQUAL
 * @param {number} currentPrice - Current market price
 * @param {number} triggerPrice - Price level to check against
 * @returns {boolean} True if condition is met
 */
function shouldTrigger(condition, currentPrice, triggerPrice) {
  switch (condition.toUpperCase()) {
    case "ABOVE":
      return currentPrice > triggerPrice;
    case "BELOW":
      return currentPrice < triggerPrice;
    case "EQUAL":
      // Within $1 tolerance for EQUAL conditions
      return Math.abs(currentPrice - triggerPrice) <= 1;
    default:
      console.warn(`⚠️ Unknown trigger condition: ${condition}`);
      return false;
  }
}

/**
 * Execute a triggered trade
 * @param {Object} trigger - The trigger configuration
 * @param {number} executionPrice - Price at which trigger fired
 * @param {string} timestamp - Execution timestamp
 * @returns {Object} Execution result
 */
async function executeTrigger(trigger, executionPrice, timestamp) {
  const { action, reasoning } = trigger;

  console.log(`🎯 Executing ${action} trade at $${executionPrice}`);
  console.log(`💭 Reasoning: ${reasoning}`);

  const orderConfig = {
    product_id: "BTC-EUR",
    base_size: "0.00010246",
    order_configuration: { market_market_ioc: {} },
    client_order_id: `ai_agent_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`,
  };

  try {
    let tradeResult;

    if (action.toUpperCase() === "BUY") {
      tradeResult = await executeBuyOrder(orderConfig);
    } else if (action.toUpperCase() === "SELL") {
      tradeResult = await executeSellOrder(orderConfig);
    } else {
      throw new Error(`Unknown action: ${action}`);
    }

    return {
      success: true,
      action,
      execution_price: executionPrice,
      trade_result: tradeResult,
      timestamp,
      reasoning,
    };
  } catch (error) {
    console.error(`💥 Trade execution failed:`, error);
    return {
      success: false,
      action,
      execution_price: executionPrice,
      error: error.message,
      timestamp,
      reasoning,
    };
  }
}

/**
 * Set up stop loss and take profit monitoring after a successful trade
 * @param {Object} originalTrigger - The original trigger that was executed
 * @param {number} entryPrice - Price at which the trade was executed
 * @param {Object} executionResult - Result of the original trade execution
 */
function setupRiskManagementMonitoring(
  originalTrigger,
  entryPrice,
  executionResult
) {
  const { action, stop_loss, take_profit } = originalTrigger;

  // Set up stop loss monitoring
  if (stop_loss) {
    const stopLossCondition =
      action.toUpperCase() === "BUY" ? "BELOW" : "ABOVE";

    registerPriceMonitor({
      condition: stopLossCondition,
      trigger_price: stop_loss,
      action: action.toUpperCase() === "BUY" ? "SELL" : "BUY", // Opposite action to close position
      reasoning: `Stop loss for ${action} trade executed at $${entryPrice}`,
      original_trigger_id: originalTrigger.id,
      risk_management_type: "STOP_LOSS",
      callback: async (price) => {
        console.log(
          `🛑 STOP LOSS HIT at $${price} for ${action} trade (entry: $${entryPrice})`
        );
        // Will execute through normal trigger mechanism
      },
    });

    console.log(
      `🛑 Stop loss monitoring set up: ${stopLossCondition} $${stop_loss}`
    );
  }

  // Set up take profit monitoring
  if (take_profit) {
    const takeProfitCondition =
      action.toUpperCase() === "BUY" ? "ABOVE" : "BELOW";

    registerPriceMonitor({
      condition: takeProfitCondition,
      trigger_price: take_profit,
      action: action.toUpperCase() === "BUY" ? "SELL" : "BUY", // Opposite action to close position
      reasoning: `Take profit for ${action} trade executed at $${entryPrice}`,
      original_trigger_id: originalTrigger.id,
      risk_management_type: "TAKE_PROFIT",
      callback: async (price) => {
        console.log(
          `💰 TAKE PROFIT HIT at $${price} for ${action} trade (entry: $${entryPrice})`
        );
        // Will execute through normal trigger mechanism
      },
    });

    console.log(
      `💰 Take profit monitoring set up: ${takeProfitCondition} $${take_profit}`
    );
  }
}

/**
 * Get execution history
 * @returns {Array} Array of execution history
 */
export function getExecutionHistory() {
  return executionHistory;
}

/**
 * Get monitoring statistics
 * @returns {Object} Statistics about price monitoring
 */
export function getMonitoringStats() {
  return {
    active_triggers: activeTriggers.size,
    total_executions: executionHistory.length,
    successful_executions: executionHistory.filter((e) => e.success).length,
    failed_executions: executionHistory.filter((e) => !e.success).length,
    success_rate:
      executionHistory.length > 0
        ? (
            (executionHistory.filter((e) => e.success).length /
              executionHistory.length) *
            100
          ).toFixed(1) + "%"
        : "0%",
  };
}
