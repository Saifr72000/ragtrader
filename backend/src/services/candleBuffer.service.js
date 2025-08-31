/**
 * Candle Buffer Service - Functional Programming Style
 * Collects and manages live candle data for RAG analysis
 */

// Module state (instead of class properties)
let completedCandles = []; // Only completed candles for RAG
let currentLiveCandle = null; // Current candle being built in real-time
let lastCandleStartTime = null; // Track candle completion by start time changes
let maxSize = 1000; // Increased from 10 to 1000 for full snapshot data
let isReady = false;
let rawWebSocketMessages = []; // Store raw WebSocket messages for RAG

/**
 * Add a new candle to the buffer
 * @param {Object} rawCandleData - Raw WebSocket message from Coinbase
 * @returns {boolean} Success/failure
 */
export function addCandle(rawCandleData) {
  try {
    if (!rawCandleData) {
      console.log("⚠️ No candle data provided");
      return false;
    }

    // Store the raw WebSocket message for RAG analysis
    rawWebSocketMessages.push({
      timestamp: new Date().toISOString(),
      raw_message: rawCandleData,
    });

    // Keep only recent raw messages (same limit as candles)
    if (rawWebSocketMessages.length > maxSize) {
      rawWebSocketMessages.shift();
    }

    // Extract candle from Coinbase WebSocket format
    const candleEvent = rawCandleData.events?.[0];
    if (!candleEvent) {
      console.log("⚠️ No candle event found");
      return false;
    }

    // Handle different event types differently
    if (candleEvent.type !== "snapshot" && candleEvent.type !== "update") {
      console.log(`⚠️ Skipping candle event type: ${candleEvent.type}`);
      return false;
    }

    if (candleEvent.type === "snapshot") {
      // SNAPSHOT: Contains completed historical candles (can be multiple candles)
      const allCandles = candleEvent.candles || [];

      if (allCandles.length === 0) {
        console.log("⚠️ No candles in snapshot event");
        return false;
      }

      console.log(`📸 SNAPSHOT EVENT: Processing ${allCandles.length} candles`);

      let addedCount = 0;

      // Process all candles in the snapshot
      for (const candleData of allCandles) {
        const formattedCandle = {
          timestamp: new Date().toISOString(),
          open: parseFloat(candleData.open),
          high: parseFloat(candleData.high),
          low: parseFloat(candleData.low),
          close: parseFloat(candleData.close),
          volume: parseFloat(candleData.volume),
          product_id: candleData.product_id || "BTC-USD",
          start_time: parseInt(candleData.start),
          event_type: candleEvent.type,
        };

        // Check if this candle is already in our buffer
        const isDuplicate = completedCandles.some(
          (existingCandle) =>
            existingCandle.start_time === formattedCandle.start_time
        );

        if (!isDuplicate) {
          completedCandles.push(formattedCandle);
          addedCount++;

          // Remove oldest if buffer exceeds max size
          if (completedCandles.length > maxSize) {
            completedCandles.shift();
          }
        }
      }

      if (addedCount > 0) {
        // Sort candles by start_time to ensure chronological order
        completedCandles.sort((a, b) => a.start_time - b.start_time);

        console.log(
          `🏁 SNAPSHOT: Added ${addedCount} new completed candles. Total: ${completedCandles.length}`
        );

        // Update ready status - Ready immediately when we have any completed candles
        if (!isReady && completedCandles.length > 0) {
          isReady = true;
          console.log(
            `🎯 Candle buffer is READY! Collected ${completedCandles.length} completed candles for RAG analysis`
          );
        }
      } else {
        console.log("📸 SNAPSHOT: No new candles to add (all were duplicates)");
      }

      return addedCount > 0;
    } else if (candleEvent.type === "update") {
      // UPDATE: Real-time updates for current incomplete candle
      const candleData = candleEvent.candles?.[0];
      if (!candleData) {
        console.log("⚠️ No candle data in update event");
        return false;
      }

      // Format candle data
      const formattedCandle = {
        timestamp: new Date().toISOString(),
        open: parseFloat(candleData.open),
        high: parseFloat(candleData.high),
        low: parseFloat(candleData.low),
        close: parseFloat(candleData.close),
        volume: parseFloat(candleData.volume),
        product_id: candleData.product_id || "BTC-USD",
        start_time: parseInt(candleData.start),
        event_type: candleEvent.type,
      };

      const currentStartTime = formattedCandle.start_time;

      // Detect candle completion by start time change
      // Only trigger completion if enough time has passed (at least 4 minutes)
      if (lastCandleStartTime && currentStartTime !== lastCandleStartTime) {
        const timeDifferenceMs =
          (currentStartTime - lastCandleStartTime) * 1000;
        const timeDifferenceMinutes = timeDifferenceMs / (1000 * 60);

        // Only add to completed buffer if at least 4 minutes have passed
        if (timeDifferenceMinutes >= 4) {
          // NEW CANDLE PERIOD = Previous candle completed!
          console.log(`✅ CANDLE COMPLETION DETECTED (Buffer)!`);
          console.log(
            `   Previous: ${new Date(lastCandleStartTime * 1000).toISOString()}`
          );
          console.log(
            `   New: ${new Date(currentStartTime * 1000).toISOString()}`
          );
          console.log(
            `   Time difference: ${timeDifferenceMinutes.toFixed(1)} minutes`
          );

          // The previous live candle is now completed - add it to RAG buffer
          if (
            currentLiveCandle &&
            currentLiveCandle.start_time === lastCandleStartTime
          ) {
            const completedVersion = { ...currentLiveCandle };

            // Check if we already have this candle in completed buffer
            const lastCompleted = completedCandles[completedCandles.length - 1];
            const alreadyExists =
              lastCompleted &&
              lastCompleted.start_time === completedVersion.start_time;

            if (!alreadyExists) {
              completedCandles.push(completedVersion);

              // Remove oldest if buffer exceeds max size
              if (completedCandles.length > maxSize) {
                completedCandles.shift();
              }

              console.log(
                `🎯 NEWLY COMPLETED CANDLE added to RAG buffer: ${new Date(
                  completedVersion.start_time * 1000
                ).toISOString()}`
              );

              // Update ready status - Ready immediately when we have any completed candles
              if (!isReady && completedCandles.length > 0) {
                isReady = true;
                console.log(
                  `🎯 Candle buffer is READY! Collected ${completedCandles.length} completed candles for RAG analysis`
                );
              }
            }
          }
        } else {
          console.log(
            `⏭️ Buffer: Candle start time changed but only ${timeDifferenceMinutes.toFixed(
              1
            )} minutes passed - not adding to completed buffer`
          );
        }
      } else if (!lastCandleStartTime) {
        console.log(
          `🔄 Buffer: Initial candle timestamp set: ${new Date(
            currentStartTime * 1000
          ).toISOString()}`
        );
      }

      // Update current live candle and tracking
      currentLiveCandle = formattedCandle;
      lastCandleStartTime = currentStartTime;

      console.log(
        `📈 LIVE UPDATE: $${formattedCandle.close} (${new Date(
          currentStartTime * 1000
        ).toISOString()})`
      );
    }

    // Log buffer status
    console.log(
      `📊 RAG Buffer: ${completedCandles.length}/${maxSize} completed | Live: $${currentLiveCandle?.close} | Ready: ${isReady}`
    );

    return true;
  } catch (error) {
    console.error("💥 Add candle error:", error.message);
    return false;
  }
}

