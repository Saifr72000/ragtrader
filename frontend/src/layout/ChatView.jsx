import React, { useState, useRef, useEffect } from "react";
import "./ChatView.css";
import WebSocketDashboard from "../components/WebSocket/WebSocketDashboard";
import ChatMessages from "../components/ChatMessages/ChatMessages";
import ChatInputBar from "../components/ChatInputBar/ChatInputBar";

const ChatView = ({ messages, onSendMessage, activeChat }) => {
  const [candleDataHandler, setCandleDataHandler] = useState(null);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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
        onSendCandleData={candleDataHandler || (() => {})}
        onSendMessage={onSendMessage}
        activeChatId={activeChat?.id}
      />
      {/* Chat Messages */}
      <ChatMessages messages={messages} messagesEndRef={messagesEndRef} />

      {/* Chat Input Bar */}
      <ChatInputBar
        onSendMessage={onSendMessage}
        onSendCandleData={setCandleDataHandler}
      />
    </div>
  );
};

export default ChatView;
