import React from "react";
import "./ChatSidebar.css";

const ChatSidebar = ({ chats, onNewChat, onChatSelect, activeChatId }) => {
  return (
    <div className="chat-sidebar">
      <div className="sidebar-header">
        <h2>Chat History</h2>
        <button className="new-chat-btn" onClick={onNewChat}>
          + New Chat
        </button>
      </div>

      <div className="chat-list">
        {chats.map((chat) => (
          <div
            key={chat.id}
            className={`chat-item ${chat.id === activeChatId ? "active" : ""}`}
            onClick={() => onChatSelect(chat.id)}
          >
            <div className="chat-info">
              <h3 className="chat-title">{chat.title}</h3>
              <p className="chat-preview">{chat.lastMessage}</p>
              <span className="chat-timestamp">{chat.timestamp}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="sidebar-footer">
        <p className="footer-text">RAGTrader Assistant</p>
      </div>
    </div>
  );
};

export default ChatSidebar;
