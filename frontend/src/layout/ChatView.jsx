import React, { useState, useRef, useEffect, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import "./ChatView.css";
import { apiService } from "../services/api";

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
    fromDate: "2023-03-13",
    toDate: "2023-03-24",
    timespan: "day",
    multiplier: 1,
    limit: 60,
  });
  const [barsSlim, setBarsSlim] = useState([]); // fetched slim bars
  const [barsBlock, setBarsBlock] = useState(""); // ready-to-insert text block
  const [previewText, setPreviewText] = useState("");
  const previewRef = useRef(null);

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

  // Autosize preview area
  useEffect(() => {
    if (previewRef.current) {
      const el = previewRef.current;
      el.style.height = "auto";
      const maxHeight = 320; // px
      el.style.height = Math.min(el.scrollHeight, maxHeight) + "px";
    }
  }, [previewText, isBarsPopupOpen]);

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

  const handleFetchBars = async () => {
    try {
      setIsBarsLoading(true);
      const results = await apiService.fetchPolygonBars(barsConfig);
      const slim = Array.isArray(results)
        ? results.map(({ o, c, h, l, t }) => ({ o, c, h, l, t }))
        : [];
      setBarsSlim(slim);
      const block = `\n\n--- POLYGON_BARS (${barsConfig.timespan}, mul=${
        barsConfig.multiplier
      }, n=${slim.length}) ---\n${JSON.stringify(
        slim
      )}\n--- END POLYGON_BARS ---`;
      setBarsBlock(block);
      setPreviewText(JSON.stringify(slim, null, 2));
    } catch (err) {
      console.error("Failed to fetch bars:", err);
      setBarsSlim([]);
      setBarsBlock("");
      setPreviewText("");
    } finally {
      setIsBarsLoading(false);
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

              <div className="bars-row">
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
                  <option value="day">day</option>
                  <option value="minute">minute</option>
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
              </div>

              <div className="bars-row">
                <button
                  type="button"
                  className="bars-btn"
                  onClick={handleFetchBars}
                  disabled={isBarsLoading}
                >
                  {isBarsLoading ? "Fetching..." : "Fetch"}
                </button>
                <span className="bars-status">
                  {barsSlim.length > 0
                    ? `Fetched ${barsSlim.length} bars`
                    : "No data fetched yet"}
                </span>
              </div>

              <div className="bars-preview-wrap">
                <label>Preview of response</label>
                <pre className="bars-preview">{previewText}</pre>
              </div>

              <div className="bars-modal-footer">
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
