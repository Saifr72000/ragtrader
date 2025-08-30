import React, { useState, useEffect, useRef } from "react";
import "./WebSocketDashboard.css";
import { apiService } from "../services/api";

const WebSocketDashboard = React.memo((props) => {
  const [isConnected, setIsConnected] = useState(false);
  const [subscribedTickers, setSubscribedTickers] = useState(new Set());
  const [subscribedCandles, setSubscribedCandles] = useState(new Set());
  const [tickerData, setTickerData] = useState({}); // Store ticker data
  const [candleData, setCandleData] = useState({}); // Store candle data
  const [candleBuilder, setCandleBuilder] = useState({}); // Build candles from ticker data
  const [activeTicker, setActiveTicker] = useState("BTC-USD");
  const [dataMode, setDataMode] = useState("ticker"); // 'ticker' or 'candles'
  const [showRawData, setShowRawData] = useState(false); // Toggle for raw JSON view
  const [lastRawMessage, setLastRawMessage] = useState(null); // Store raw message
  const [lastTickerMessage, setLastTickerMessage] = useState(null); // Store last ticker message
  const [lastCandlesMessage, setLastCandlesMessage] = useState(null); // Store last candles message
  const [isStreaming, setIsStreaming] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isToggling, setIsToggling] = useState(false); // Prevent rapid toggling
  const [isSendingCandles, setIsSendingCandles] = useState(false); // Track sending state
  const [connectionStatus, setConnectionStatus] = useState("disconnected");
  const [error, setError] = useState(null);
  const eventSourceRef = useRef(null);

  const availableTickers = ["BTC-USD", "ETH-USD"];
  const currentData =
    dataMode === "ticker" ? tickerData[activeTicker] : candleData[activeTicker];
  const currentCandle = candleData[activeTicker];

  const API_BASE_URL =
    window.location.hostname === "localhost"
      ? import.meta.env.VITE_LOCAL_BACKEND_URL
      : import.meta.env.VITE_PUBLIC_BACKEND_URL;

  // Connect to WebSocket
  const handleConnect = async () => {
    try {
      setError(null);
      setConnectionStatus("connecting");

      const response = await fetch(`${API_BASE_URL}/coinbase/ws/connect`);
      const data = await response.json();

      if (data.ok) {
        setIsConnected(true);
        setConnectionStatus("connected");
      } else {
        setError("Failed to connect");
        setConnectionStatus("disconnected");
      }
    } catch (err) {
      setError(`Connection error: ${err.message}`);
      setConnectionStatus("disconnected");
    }
  };

  // Subscribe to ticker channel for active ticker
  const handleSubscribe = async () => {
    if (!isConnected) return;

    try {
      setError(null);

      // First unsubscribe from candles if subscribed
      if (subscribedCandles.has(activeTicker)) {
        await handleUnsubscribeCandles();
      }

      const response = await fetch(`${API_BASE_URL}/coinbase/ws/subscribe`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          channel: "ticker",
          product_ids: [activeTicker],
        }),
      });

      const data = await response.json();

      if (data.ok) {
        setSubscribedTickers((prev) => new Set([...prev, activeTicker]));
        if (!isStreaming) {
          startStreaming();
        }
      } else {
        setError("Failed to subscribe");
      }
    } catch (err) {
      setError(`Subscribe error: ${err.message}`);
    }
  };

  // Unsubscribe from ticker channel for active ticker
  const handleUnsubscribe = async () => {
    try {
      setError(null);

      const response = await fetch(`${API_BASE_URL}/coinbase/ws/unsubscribe`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          channel: "ticker",
          product_ids: [activeTicker],
        }),
      });

      const data = await response.json();

      if (data.ok) {
        setSubscribedTickers((prev) => {
          const newSet = new Set(prev);
          newSet.delete(activeTicker);
          return newSet;
        });
        // Stop streaming only if no tickers are subscribed
        if (subscribedTickers.size <= 1) {
          stopStreaming();
        }
      } else {
        setError("Failed to unsubscribe");
      }
    } catch (err) {
      setError(`Unsubscribe error: ${err.message}`);
    }
  };

  // Start SSE streaming
  const startStreaming = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const eventSource = new EventSource(`${API_BASE_URL}/coinbase/ws/stream`);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      setIsStreaming(true);
      setError(null);
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        // Handle candle completion events for automatic RAG analysis
        if (data.type === "candle_completed") {
          console.log("🎯 CANDLE COMPLETION EVENT RECEIVED:", data);
          console.log(
            "📊 Automatically sending to active chat for RAG analysis..."
          );

          // Use the parent's onSendMessage function to send to active chat
          if (props.onSendMessage && props.activeChatId) {
            props.onSendMessage(data.message);
            console.log(
              "✅ Completed candle analysis sent to active chat automatically"
            );
          } else {
            console.warn(
              "⚠️ Cannot auto-send: No active chat or send function available"
            );
            console.log("💡 Please ensure you have an active chat selected");
          }

          return; // Don't process as regular WebSocket data
        }

        // Store raw messages separately for ticker and candles
        if (data.channel === "ticker") {
          setLastTickerMessage(data);
          setLastRawMessage(data); // Also update the general one for backward compatibility
        } else if (data.channel === "candles") {
          setLastCandlesMessage(data);
          setLastRawMessage(data); // Also update the general one for backward compatibility
        }

        // Handle ticker data
        if (
          data.channel === "ticker" &&
          data.events &&
          data.events[0] &&
          data.events[0].tickers &&
          data.events[0].tickers[0]
        ) {
          const ticker = data.events[0].tickers[0];
          const productId = ticker.product_id;
          const processedData = {
            ...ticker,
            time: data.timestamp,
            // Map field names to expected format
            open_24h: ticker.price, // Coinbase doesn't provide open_24h, use current price
            volume_24h: ticker.volume_24_h,
            high_24h: ticker.high_24_h,
            low_24h: ticker.low_24_h,
          };

          // Store ticker data
          setTickerData((prev) => ({
            ...prev,
            [productId]: processedData,
          }));
        }

        // Handle candle data
        if (
          data.channel === "candles" &&
          data.events &&
          data.events[0] &&
          data.events[0].candles &&
          data.events[0].candles[0]
        ) {
          const candle = data.events[0].candles[0];
          const productId = candle.product_id;
          const processedCandle = {
            ...candle,
            time: data.timestamp,
            // Convert strings to numbers for calculations
            open: parseFloat(candle.open),
            high: parseFloat(candle.high),
            low: parseFloat(candle.low),
            close: parseFloat(candle.close),
            volume: parseFloat(candle.volume),
            start_time: new Date(parseInt(candle.start) * 1000).toISOString(),
          };

          // Store candle data
          setCandleData((prev) => ({
            ...prev,
            [productId]: processedCandle,
          }));
        }
      } catch (err) {
        console.error("Failed to parse SSE data:", err);
      }
    };

    eventSource.onerror = (err) => {
      console.error("SSE error:", err);
      setError("Streaming connection error");
      setIsStreaming(false);
    };
  };

  // Stop SSE streaming
  const stopStreaming = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setIsStreaming(false);
  };

  // Fetch last message manually
  // Subscribe to candles channel for active ticker
  const handleSubscribeCandles = async () => {
    if (!isConnected) return;

    try {
      setError(null);

      // First unsubscribe from ticker if subscribed
      if (subscribedTickers.has(activeTicker)) {
        try {
          await handleUnsubscribe();
        } catch (err) {
          console.log(
            "Warning: Could not unsubscribe from ticker:",
            err.message
          );
          // Continue anyway
        }
      }

      const response = await fetch(`${API_BASE_URL}/coinbase/ws/subscribe`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          channel: "candles",
          product_ids: [activeTicker],
        }),
      });

      const data = await response.json();

      if (data.ok) {
        setSubscribedCandles((prev) => new Set([...prev, activeTicker]));
        if (!isStreaming) {
          startStreaming();
        }
      } else {
        setError(`Failed to subscribe to candles: ${JSON.stringify(data)}`);
      }
    } catch (err) {
      setError(`Candles subscribe error: ${err.message}`);
    }
  };

  // Unsubscribe from candles channel for active ticker
  const handleUnsubscribeCandles = async () => {
    try {
      setError(null);

      const response = await fetch(`${API_BASE_URL}/coinbase/ws/unsubscribe`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          channel: "candles",
          product_ids: [activeTicker],
        }),
      });

      const data = await response.json();

      if (data.ok) {
        setSubscribedCandles((prev) => {
          const newSet = new Set(prev);
          newSet.delete(activeTicker);
          return newSet;
        });
      } else {
        setError("Failed to unsubscribe from candles");
      }
    } catch (err) {
      setError(`Candles unsubscribe error: ${err.message}`);
    }
  };

  // Subscribe to all available tickers
  const handleSubscribeAll = async () => {
    if (!isConnected) return;

    try {
      setError(null);

      const response = await fetch(`${API_BASE_URL}/coinbase/ws/subscribe`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          channel: "ticker",
          product_ids: availableTickers,
        }),
      });

      const data = await response.json();

      if (data.ok) {
        setSubscribedTickers(new Set(availableTickers));
        if (!isStreaming) {
          startStreaming();
        }
      } else {
        setError("Failed to subscribe to all tickers");
      }
    } catch (err) {
      setError(`Subscribe all error: ${err.message}`);
    }
  };

  // Subscribe to both ticker and candles for optimal trading
  const handleSubscribeBoth = async () => {
    if (!isConnected) return;

    try {
      setError(null);

      // Subscribe to ticker for real-time triggers
      const tickerResponse = await fetch(
        `${API_BASE_URL}/coinbase/ws/subscribe`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            channel: "ticker",
            product_ids: [activeTicker],
          }),
        }
      );

      const tickerData = await tickerResponse.json();

      // Subscribe to candles for RAG analysis
      const candlesResponse = await fetch(
        `${API_BASE_URL}/coinbase/ws/subscribe`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            channel: "candles",
            product_ids: [activeTicker],
          }),
        }
      );

      const candlesData = await candlesResponse.json();

      if (tickerData.ok && candlesData.ok) {
        setSubscribedTickers((prev) => new Set([...prev, activeTicker]));
        setSubscribedCandles((prev) => new Set([...prev, activeTicker]));

        if (!isStreaming) {
          startStreaming();
        }

        console.log(
          "✅ Subscribed to both ticker and candles for optimal trading!"
        );

        // Automatically send initial candles data to RAG after a short delay
        // to allow the initial snapshot to be received
        setTimeout(async () => {
          try {
            await sendCandlesToChat();
            console.log("🤖 Initial candles data sent to RAG for analysis");
          } catch (error) {
            console.error("Failed to send initial candles to RAG:", error);
          }
        }, 1000); // 1 second delay since we now send any available data
      } else {
        setError(
          `Failed to subscribe: Ticker ${
            tickerData.ok ? "OK" : "Failed"
          }, Candles ${candlesData.ok ? "OK" : "Failed"}`
        );
      }
    } catch (err) {
      setError(`Dual subscribe error: ${err.message}`);
    }
  };

  // Unsubscribe from both channels
  const handleUnsubscribeBoth = async () => {
    try {
      setError(null);

      // Unsubscribe from ticker
      await fetch(`${API_BASE_URL}/coinbase/ws/unsubscribe`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          channel: "ticker",
          product_ids: [activeTicker],
        }),
      });

      // Unsubscribe from candles
      await fetch(`${API_BASE_URL}/coinbase/ws/unsubscribe`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          channel: "candles",
          product_ids: [activeTicker],
        }),
      });

      setSubscribedTickers((prev) => {
        const newSet = new Set(prev);
        newSet.delete(activeTicker);
        return newSet;
      });

      setSubscribedCandles((prev) => {
        const newSet = new Set(prev);
        newSet.delete(activeTicker);
        return newSet;
      });

      console.log("✅ Unsubscribed from both ticker and candles");
    } catch (err) {
      setError(`Dual unsubscribe error: ${err.message}`);
    }
  };

  const fetchLastMessage = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/coinbase/ws/last`);
      const data = await response.json();
      if (data.ok && data.last) {
        const rawMessage = data.last;
        // Extract ticker data from nested structure
        if (
          rawMessage.events &&
          rawMessage.events[0] &&
          rawMessage.events[0].tickers &&
          rawMessage.events[0].tickers[0]
        ) {
          const ticker = rawMessage.events[0].tickers[0];
          const productId = ticker.product_id;
          const processedData = {
            ...ticker,
            time: rawMessage.timestamp,
            // Map field names to expected format
            open_24h: ticker.price, // Coinbase doesn't provide open_24h, use current price
            volume_24h: ticker.volume_24_h,
            high_24h: ticker.high_24_h,
            low_24h: ticker.low_24_h,
          };

          // Store data for the specific ticker
          setTickerData((prev) => ({
            ...prev,
            [productId]: processedData,
          }));
        }
      }
    } catch (err) {
      setError(`Fetch error: ${err.message}`);
    }
  };

  // Safe toggle function to prevent interrupting message flow
  const handleToggleExpanded = () => {
    if (isToggling) return; // Prevent rapid toggling

    setIsToggling(true);
    setIsExpanded(!isExpanded);

    // Reset toggle lock after a short delay
    setTimeout(() => {
      setIsToggling(false);
    }, 300);
  };

  // Send candle data to chat
  const sendCandlesToChat = async () => {
    if (isSendingCandles) {
      console.log("⚠️ Already sending candles, ignoring duplicate request");
      return;
    }

    try {
      setIsSendingCandles(true);
      setError(null); // Clear any previous errors

      // Check if we have an active chat ID
      if (!props.activeChatId) {
        setError(
          "No active chat selected. Please select or create a chat first."
        );
        console.error("Cannot send candles: No active chat ID");
        return;
      }

      console.log("🔍 Fetching candle data from backend...");

      // Fetch candle data from the backend
      const response = await apiService.getCandlesData();

      console.log("📦 Backend response:", response);

      if (response.success && response.data) {
        const rawMessages = response.data.raw_messages;
        const meta = `BTC-USD 5min candles (raw WebSocket data from Coinbase) - ${response.data.metadata.total_messages} messages`;

        // Format the raw WebSocket data for RAG analysis
        const candleBlock = `Raw WebSocket candle data from Coinbase for analysis:

