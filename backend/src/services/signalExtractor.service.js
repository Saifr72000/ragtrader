/**
 * Signal Extractor Service
 * Extracts trading signals directly from RAG responses without additional OpenAI calls
 */

/**
 * Extract trading signal JSON from RAG response
 * @param {string} ragResponse - The RAG's response containing analysis and TRADING_SIGNAL JSON
 * @returns {Object} Extracted and validated trading signal
 */
export function extractTradingSignal(ragResponse) {
  try {
    console.log("🔍 Extracting trading signal from RAG response...");
    console.log("📝 RAG Response length:", ragResponse.length);

    // Look for TRADING_SIGNAL: {...} pattern in the response
    const tradingSignalRegex = /TRADING_SIGNAL:\s*(\{[^}]*\})/i;
    const match = ragResponse.match(tradingSignalRegex);

    if (!match) {
      console.log("⚠️ No TRADING_SIGNAL JSON found in RAG response");
      return createFallbackSignal("No trading signal found in response");
    }

    const jsonString = match[1];
    console.log("🎯 Found TRADING_SIGNAL JSON:", jsonString);

    // Parse the JSON
    let parsedSignal;
    try {
      parsedSignal = JSON.parse(jsonString);
    } catch (parseError) {
      console.error("💥 JSON parsing error:", parseError.message);
      console.log("📝 Raw JSON string:", jsonString);
      return createFallbackSignal("Invalid JSON format in trading signal");
    }

    // Validate and clean the parsed signal
    const validatedSignal = validateSignal(parsedSignal);

    console.log("✅ Extracted Trading Signal:", validatedSignal);
    return validatedSignal;
  } catch (error) {
    console.error("💥 Error extracting trading signal:", error.message);
    return createFallbackSignal(`Extraction error: ${error.message}`);
  }
}

/**
 * Validate and sanitize extracted trading signal
 * @param {Object} signal - Raw extracted signal
 * @returns {Object} Validated signal
 */
function validateSignal(signal) {
  // Ensure required fields exist with defaults
  const validatedSignal = {
    action: signal.action || "WAIT",
    trigger_type: signal.trigger_type || null,
    trigger_price: signal.trigger_price || null,
    stop_loss: signal.stop_loss || null,
    take_profit: signal.take_profit || null,
    confidence: signal.confidence || "LOW",
    reasoning: signal.reasoning || "No reasoning provided",
  };

  // Validate action
  if (!["BUY", "SELL", "WAIT"].includes(validatedSignal.action)) {
    console.warn("⚠️ Invalid action, defaulting to WAIT");
    validatedSignal.action = "WAIT";
  }

  // Validate trigger_type
  if (
    validatedSignal.trigger_type &&
    !["ABOVE", "BELOW", "EQUAL", "IMMEDIATE"].includes(
      validatedSignal.trigger_type
    )
  ) {
    console.warn("⚠️ Invalid trigger_type, defaulting to null");
    validatedSignal.trigger_type = null;
  }

  // Validate price values (should be positive numbers or null)
  ["trigger_price", "stop_loss", "take_profit"].forEach((priceField) => {
    if (validatedSignal[priceField] !== null) {
      const price = parseFloat(validatedSignal[priceField]);
      if (isNaN(price) || price <= 0) {
        console.warn(`⚠️ Invalid ${priceField}, setting to null`);
        validatedSignal[priceField] = null;
      } else {
        validatedSignal[priceField] = price;
      }
    }
  });

  // Validate confidence
  if (!["HIGH", "MEDIUM", "LOW"].includes(validatedSignal.confidence)) {
    validatedSignal.confidence = "LOW";
  }

  // If action is BUY/SELL but no trigger info, default to WAIT
  if (
    (validatedSignal.action === "BUY" || validatedSignal.action === "SELL") &&
    !validatedSignal.trigger_type &&
    !validatedSignal.trigger_price
  ) {
    console.warn("⚠️ BUY/SELL action without trigger, defaulting to WAIT");
    validatedSignal.action = "WAIT";
    validatedSignal.reasoning =
      "Incomplete signal - missing trigger information";
  }

  return validatedSignal;
}

/**
 * Create a fallback WAIT signal when extraction fails
 * @param {string} reason - Reason for fallback
 * @returns {Object} Fallback signal
 */
function createFallbackSignal(reason) {
  return {
    action: "WAIT",
    trigger_type: null,
    trigger_price: null,
    stop_loss: null,
    take_profit: null,
    confidence: "LOW",
    reasoning: reason,
  };
}

/**
 * Test if a RAG response contains a trading signal
 * @param {string} ragResponse - The RAG response to test
 * @returns {boolean} True if trading signal is found
 */
export function hasTradingSignal(ragResponse) {
  const tradingSignalRegex = /TRADING_SIGNAL:\s*\{[^}]*\}/i;
  return tradingSignalRegex.test(ragResponse);
}
