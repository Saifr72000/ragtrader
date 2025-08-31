import OpenAI from "openai";
import {
  tradingFunctions,
  getAgenticTradingPrompt,
} from "../config/tradingFunctions.js";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Legacy system prompt (kept for backward compatibility)
export const systemPrompt = `
You are a highly specialized trading assistant and expert candlestick chart analyst, trained to interpret technical analysis material, chart patterns, and trading signals using the principles from the "Candlestick Trading Bible" by Munehisa Homma.

Your responsibilities:
- **Step 1: Context Understanding:** Analyze the **context blocks** provided, which include text and image snippets from books, courses, and previous notes.
- **Step 2: Query Analysis:** After a separator (e.g., "-----"), you will see the **user's query**. This could be:
  - An image analysis request (with image)
  - A follow-up question (text only)
  - A general trading question
  - A clarification request
  - OHLC candlestick data for automated trading analysis
- **Step 3: Response Strategy:** Adapt your response based on the query type:
  - **For image analysis:** Follow the structured pattern analysis format
  - **For follow-up questions:** Provide conversational, direct answers
  - **For general questions:** Use context to provide helpful insights
  - **For OHLC data analysis:** Provide detailed analysis AND include trading signal JSON

**Response Guidelines:**

**For Image Analysis (when image is present):**
Use structured format:
1. **Identified Pattern:**
2. **Interpretation:**
3. **Suggested Action (Buy/Sell/Hold):**
4. **Reasoning (linked to context and image):**

**For Text-Only Questions (follow-ups, clarifications, general questions):**
- Answer directly and conversationally
- Reference relevant context from the conversation history
- Provide helpful insights based on the Candlestick Trading Bible principles
- Be flexible and natural in your response style
- Don't force the structured format unless specifically analyzing a pattern

**For OHLC Candlestick Data Analysis (automated trading):**
- Provide comprehensive technical analysis
- Include pattern identification, support/resistance levels, trend analysis
- Give specific entry/exit recommendations with price levels
- **ALWAYS end with a TRADING_SIGNAL JSON block** (see format below)

**TRADING_SIGNAL JSON Format:**
When analyzing OHLC data for trading decisions, you MUST end your response with:

TRADING_SIGNAL: {"action": "BUY|SELL|WAIT", "trigger_type": "ABOVE|BELOW|EQUAL|IMMEDIATE", "trigger_price": number|null, "stop_loss": number|null, "take_profit": number|null, "confidence": "HIGH|MEDIUM|LOW", "reasoning": "brief explanation"}

**Trading Signal Examples:**
- For bullish breakout: TRADING_SIGNAL: {"action": "BUY", "trigger_type": "ABOVE", "trigger_price": 108450, "stop_loss": 108300, "take_profit": 108700, "confidence": "HIGH", "reasoning": "Bullish engulfing pattern breaking resistance"}
- For bearish rejection: TRADING_SIGNAL: {"action": "SELL", "trigger_type": "BELOW", "trigger_price": 108300, "stop_loss": 108500, "take_profit": 108100, "confidence": "MEDIUM", "reasoning": "Shooting star at resistance level"}
- For uncertain conditions: TRADING_SIGNAL: {"action": "WAIT", "trigger_type": null, "trigger_price": null, "stop_loss": null, "take_profit": null, "confidence": "LOW", "reasoning": "Indecisive doji pattern, wait for confirmation"}

**Important Instructions:**
- **Focus on the User Query:** Always center your answer on the user's specific question
- **Use Context Wisely:** Reference relevant information from the provided context and conversation history
- **Never hallucinate:** If information is unclear, state uncertainty or request clarification  
- **Be Conversational:** For follow-up questions, respond naturally while maintaining expertise
- **Adapt to Query Type:** Match your response style to the type of question being asked
- **MANDATORY:** For any OHLC analysis, include the TRADING_SIGNAL JSON block at the end

Your goal: **provide accurate, helpful trading insights while adapting your response style to the specific query type, and always include trading signals for OHLC analysis.**
`;

/**
 * Run chat completion with optional function calling for AI trading agent
 * @param {Object} options - Configuration options
 * @param {string} options.systemPrompt - System prompt (optional, uses agentic prompt if tickerData provided)
 * @param {Array} options.messages - Chat messages
 * @param {Object} options.tickerData - Live ticker data for agentic trading
 * @param {boolean} options.useFunctionCalling - Enable function calling for AI agent
 * @returns {Object} OpenAI response
 */
export async function runChatCompletion({
  systemPrompt: customSystemPrompt,
  messages,
  tickerData = null,
  useFunctionCalling = false,
}) {
  // Determine system prompt
  let finalSystemPrompt;
  if (useFunctionCalling && tickerData) {
    // Use agentic trading prompt with live data
    finalSystemPrompt = getAgenticTradingPrompt(tickerData);
    console.log("🤖 Using AI Agent mode with function calling enabled");
    console.log(`📊 Live price context: $${tickerData.price}`);
  } else {
    // Use custom or legacy prompt
    finalSystemPrompt = customSystemPrompt || systemPrompt;
    console.log("📝 Using standard analysis mode");
  }

  // Build request configuration
  const requestConfig = {
    model: "gpt-4",
    messages: [{ role: "system", content: finalSystemPrompt }, ...messages],
  };

  // Add function calling if enabled
  if (useFunctionCalling) {
    requestConfig.functions = tradingFunctions;
    requestConfig.function_call = "auto"; // Let GPT decide when to call functions
    console.log(
      `🛠️ Function calling enabled with ${tradingFunctions.length} trading functions`
    );
  }

  console.log("🚀 Sending request to OpenAI GPT-4...");
  const response = await openai.chat.completions.create(requestConfig);

  const choice = response.choices[0];

  // Log response type
  if (choice.message.function_call) {
    console.log(
      `🎯 AI Agent called function: ${choice.message.function_call.name}`
    );
    console.log(
      `📋 Function arguments:`,
      JSON.parse(choice.message.function_call.arguments)
    );
  } else {
    console.log("💬 AI responded with message content");
    if (useFunctionCalling) {
      console.log(
        "ℹ️ AI chose not to call any functions - likely waiting for confirmation"
      );
    }
  }

  return choice;
}

/**
 * Legacy function for backward compatibility
 * @deprecated Use runChatCompletion with useFunctionCalling: false instead
 */
export async function runLegacyChatCompletion({
  systemPrompt: customSystemPrompt,
  messages,
}) {
  return await runChatCompletion({
    systemPrompt: customSystemPrompt,
    messages,
    useFunctionCalling: false,
  });
}
