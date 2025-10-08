import { useState, useEffect } from "react";
import { apiService } from "../../services/api";

const useCoinbase = () => {
  const [coinbaseData, setCoinbaseData] = useState(null);
  const [coinbaseError, setCoinbaseError] = useState(null);
  const [coinbaseLoading, setCoinbaseLoading] = useState(false);

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

  const fetchTradingStatus = async () => {
    try {
      console.log("🔍 Fetching trading status...");
      const response = await fetch(`${API_BASE_URL}/auto-trading/status`);
      const result = await response.json();
      console.log("📊 Trading status:", result);

      if (result.success && result.data) {
        setAutoTradingStatus(result.data);
        setActiveSignal(result.data.signal_status?.active_signal);
      }
    } catch (error) {
      console.error("❌ Error fetching trading status:", error);
    }
  };

  useEffect(() => {
    return () => {
      stopStreaming();
    };
  }, []);
};
