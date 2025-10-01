import React from "react";
import "./ChatMessages.css";

const ChatMessages = ({ messages, messagesEndRef }) => {
  return (
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
  );
};

export default ChatMessages;