/**
 * Get completed candles formatted for RAG analysis
 * @returns {Object} Formatted candle data for LLM consumption
 */
export function getForRAGAnalysis() {
  if (!isReady) {
    return {
      success: false,
      message: `Buffer not ready. Have ${completedCandles.length}/${maxSize} completed candles`,
    };
  }

  const candleAnalysis = completedCandles.map((candle, index) => {
    const timeStr = new Date(candle.start_time * 1000).toISOString();
    return `Candle ${index + 1} (${timeStr}): Open=$${candle.open}, High=$${
      candle.high
    }, Low=$${candle.low}, Close=$${candle.close}, Volume=${candle.volume}`;
  });

  return {
    success: true,
    data: {
      summary: `Analysis of ${completedCandles.length} completed 5-minute BTC-USD candles`,
      candles: candleAnalysis,
      metadata: {
        oldest_candle: new Date(
          completedCandles[0].start_time * 1000
        ).toISOString(),
        newest_candle: new Date(
          completedCandles[completedCandles.length - 1].start_time * 1000
        ).toISOString(),
        total_candles: completedCandles.length,
        time_span_minutes: completedCandles.length * 5,
      },
    },
  };
}

/**
 * Get current live candle for trading engine
 * @returns {Object|null} Current live candle data
 */
export function getCurrentLiveCandle() {
  return currentLiveCandle;
}

