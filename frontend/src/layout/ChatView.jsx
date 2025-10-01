import React, { useState, useRef, useEffect, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import "./ChatView.css";
import { apiService } from "../services/api";
import WebSocketDashboard from "../components/WebSocket/WebSocketDashboard";
import usePolygonBars from "../hooks/usePolygonBars";

const ChatView = ({ messages, onSendMessage, activeChat }) => {
  const [inputMessage, setInputMessage] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  /* Polygon Logic */
  const {
    isBarsPopupOpen,
    setIsBarsPopupOpen,
    isBarsLoading,
    barsConfig,
    setBarsConfig,
    barsSlim,
    barsBlock,
    previewText,
    rawBars,
    rawPreviewText,
    handleFetchBars,
    handleApplyFilter,
    handleInsertBars,
    closeBarsModal,
  } = usePolygonBars();

  const previewRef = useRef(null);
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

  // Handle candle data from WebSocketDashboard
  const handleSendCandleData = (candleBlock) => {
    setInputMessage((prev) => `${prev}${candleBlock}`);
  };

  return (
    <div className="chat-view">
      <div className="chat-header">
        <h2>
          {activeChat?.title
            ? `${activeChat.title} ${activeChat.id}`
            : "New Chat"}
        </h2>
      </div>

      {/* WebSocket Dashboard */}
      <WebSocketDashboard
        onSendCandleData={handleSendCandleData}
        onSendMessage={onSendMessage}
        activeChatId={activeChat?.id}
      />

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
                  onClick={() => handleInsertBars(setInputMessage)}
                  /* onClick={handleInsertBars} */
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
