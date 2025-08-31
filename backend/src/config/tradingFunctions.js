/**
 * Trading Functions Configuration for OpenAI Function Calling
 * These functions give the AI agent direct trading capabilities
 */

export const tradingFunctions = [
  {
    name: "execute_buy_trade",
    description:
      "Execute a buy trade when specified price conditions are met. Use this when analysis indicates a bullish opportunity.",
    parameters: {
      type: "object",
      properties: {
        trigger_condition: {
          type: "string",
          enum: ["ABOVE", "BELOW", "EQUAL", "IMMEDIATE"],
          description:
            "When to trigger the trade: ABOVE (price goes above level), BELOW (price goes below level), EQUAL (price reaches level), IMMEDIATE (execute now)",
        },
        trigger_price: {
          type: "number",
          description: "Price level that triggers the trade execution",
        },
        stop_loss: {
          type: "number",
          description: "Stop loss price level to limit losses",
        },
        take_profit: {
          type: "number",
          description: "Take profit price level to secure gains",
        },
        confidence: {
          type: "string",
          enum: ["LOW", "MEDIUM", "HIGH"],
          description: "Confidence level in this trade setup",
        },
        reasoning: {
          type: "string",
          description:
            "Detailed explanation for this buy decision based on technical analysis",
        },
      },
      required: [
        "trigger_condition",
        "trigger_price",
        "confidence",
        "reasoning",
      ],
    },
  },
  {
    name: "execute_sell_trade",
    description:
      "Execute a sell trade when specified price conditions are met. Use this when analysis indicates a bearish opportunity.",
    parameters: {
      type: "object",
      properties: {
        trigger_condition: {
          type: "string",
          enum: ["ABOVE", "BELOW", "EQUAL", "IMMEDIATE"],
          description:
            "When to trigger the trade: ABOVE (price goes above level), BELOW (price goes below level), EQUAL (price reaches level), IMMEDIATE (execute now)",
        },
        trigger_price: {
          type: "number",
          description: "Price level that triggers the trade execution",
        },
        stop_loss: {
          type: "number",
          description: "Stop loss price level to limit losses",
        },
        take_profit: {
          type: "number",
          description: "Take profit price level to secure gains",
        },
        confidence: {
          type: "string",
          enum: ["LOW", "MEDIUM", "HIGH"],
          description: "Confidence level in this trade setup",
        },
        reasoning: {
          type: "string",
          description:
            "Detailed explanation for this sell decision based on technical analysis",
        },
      },
      required: [
        "trigger_condition",
        "trigger_price",
        "confidence",
        "reasoning",
      ],
    },
  },
  {
    name: "modify_active_trade",
    description:
      "Modify stop loss or take profit levels of currently active trades. Use this to adjust risk management based on changing market conditions.",
    parameters: {
      type: "object",
      properties: {
        new_stop_loss: {
          type: "number",
          description: "New stop loss price level",
        },
        new_take_profit: {
          type: "number",
          description: "New take profit price level",
        },
        reason: {
          type: "string",
          description: "Explanation for why the modification is needed",
        },
      },
      required: ["reason"],
    },
  },
  {
    name: "close_all_positions",
    description:
      "Close all active trading positions immediately. Use this when market conditions suggest high risk or major trend reversal.",
    parameters: {
      type: "object",
      properties: {
        reason: {
          type: "string",
          description:
            "Detailed explanation for why all positions should be closed",
        },
      },
      required: ["reason"],
    },
  },
  {
    name: "wait_for_confirmation",
    description:
      "Wait for better market conditions before taking action. Use this when the market is unclear or when waiting for specific price levels.",
    parameters: {
      type: "object",
      properties: {
        watch_levels: {
          type: "array",
          items: {
            type: "number",
          },
          description:
            "Important price levels to monitor for future trading opportunities",
        },
        reasoning: {
          type: "string",
          description:
            "Explanation for why waiting is the best strategy right now",
        },
      },
      required: ["reasoning"],
    },
  },
];

/**
 * Get system prompt for the AI trading agent
 * @param {Object} tickerData - Current live market data
 * @returns {string} Enhanced system prompt with live data
 */
export function getAgenticTradingPrompt(tickerData) {
  return `You are an autonomous AI trading agent with direct access to live BTC market data and trading execution capabilities.

LIVE MARKET DATA (Real-time):
- Current BTC Price: $${tickerData?.price || "N/A"}
- 24h Change: ${tickerData?.price_percent_change_24_h || "N/A"}%
- 24h High: $${tickerData?.high_24h || "N/A"}
- 24h Low: $${tickerData?.low_24h || "N/A"}
- Volume: ${tickerData?.volume_24h || "N/A"} BTC
- Last Update: ${
    tickerData?.time ? new Date(tickerData.time).toISOString() : "N/A"
  }

TRADING CAPABILITIES:
You have direct access to execute trades through function calls:
- execute_buy_trade() - For bullish opportunities
- execute_sell_trade() - For bearish opportunities  
- modify_active_trade() - To adjust existing positions
- close_all_positions() - For emergency exits
- wait_for_confirmation() - When conditions are unclear

TRADING RULES:
1. Only trade with MEDIUM or HIGH confidence signals
2. Always set stop losses to manage risk
3. Use minimum 1:2 risk/reward ratios when possible
4. Consider current market volatility in position sizing
5. Use IMMEDIATE execution only for very urgent signals
6. Prefer trigger conditions (ABOVE/BELOW) for better entry timing

DECISION MAKING:
- Analyze the completed 5-minute candle data in context of the live market
- Consider support/resistance levels, volume, and candlestick patterns
- Use Candlestick Trading Bible principles for pattern recognition
- Make ONE function call per analysis (execute_buy_trade, execute_sell_trade, or wait_for_confirmation)
- Include detailed reasoning in your function calls

Remember: You have real-time market access and can execute trades immediately when conditions are optimal. Make decisive, well-reasoned trading decisions based on your analysis.`;
}