/**
 * Get any available candles for immediate analysis (doesn't wait for buffer to be "ready")
 * @returns {Object} Available candle data regardless of readiness
 */
export function getAvailableCandles() {
  const availableCandles = [...completedCandles];

  // If we have a current live candle, include it as well
  if (currentLiveCandle) {
    availableCandles.push({
      ...currentLiveCandle,
      note: "Live candle (incomplete)",
    });
  }

  if (availableCandles.length === 0) {
    return {
      success: false,
      message:
        "No candle data available yet. Please ensure you're subscribed to the candles channel.",
      data: null,
    };
  }

  const candleAnalysis = availableCandles.map((candle, index) => {
    const timeStr = new Date(candle.start_time * 1000).toISOString();
    const liveNote = candle.note ? ` (${candle.note})` : "";
    return `Candle ${index + 1} (${timeStr})${liveNote}: Open=$${
      candle.open
    }, High=$${candle.high}, Low=$${candle.low}, Close=$${
      candle.close
    }, Volume=${candle.volume}`;
  });

  return {
    success: true,
    data: {
      ready: isReady,
      summary: `Analysis of ${
        availableCandles.length
      } available 5-minute BTC-USD candles ${
        isReady ? "(buffer ready)" : "(buffer collecting)"
      }`,
      candles: candleAnalysis,
      metadata: {
        completed_candles: completedCandles.length,
        has_live_candle: currentLiveCandle !== null,
        buffer_ready: isReady,
        oldest_candle:
          availableCandles.length > 0
            ? new Date(availableCandles[0].start_time * 1000).toISOString()
            : null,
        newest_candle:
          availableCandles.length > 0
            ? new Date(
                availableCandles[availableCandles.length - 1].start_time * 1000
              ).toISOString()
            : null,
        total_candles: availableCandles.length,
        time_span_minutes: completedCandles.length * 5,
      },
    },
  };
}

/**
 * Get raw WebSocket candle data exactly as received from Coinbase for RAG analysis
 * @returns {Object} Raw WebSocket messages for LLM consumption
 */
export function getRawCandleData() {
  if (rawWebSocketMessages.length === 0) {
    return {
      success: false,
      message:
        "No raw candle data available yet. Please ensure you're subscribed to the candles channel.",
      data: null,
    };
  }

  return {
    success: true,
    data: {
      ready: isReady,
      summary: `Raw WebSocket candle data from Coinbase - ${rawWebSocketMessages.length} messages`,
      raw_messages: rawWebSocketMessages,
      metadata: {
        total_messages: rawWebSocketMessages.length,
        buffer_ready: isReady,
        oldest_message:
          rawWebSocketMessages.length > 0
            ? rawWebSocketMessages[0].timestamp
            : null,
        newest_message:
          rawWebSocketMessages.length > 0
            ? rawWebSocketMessages[rawWebSocketMessages.length - 1].timestamp
            : null,
        completed_candles: completedCandles.length,
        has_live_candle: currentLiveCandle !== null,
      },
    },
  };
}

/**
 * Get buffer status
 * @returns {Object} Current buffer state
 */
export function getStatus() {
  return {
    completed_candles: completedCandles.length,
    max_size: maxSize,
    is_ready: isReady,
    progress: Math.round((completedCandles.length / maxSize) * 100),
    current_live_price: currentLiveCandle?.close || null,
    current_live_volume: currentLiveCandle?.volume || null,
    last_candle_start: lastCandleStartTime
      ? new Date(lastCandleStartTime * 1000).toISOString()
      : null,
  };
}

/**
 * Reset the buffer (clear all data)
 */
export function reset() {
  completedCandles = [];
  currentLiveCandle = null;
  lastCandleStartTime = null;
  isReady = false;
  rawWebSocketMessages = [];
  console.log("🔄 Candle buffer reset - all data cleared");
}

/**
 * Set maximum buffer size
 * @param {number} newMaxSize - New maximum size
 */
export function setMaxSize(newMaxSize) {
  maxSize = newMaxSize;
  console.log(`📏 Buffer max size set to ${maxSize}`);
}

/**
 * Get all completed candles (for debugging)
 * @returns {Array} All completed candles
 */
export function getAllCompletedCandles() {
  return [...completedCandles];
}

/**
 * Get all candles (for backwards compatibility)
 * @returns {Array} All completed candles
 */
export function getAllCandles() {
  return getAllCompletedCandles();
}
