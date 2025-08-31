/**
 * Signal Manager Service
 * Manages active trading signals and their lifecycle
 */

// Active signal storage
let activeSignal = null;
let signalHistory = [];
let maxHistorySize = 50;

/**
 * Set a new active trading signal
 * @param {Object} signal - Parsed trading signal from RAG
 * @param {string} source - Source of the signal (e.g., chat ID, timestamp)
 * @returns {boolean} Success status
 */
export function setActiveSignal(signal, source = "unknown") {
  try {
    // Clear previous signal
    if (activeSignal) {
      console.log(
        `🔄 Replacing active signal: ${activeSignal.action} → ${signal.action}`
      );

      // Archive previous signal
      archiveSignal(activeSignal, "REPLACED");
    }

    // Set new active signal
    activeSignal = {
      ...signal,
      id: generateSignalId(),
      source: source,
      created_at: new Date().toISOString(),
      status: "ACTIVE",
      triggered_at: null,
      executed_at: null,
    };

    console.log(`✅ New active signal set:`, activeSignal);
    logSignalStatus();

    return true;
  } catch (error) {
    console.error("💥 Error setting active signal:", error.message);
    return false;
  }
}

/**
 * Get the current active signal
 * @returns {Object|null} Active signal or null
 */
export function getActiveSignal() {
  return activeSignal;
}

/**
 * Check if there's an active signal
 * @returns {boolean} True if active signal exists
 */
export function hasActiveSignal() {
  return activeSignal !== null && activeSignal.status === "ACTIVE";
}

/**
 * Clear the active signal
 * @param {string} reason - Reason for clearing
 */
export function clearActiveSignal(reason = "MANUAL_CLEAR") {
  if (activeSignal) {
    console.log(`🗑️ Clearing active signal: ${reason}`);
    archiveSignal(activeSignal, reason);
    activeSignal = null;
  }
}

/**
 * Mark signal as triggered (price condition met)
 * @param {number} triggerPrice - Price at which signal was triggered
 * @returns {Object|null} Triggered signal for execution
 */
export function triggerSignal(triggerPrice) {
  if (!activeSignal || activeSignal.status !== "ACTIVE") {
    return null;
  }

  activeSignal.status = "TRIGGERED";
  activeSignal.triggered_at = new Date().toISOString();
  activeSignal.actual_trigger_price = triggerPrice;

  console.log(`🎯 Signal TRIGGERED at $${triggerPrice}:`, activeSignal);

  return { ...activeSignal };
}

/**
 * Mark signal as executed (trade placed)
 * @param {Object} executionResult - Result from trade execution
 */
export function markSignalExecuted(executionResult) {
  if (!activeSignal) {
    return;
  }

  activeSignal.status = "EXECUTED";
  activeSignal.executed_at = new Date().toISOString();
  activeSignal.execution_result = executionResult;

  console.log(`✅ Signal EXECUTED:`, activeSignal);

  // Archive executed signal
  archiveSignal(activeSignal, "EXECUTED");
  activeSignal = null;
}

/**
 * Mark signal as failed
 * @param {string} reason - Failure reason
 */
export function markSignalFailed(reason) {
  if (!activeSignal) {
    return;
  }

  activeSignal.status = "FAILED";
  activeSignal.failure_reason = reason;

  console.log(`❌ Signal FAILED: ${reason}`);

  // Archive failed signal
  archiveSignal(activeSignal, "FAILED");
  activeSignal = null;
}

/**
 * Archive a signal to history
 * @param {Object} signal - Signal to archive
 * @param {string} endReason - Reason for archiving
 */
function archiveSignal(signal, endReason) {
  const archivedSignal = {
    ...signal,
    end_reason: endReason,
    archived_at: new Date().toISOString(),
  };

  signalHistory.unshift(archivedSignal);

  // Limit history size
  if (signalHistory.length > maxHistorySize) {
    signalHistory = signalHistory.slice(0, maxHistorySize);
  }

  console.log(`📚 Signal archived: ${signal.action} (${endReason})`);
}

/**
 * Get signal history
 * @param {number} limit - Number of historical signals to return
 * @returns {Array} Historical signals
 */
export function getSignalHistory(limit = 10) {
  return signalHistory.slice(0, limit);
}

/**
 * Get signal statistics
 * @returns {Object} Signal stats
 */
export function getSignalStats() {
  const total = signalHistory.length;
  const executed = signalHistory.filter(
    (s) => s.end_reason === "EXECUTED"
  ).length;
  const failed = signalHistory.filter((s) => s.end_reason === "FAILED").length;
  const replaced = signalHistory.filter(
    (s) => s.end_reason === "REPLACED"
  ).length;

  return {
    total_signals: total,
    executed: executed,
    failed: failed,
    replaced: replaced,
    success_rate: total > 0 ? ((executed / total) * 100).toFixed(1) : "0.0",
    active_signal: activeSignal ? activeSignal.action : null,
  };
}

/**
 * Generate unique signal ID
 * @returns {string} Unique signal ID
 */
function generateSignalId() {
  return `signal_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
}

/**
 * Log current signal status for debugging
 */
function logSignalStatus() {
  if (activeSignal) {
    console.log(`📊 Active Signal Status:`);
    console.log(`   Action: ${activeSignal.action}`);
    console.log(
      `   Trigger: ${activeSignal.trigger_type} $${activeSignal.trigger_price}`
    );
    console.log(`   Stop: $${activeSignal.stop_loss || "N/A"}`);
    console.log(`   Target: $${activeSignal.take_profit || "N/A"}`);
    console.log(`   Confidence: ${activeSignal.confidence}`);
  } else {
    console.log(`📊 No active signal`);
  }
}

/**
 * Reset all signals (for testing/emergency)
 */
export function resetSignals() {
  console.log("🔄 Resetting all signals...");
  activeSignal = null;
  signalHistory = [];
}

/**
 * Get comprehensive signal status
 * @returns {Object} Complete signal information
 */
export function getSignalStatus() {
  return {
    active_signal: activeSignal,
    has_active: hasActiveSignal(),
    history_count: signalHistory.length,
    stats: getSignalStats(),
  };
}