--- COINBASE_RAW_WEBSOCKET_DATA (${meta}) ---
${JSON.stringify(rawMessages, null, 2)}
--- END COINBASE_RAW_WEBSOCKET_DATA ---

Buffer Status: ${
          response.data.ready
            ? "Ready (full buffer)"
            : "Collecting (partial data)"
        }
Total Messages: ${response.data.metadata.total_messages}
Completed Candles: ${response.data.metadata.completed_candles}
${
  response.data.metadata.has_live_candle
    ? "Includes current live candle (incomplete)"
    : "Only completed candles"
}

This is raw WebSocket data exactly as received from Coinbase Advanced Trade API. Please analyze these candlestick patterns and provide trading insights. Look for support/resistance levels, trend patterns, and potential entry/exit signals.`;

        // Use the parent's onSendMessage function for immediate UI updates and hourglass
        if (props.onSendMessage) {
          console.log(
            "🎯 Using parent's message flow for immediate UI update and hourglass"
          );
          console.log("📤 Sending candle data to chat:", {
            chatId: props.activeChatId,
            messageLength: candleBlock.length,
            totalMessages: response.data.metadata.total_messages,
          });

          await props.onSendMessage(candleBlock); // This triggers the hourglass and proper UI flow

          console.log(
            "✅ Candle data sent successfully via parent message flow"
          );
        } else if (props.onSendCandleData) {
          console.log(
            "🎯 Using parent component's data flow for immediate UI update"
          );
          props.onSendCandleData(candleBlock);
        } else {
          // Fallback: Send directly to API if parent function not available
          console.log("🤖 Sending candles data directly to chat API...");
          await apiService.sendMessage(candleBlock, props.activeChatId);
          console.log("✅ Candles data sent successfully to chat!");
        }
      } else {
        // Provide more specific error information
        const errorMsg =
          response.message || "Candle buffer not ready or no data available";
        const statusInfo = response.progress
          ? ` (Progress: ${response.progress}%)`
          : "";
        setError(`${errorMsg}${statusInfo}`);
        console.error("Candle data not ready:", response);

        // If it's just a timing issue, suggest waiting
        if (errorMsg.includes("Buffer not ready")) {
          console.log(
            "💡 Suggestion: The candle buffer is still collecting data. Try again in a few minutes or wait for more 5-minute candles to complete."
          );
        }
      }
    } catch (err) {
      setError(`Failed to send candle data: ${err.message}`);
      console.error("Error sending candles to chat:", err);
    } finally {
      // Reset sending state after a delay to prevent rapid re-sends
      setTimeout(() => {
        setIsSendingCandles(false);
      }, 2000);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopStreaming();
    };
  }, []);

  // Format price with proper decimals
  const formatPrice = (price) => {
    return parseFloat(price).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  // Format timestamp
  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  return (
    <div
      className={`websocket-dashboard ${isExpanded ? "expanded" : "collapsed"}`}
    >
      {/* Header with toggle */}
      <div className="ws-header" onClick={handleToggleExpanded}>
        <div className="ws-title">
          <span className="ws-icon">📡</span>
          <span>Live Market Data</span>
          {currentData && !isExpanded && (
            <span className="ws-price-mini">
              {activeTicker.split("-")[0]}: ${formatPrice(currentData.price)}
            </span>
          )}
        </div>
        <div className="ws-status">
          <span className={`status-dot ${connectionStatus}`}></span>
          <span className="expand-icon">{isExpanded ? "▼" : "▶"}</span>
        </div>
      </div>

      {/* Expanded content */}
      {isExpanded && (
        <div className="ws-content">
          {/* Ticker selector */}
          <div className="ws-ticker-selector">
            {availableTickers.map((ticker) => (
              <button
                key={ticker}
                onClick={() => setActiveTicker(ticker)}
                className={`ws-ticker-tab ${
                  activeTicker === ticker ? "active" : ""
                } ${subscribedTickers.has(ticker) ? "subscribed" : ""}`}
              >
                <span className="ticker-name">{ticker.split("-")[0]}</span>
                {tickerData[ticker] && (
                  <span className="ticker-price">
                    ${formatPrice(tickerData[ticker].price)}
                  </span>
                )}
                {subscribedTickers.has(ticker) && (
                  <span className="ticker-status">●</span>
                )}
              </button>
            ))}
          </div>

          {/* Data Mode Selector */}
          <div className="ws-mode-selector">
            <button
              onClick={() => setDataMode("ticker")}
              className={`ws-mode-btn ${dataMode === "ticker" ? "active" : ""}`}
            >
              📊 Ticker Data
            </button>
            <button
              onClick={() => setDataMode("candles")}
              className={`ws-mode-btn ${
                dataMode === "candles" ? "active" : ""
              }`}
            >
              🕯️ Live Candles
            </button>
          </div>

          {/* Control buttons */}
          <div className="ws-controls">
            <button
              onClick={handleConnect}
              disabled={isConnected || connectionStatus === "connecting"}
              className="ws-btn connect"
            >
              {connectionStatus === "connecting" ? "Connecting..." : "Connect"}
            </button>

            {dataMode === "ticker" ? (
              <>
                <button
                  onClick={handleSubscribe}
                  disabled={!isConnected || subscribedTickers.has(activeTicker)}
                  className="ws-btn subscribe"
                >
                  Subscribe Ticker {activeTicker.split("-")[0]}
                </button>
                <button
                  onClick={handleUnsubscribe}
                  disabled={!subscribedTickers.has(activeTicker)}
                  className="ws-btn unsubscribe"
                >
                  Unsubscribe Ticker {activeTicker.split("-")[0]}
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleSubscribeCandles}
                  disabled={!isConnected || subscribedCandles.has(activeTicker)}
                  className="ws-btn subscribe"
                >
                  Subscribe Candles {activeTicker.split("-")[0]}
                </button>
                <button
                  onClick={handleUnsubscribeCandles}
                  disabled={!subscribedCandles.has(activeTicker)}
                  className="ws-btn unsubscribe"
                >
                  Unsubscribe Candles {activeTicker.split("-")[0]}
                </button>
              </>
            )}

            <button
              onClick={handleSubscribeAll}
              disabled={
                !isConnected ||
                subscribedTickers.size === availableTickers.length
              }
              className="ws-btn subscribe-all"
            >
              Subscribe All Tickers
            </button>

            <button
              onClick={handleSubscribeBoth}
              disabled={
                !isConnected ||
                (subscribedTickers.has(activeTicker) &&
                  subscribedCandles.has(activeTicker))
              }
              className="ws-btn trading-optimal"
            >
              🚀 Subscribe for Trading (Ticker + Candles)
            </button>

            {subscribedTickers.has(activeTicker) &&
              subscribedCandles.has(activeTicker) && (
                <button
                  onClick={handleUnsubscribeBoth}
                  className="ws-btn unsubscribe"
                >
                  Unsubscribe Both
                </button>
              )}

            <button
              onClick={fetchLastMessage}
              disabled={!isConnected}
              className="ws-btn fetch"
            >
              Get Last
            </button>

            <button
              onClick={() => setShowRawData(!showRawData)}
              className="ws-btn debug"
            >
              {showRawData ? "Hide" : "Show"} Raw Data
            </button>

            {subscribedCandles.has(activeTicker) && (
              <button
                onClick={sendCandlesToChat}
                disabled={!props.activeChatId || isSendingCandles}
                className="ws-btn trading-chat"
                style={{
                  backgroundColor: isSendingCandles ? "#6b7280" : "#10b981",
                }}
              >
                {isSendingCandles ? "⏳ Sending..." : "💬 Send to Chat"}
              </button>
            )}
          </div>

          {/* Error display */}
          {error && <div className="ws-error">⚠️ {error}</div>}

          {/* Streaming status */}
          <div className="ws-streaming-status">
            <span
              className={`streaming-indicator ${isStreaming ? "active" : ""}`}
            >
              {isStreaming ? "🔴 Live" : "⚫ Offline"}
            </span>
            <span>WebSocket: {connectionStatus}</span>
            <span>
              Subscribed:{" "}
              {subscribedTickers.size > 0
                ? Array.from(subscribedTickers).join(", ")
                : "None"}
            </span>
          </div>

          {/* Data display */}
          {currentData && (
            <div className="ws-ticker-data">
              <div className="ticker-main">
                <div className="ticker-price">
                  <span className="currency">{activeTicker}</span>
                  <span className="price">
                    $
                    {dataMode === "ticker"
                      ? formatPrice(currentData.price)
                      : formatPrice(currentData.close)}
                  </span>
                </div>
                <div className="ticker-change">
                  {dataMode === "ticker" ? (
                    <span
                      className={`change ${
                        parseFloat(currentData.price) >
                        parseFloat(currentData.open_24h)
                          ? "positive"
                          : "negative"
                      }`}
                    >
                      {parseFloat(currentData.price) >
                      parseFloat(currentData.open_24h)
                        ? "↗"
                        : "↘"}
                    </span>
                  ) : (
                    <span
                      className={`change ${
                        currentData.close > currentData.open
                          ? "positive"
                          : "negative"
                      }`}
                    >
                      {currentData.close > currentData.open ? "↗" : "↘"}
                    </span>
                  )}
                </div>
              </div>

              <div className="ticker-details">
                {dataMode === "ticker" ? (
                  <>
                    <div className="ticker-row">
                      <span>Volume (24h):</span>
                      <span>
                        {parseFloat(currentData.volume_24h).toLocaleString()}
                      </span>
                    </div>
                    <div className="ticker-row">
                      <span>High (24h):</span>
                      <span>${formatPrice(currentData.high_24h)}</span>
                    </div>
                    <div className="ticker-row">
                      <span>Low (24h):</span>
                      <span>${formatPrice(currentData.low_24h)}</span>
                    </div>
                    <div className="ticker-row">
                      <span>Last updated:</span>
                      <span>{formatTime(currentData.time)}</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="ticker-row">
                      <span>Open:</span>
                      <span>${formatPrice(currentData.open)}</span>
                    </div>
                    <div className="ticker-row">
                      <span>High:</span>
                      <span>${formatPrice(currentData.high)}</span>
                    </div>
                    <div className="ticker-row">
                      <span>Low:</span>
                      <span>${formatPrice(currentData.low)}</span>
                    </div>
                    <div className="ticker-row">
                      <span>Volume:</span>
                      <span>{currentData.volume?.toLocaleString()}</span>
                    </div>
                    <div className="ticker-row">
                      <span>Candle Start:</span>
                      <span>{formatTime(currentData.start_time)}</span>
                    </div>
                    <div className="ticker-row">
                      <span>Interval:</span>
                      <span>{currentData.candle_interval}s</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Raw data display - Split into two containers */}
          {showRawData && (
            <div className="raw-data-display">
              <div className="raw-data-header">
                <h4>📡 Raw WebSocket Data</h4>
                <small>Live data streams from Coinbase WebSocket API</small>
              </div>

              <div className="raw-data-containers">
                {/* Left container - Candles data */}
                <div className="raw-data-container candles-container">
                  <div className="raw-data-container-header">
                    <h5>🕯️ Candles Channel (OHLCV)</h5>
                    <span className="update-frequency">
                      Updates: ~8 seconds
                    </span>
                  </div>
                  <div className="raw-data-content">
                    {lastCandlesMessage ? (
                      <pre>{JSON.stringify(lastCandlesMessage, null, 2)}</pre>
                    ) : (
                      <div className="no-data">
                        <p>No candles data received yet.</p>
                        <small>
                          Subscribe to candles channel to see OHLCV data
                        </small>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right container - Ticker data */}
                <div className="raw-data-container ticker-container">
                  <div className="raw-data-container-header">
                    <h5>📊 Ticker Channel (Real-time)</h5>
                    <span className="update-frequency">Updates: ~1 second</span>
                  </div>
                  <div className="raw-data-content">
                    {lastTickerMessage ? (
                      <pre>{JSON.stringify(lastTickerMessage, null, 2)}</pre>
                    ) : (
                      <div className="no-data">
                        <p>No ticker data received yet.</p>
                        <small>
                          Subscribe to ticker channel to see live prices
                        </small>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
});

export default WebSocketDashboard;
