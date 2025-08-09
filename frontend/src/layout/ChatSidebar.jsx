import React, { useState, useEffect } from "react";
import "./ChatSidebar.css";

const ChatSidebar = ({ chats, onNewChat, onChatSelect, activeChatId }) => {
  const [editingChatId, setEditingChatId] = useState(null);
  const [editTitle, setEditTitle] = useState("");

  useEffect(() => {
    console.log("editTitle state changed to:", editTitle);
  }, [editTitle]);

  useEffect(() => {
    console.log("editingChatId state changed to:", editingChatId);
  }, [editingChatId]);

  const handleDeleteChat = (e, chatId) => {
    e.stopPropagation(); // Prevent chat selection when clicking delete
    // TODO: Implement delete functionality
    console.log("Delete chat:", chatId);
  };

  const handleEditChat = (e, chatId, currentTitle) => {
    e.stopPropagation(); // Prevent chat selection when clicking edit
    console.log(
      "Edit clicked - chatId:",
      chatId,
      "currentTitle:",
      currentTitle
    );
    setEditingChatId(chatId);
    setEditTitle(currentTitle);
    console.log(
      "State set - editingChatId:",
      chatId,
      "editTitle:",
      currentTitle
    );
  };

  const handleSaveEdit = (e, chatId) => {
    e.stopPropagation();
    // TODO: Implement save functionality with backend
    console.log("Save edit for chat:", chatId, "New title:", editTitle);
    setEditingChatId(null);
    setEditTitle("");
  };

  const handleCancelEdit = (e) => {
    e.stopPropagation();
    setEditingChatId(null);
    setEditTitle("");
  };

  const handleKeyPress = (e, chatId) => {
    if (e.key === "Enter") {
      handleSaveEdit(e, chatId);
    } else if (e.key === "Escape") {
      handleCancelEdit(e);
    }
  };

  return (
    <div className="chat-sidebar">
      <div className="sidebar-header">
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
              {editingChatId === chat.id ? (
                <div className="edit-title-container">
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    onKeyDown={(e) => handleKeyPress(e, chat.id)}
                    onBlur={(e) => handleSaveEdit(e, chat.id)}
                    className="edit-title-input"
                    autoFocus
                  />
                  <div className="edit-actions">
                    <button
                      className="edit-action-btn save-btn"
                      onClick={(e) => handleSaveEdit(e, chat.id)}
                      title="Save"
                    >
                      ✓
                    </button>
                    <button
                      className="edit-action-btn cancel-btn"
                      onClick={handleCancelEdit}
                      title="Cancel"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ) : (
                <h3 className="chat-title">{chat.title}</h3>
              )}
              <p className="chat-preview">{chat.lastMessage}</p>
              <span className="chat-timestamp">{chat.timestamp}</span>
            </div>
            {editingChatId !== chat.id && (
              <div className="chat-actions">
                <button
                  className="chat-action-btn edit-btn"
                  onClick={(e) => handleEditChat(e, chat.id, chat.title)}
                  title="Edit chat name"
                >
                  ✏️
                </button>
                <button
                  className="chat-action-btn delete-btn"
                  onClick={(e) => handleDeleteChat(e, chat.id)}
                  title="Delete chat"
                >
                  🗑️
                </button>
              </div>
            )}
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
