import React, { useState, useRef, useEffect, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import "./ChatView.css";

const ChatView = ({ messages, onSendMessage, activeChat }) => {
  const [inputMessage, setInputMessage] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Handle image drop
  const onDrop = useCallback((acceptedFiles) => {
    console.log("onDrop fired", acceptedFiles);
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
    noClick: true, // We'll use our own button for file selection
    noKeyboard: true,
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (inputMessage.trim() || imageFile) {
      // If there's an image, send it as a message (simulate for now)
      if (imageFile) {
        const reader = new FileReader();
        reader.onload = (event) => {
          onSendMessage({
            type: "image",
            content: event.target.result,
            timestamp: new Date().toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
          });
        };
        reader.readAsDataURL(imageFile);
        setImageFile(null);
        setImagePreview(null);
      }
      // If there's text, send it as a message
      if (inputMessage.trim()) {
        onSendMessage(inputMessage);
        setInputMessage("");
      }
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
  };

  return (
    <div className="chat-view">
      <div className="chat-header">
        <h2>{activeChat?.title || "New Chat"}</h2>
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
                key={message.id}
                className={`message ${
                  message.type === "user"
                    ? "user-message"
                    : message.type === "image"
                    ? "user-message"
                    : "assistant-message"
                }`}
              >
                <div className="message-content">
                  {message.type === "image" ? (
                    <img
                      src={message.content}
                      alt="uploaded"
                      className="chat-image-preview"
                    />
                  ) : (
                    <p>{message.content}</p>
                  )}
                  <span className="message-timestamp">{message.timestamp}</span>
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
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={
              isDragActive ? "Drop image here..." : "Type your message..."
            }
            className="message-input"
            disabled={isDragActive}
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
            type="submit"
            className="send-btn"
            disabled={!(inputMessage.trim() || imageFile)}
          >
            Send
          </button>
        </form>
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
