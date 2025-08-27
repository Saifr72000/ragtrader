import React, { useState, useRef, useEffect, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import "./ChatView.css";
import { apiService } from "../services/api";
import WebSocketDashboard from "../components/WebSocketDashboard";

const ChatView = ({ messages, onSendMessage, activeChat }) => {
  const [inputMessage, setInputMessage] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  // Polygon bars state
  const [isBarsPopupOpen, setIsBarsPopupOpen] = useState(false);
  const [isBarsLoading, setIsBarsLoading] = useState(false);
  const [barsConfig, setBarsConfig] = useState({
    ticker: "X:ETHUSD",
    fromDate: "2025-08-14",
    toDate: "2025-08148",
    timespan: "minute",
    multiplier: 1,
    limit: 1440,
    fromTime: "00:00",
    toTime: "00:30",
    tz: "UTC",
    mode: "window", // retained but we use only window now
    lastN: 60,
  });
  const [barsSlim, setBarsSlim] = useState([]); // filtered bars for attach
  const [barsBlock, setBarsBlock] = useState("");
  const [previewText, setPreviewText] = useState(""); // kept for compatibility (filtered)
  const previewRef = useRef(null);
  const [rawBars, setRawBars] = useState([]);
  const [rawPreviewText, setRawPreviewText] = useState("");
  const rawPreviewRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Autosize textarea when content changes
  useEffect(() => {
    if (textareaRef.current) {
      const el = textareaRef.current;
      el.style.height = "auto";
      const maxHeight = 200; // px
      el.style.height = Math.min(el.scrollHeight, maxHeight) + "px";
    }
  }, [inputMessage]);

  // Autosize preview areas (best-effort)
  useEffect(() => {
    [previewRef.current, rawPreviewRef.current].forEach((el) => {
      if (el) {
        el.style.height = "auto";
        const maxHeight = 360; // px
        el.style.height = Math.min(el.scrollHeight, maxHeight) + "px";
      }
    });
  }, [previewText, rawPreviewText, isBarsPopupOpen]);

  // Handle image drop
  const onDrop = useCallback((acceptedFiles) => {
    if (acceptedFiles && acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    accept: {
      "image/*": [],
    },
    multiple: false,
    noClick: true,
    noKeyboard: true,
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!(inputMessage.trim() || imageFile)) return;

    onSendMessage(inputMessage.trim(), imageFile);
    setInputMessage("");
    setImageFile(null);
    setImagePreview(null);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
  };

  function formatHHMM(date, timeZone) {
    const parts = new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone,
    }).formatToParts(date);
    const hh = parts.find((p) => p.type === "hour")?.value || "00";
    const mm = parts.find((p) => p.type === "minute")?.value || "00";
    return `${hh}:${mm}`;
  }

  function minutesSinceMidnight(date, timeZone) {
    const parts = new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone,
    }).formatToParts(date);
    const hh = Number(parts.find((p) => p.type === "hour")?.value || 0);
    const mm = Number(parts.find((p) => p.type === "minute")?.value || 0);
    return hh * 60 + mm;
  }

  function applyFilter(raw, cfg) {
    const timeZone = cfg.tz || "UTC";
    const sorted = [...raw].sort((a, b) => a.t - b.t);

    // Prefer precise millisecond window in UTC
    if (timeZone === "UTC") {
      const startMs = Date.parse(
        `${cfg.fromDate}T${cfg.fromTime || "00:00"}:00Z`
      );
      const endMs = Date.parse(`${cfg.toDate}T${cfg.toTime || "23:59"}:00Z`);
      const filteredUtc = sorted.filter((b) => b.t >= startMs && b.t < endMs);
      return filteredUtc.map(({ o, c, h, l, t }) => ({
        o,
        c,
        h,
        l,
        t,
        hhmm: formatHHMM(new Date(t), timeZone),
      }));
    }

    // Fallback: timezone-aware by minutes-of-day
    const [fh, fm] = String(cfg.fromTime || "00:00")
      .split(":")
      .map((x) => Number(x));
    const [th, tm] = String(cfg.toTime || "23:59")
      .split(":")
      .map((x) => Number(x));
    const startMin = fh * 60 + fm;
    const endMin = th * 60 + tm;
    const wrap = endMin < startMin;

    const filtered = sorted.filter((b) => {
      const min = minutesSinceMidnight(new Date(b.t), timeZone);
      if (!wrap) return min >= startMin && min < endMin;
      return min >= startMin || min < endMin; // wrap around midnight
    });

    return filtered.map(({ o, c, h, l, t }) => ({
      o,
      c,
      h,
      l,
      t,
      hhmm: formatHHMM(new Date(t), timeZone),
    }));
  }

  const handleFetchBars = async () => {
    try {
      setIsBarsLoading(true);
      const raw = await apiService.fetchPolygonBars(barsConfig);
      setRawBars(raw);
      const tz = barsConfig.tz || "UTC";
      const decorated = Array.isArray(raw)
        ? raw.map((b) => ({ ...b, hhmm: formatHHMM(new Date(b.t), tz) }))
        : [];
      setRawPreviewText(JSON.stringify(decorated, null, 2));
      setBarsSlim([]);
      setBarsBlock("");
      setPreviewText("");
    } catch (err) {
      console.error("Failed to fetch bars:", err);
      setRawBars([]);
      setRawPreviewText("");
      setBarsSlim([]);
      setBarsBlock("");
      setPreviewText("");
    } finally {
      setIsBarsLoading(false);
    }
  };

  const handleApplyFilter = () => {
    try {
      const filtered = applyFilter(rawBars, barsConfig);
      setBarsSlim(filtered.map(({ o, c, h, l, t }) => ({ o, c, h, l, t })));
      setPreviewText(JSON.stringify(filtered, null, 2));

      const meta = `${barsConfig.ticker} ${barsConfig.timespan} mul=${barsConfig.multiplier} tz=${barsConfig.tz}`;
      const range = `window=${barsConfig.fromTime}-${barsConfig.toTime}`;
      const block = `\n\n--- POLYGON_BARS (${meta}, ${range}, n=${
        filtered.length
      }) ---\n${JSON.stringify(
        filtered.map(({ o, c, h, l, t }) => ({ o, c, h, l, t }))
      )}\n--- END POLYGON_BARS ---`;
      setBarsBlock(block);
    } catch (e) {
      console.error("Filter failed:", e);
      setBarsSlim([]);
      setBarsBlock("");
      setPreviewText("");
    }
  };

  const handleInsertBars = () => {
    if (!barsBlock) return;
    setInputMessage((prev) => `${prev}${barsBlock}`);
    setIsBarsPopupOpen(false);
  };

  const closeBarsModal = () => {
    setIsBarsPopupOpen(false);
  };

  return (
    <div className="chat-view">
      <div className="chat-header">
        <h2>{`${activeChat?.title} ${activeChat?.id}` || "New Chat"}</h2>
      </div>

      {/* WebSocket Dashboard */}
      <WebSocketDashboard />

      <div className="messages-container">
        {messages.length === 0 ? (
          <div className="empty-state">
            <h3>Start a new conversation</h3>
            <p>
              Ask me anything about trading, candlestick patterns, or market
              analysis.
            </p>
          </div>
        ) : (
          <div className="messages-list">
            {messages.map((message) => (
              <div
                key={message._id}
                className={`message ${
                  message.role === "user" ? "user-message" : "assistant-message"
                } ${message.isPending ? "pending" : ""}`}
              >
                <div className="message-content">
                  {message.role === "user" &&
                  message.content &&
                  message.content.length > 0 ? (
                    <>
                      {message.content[0].text && (
                        <p>{message.content[0].text}</p>
                      )}
                      {message.content[0].image_url && (
                        <img
                          src={message.content[0].image_url}
                          alt="uploaded"
                          className="chat-image-preview"
                        />
                      )}
                    </>
                  ) : message.role === "assistant" &&
                    message.content &&
                    message.content.length > 0 ? (
                    <p>{message.content[0].text}</p>
                  ) : (
                    <p>Message content not available</p>
                  )}
                  <span className="message-timestamp">
                    {new Date(message.timestamp).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                    {message.isPending && message.role === "assistant" && (
                      <span className="pending-indicator"> ⏳</span>
                    )}
                  </span>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      <div
        className={`input-container${isDragActive ? " drag-active" : ""}`}
        {...getRootProps()}
      >
        <form onSubmit={handleSubmit} className="message-form">
          <input {...getInputProps()} style={{ display: "none" }} />
          <textarea
            ref={textareaRef}
            rows={1}
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              isDragActive ? "Drop image here..." : "Type your message..."
            }
            className="message-input"
            disabled={isDragActive || isBarsLoading}
            autoComplete="off"
          />
          <button
            type="button"
            className="attach-btn"
            onClick={open}
            tabIndex={-1}
            aria-label="Attach image"
          >
            📎
          </button>
          <button
            type="button"
            className={`attach-btn${barsBlock ? " active" : ""}`}
            onClick={() => setIsBarsPopupOpen((v) => !v)}
            aria-label="Configure candlestick bars"
            title="Configure candlestick bars"
          >
            📊
          </button>
          <button
            type="submit"
            className="send-btn"
            disabled={!(inputMessage.trim() || imageFile) || isBarsLoading}
          >
            {isBarsLoading ? "Loading..." : "Send"}
          </button>
        </form>

        {isBarsPopupOpen && (
          <div className="modal-overlay" onClick={closeBarsModal}>
            <div className="bars-modal" onClick={(e) => e.stopPropagation()}>
              <div className="bars-modal-header">
                <h3>Candlestick bars</h3>
                <button
                  className="bars-close"
                  onClick={closeBarsModal}
                  aria-label="Close"
                >
                  ×
                </button>
              </div>

              {/* Top horizontal controls */}
              <div className="bars-controls-top">
                <label>Ticker</label>
                <input
                  type="text"
                  value={barsConfig.ticker}
                  onChange={(e) =>
                    setBarsConfig((c) => ({ ...c, ticker: e.target.value }))
                  }
                />
                <label>From</label>
                <input
                  type="date"
                  value={barsConfig.fromDate}
                  onChange={(e) =>
                    setBarsConfig((c) => ({ ...c, fromDate: e.target.value }))
                  }
                />
                <label>To</label>
                <input
                  type="date"
                  value={barsConfig.toDate}
                  onChange={(e) =>
                    setBarsConfig((c) => ({ ...c, toDate: e.target.value }))
                  }
                />
                <label>Timespan</label>
                <select
                  value={barsConfig.timespan}
                  onChange={(e) =>
                    setBarsConfig((c) => ({ ...c, timespan: e.target.value }))
                  }
                >
                  <option value="second">second</option>
                  <option value="minute">minute</option>
                  <option value="day">day</option>
                </select>
                <label>Multiplier</label>
                <input
                  type="number"
                  min={1}
                  value={barsConfig.multiplier}
                  onChange={(e) =>
                    setBarsConfig((c) => ({
                      ...c,
                      multiplier: Number(e.target.value || 1),
                    }))
                  }
                />
                <label>Limit</label>
                <input
                  type="number"
                  min={1}
                  max={5000}
                  value={barsConfig.limit}
                  onChange={(e) =>
                    setBarsConfig((c) => ({
                      ...c,
                      limit: Number(e.target.value || 1),
                    }))
                  }
                />
                <label>From time</label>
                <input
                  type="time"
                  value={barsConfig.fromTime}
                  onChange={(e) =>
                    setBarsConfig((c) => ({ ...c, fromTime: e.target.value }))
                  }
                />
                <label>To time</label>
                <input
                  type="time"
                  value={barsConfig.toTime}
                  onChange={(e) =>
                    setBarsConfig((c) => ({ ...c, toTime: e.target.value }))
                  }
                />
                <label>Timezone</label>
                <select
                  value={barsConfig.tz}
                  onChange={(e) =>
                    setBarsConfig((c) => ({ ...c, tz: e.target.value }))
                  }
                >
                  <option value="UTC">UTC</option>
                  <option value="America/New_York">America/New_York</option>
                  <option value="Europe/Oslo">Europe/Oslo</option>
                </select>
                <button
                  type="button"
                  className="bars-btn"
                  onClick={handleFetchBars}
                  disabled={isBarsLoading}
                >
                  {isBarsLoading ? "Fetching..." : "Fetch"}
                </button>
                <button
                  type="button"
                  className="bars-btn"
                  onClick={handleApplyFilter}
                  disabled={rawBars.length === 0}
                >
                  Filter
                </button>
              </div>

              {/* Two text boxes: left raw, right filtered */}
              <div className="bars-body">
                <div className="bars-preview-wrap">
                  <label>Fetched (raw)</label>
                  <pre ref={rawPreviewRef} className="bars-preview">
                    {rawPreviewText}
                  </pre>
                </div>
                <div className="bars-preview-wrap">
                  <label>Filtered</label>
                  <pre ref={previewRef} className="bars-preview">
                    {previewText}
                  </pre>
                </div>
              </div>

              <div className="bars-modal-footer">
                <span className="bars-status">
                  {barsSlim.length > 0
                    ? `Filtered ${barsSlim.length} bars ready`
                    : "No filtered data yet"}
                </span>
                <button
                  type="button"
                  className="bars-btn"
                  onClick={handleInsertBars}
                  disabled={!barsBlock}
                >
                  Attach
                </button>
              </div>
            </div>
          </div>
        )}

        {imagePreview && (
          <div className="image-preview-bar">
            <img
              src={imagePreview}
              alt="preview"
              className="chat-image-preview"
            />
            <button
              className="remove-image-btn"
              onClick={handleRemoveImage}
              type="button"
            >
              ✕
            </button>
          </div>
        )}
        {isDragActive && (
          <div className="dropzone-overlay">
            <span>Drop your image here...</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatView;
