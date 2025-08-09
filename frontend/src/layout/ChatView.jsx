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
      // Send message with image file if present
      onSendMessage(inputMessage.trim(), imageFile);

      // Clear the form
      setInputMessage("");
      setImageFile(null);
      setImagePreview(null);
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
                }`}
              >
                <div className="message-content">
                  {message.role === "user" &&
                  message.content &&
                  message.content.length > 0 ? (
                    // User message - can have text and/or image
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
                    // Assistant message - text only
                    <p>{message.content[0].text}</p>
                  ) : (
                    <p>Message content not available</p>
                  )}
                  <span className="message-timestamp">
                    {new Date(message.timestamp).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
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
