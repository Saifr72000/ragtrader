import React, { useState } from "react";
import "./AppLayout.css";
import ChatSidebar from "./ChatSidebar";
import ChatView from "./ChatView";

const AppLayout = () => {
  const [chats, setChats] = useState([
    {
      id: 1,
      title: "Candlestick Trading Discussion",
      lastMessage: "What are the key patterns to look for?",
      timestamp: "2 hours ago",
      isActive: true,
    },
    {
      id: 2,
      title: "Market Analysis Chat",
      lastMessage: "How do I identify support levels?",
      timestamp: "1 day ago",
      isActive: false,
    },
    {
      id: 3,
      title: "Trading Strategy Session",
      lastMessage: "Let's review the pin bar strategy",
      timestamp: "3 days ago",
      isActive: false,
    },
  ]);

  const [activeChatId, setActiveChatId] = useState(1);
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: "user",
      content: "What are the key candlestick patterns I should know?",
      timestamp: "2:30 PM",
    },
    {
      id: 2,
      type: "assistant",
      content:
        "The most important candlestick patterns include the Doji, Hammer, Shooting Star, Engulfing patterns, and Morning/Evening Star patterns. Each has specific implications for market direction.",
      timestamp: "2:31 PM",
    },
    {
      id: 3,
      type: "user",
      content: "Can you explain the Doji pattern in detail?",
      timestamp: "2:32 PM",
    },
  ]);

  const handleNewChat = () => {
    const newChat = {
      id: Date.now(),
      title: "New Chat",
      lastMessage: "Start a new conversation...",
      timestamp: "Just now",
      isActive: false,
    };

    setChats((prevChats) => {
      // Deactivate all other chats
      const updatedChats = prevChats.map((chat) => ({
        ...chat,
        isActive: false,
      }));
      return [newChat, ...updatedChats];
    });

    setActiveChatId(newChat.id);
    setMessages([]);
  };

  const handleChatSelect = (chatId) => {
    setActiveChatId(chatId);
    setChats((prevChats) =>
      prevChats.map((chat) => ({
        ...chat,
        isActive: chat.id === chatId,
      }))
    );

    // In a real app, you'd load messages for this chat
    // For now, we'll just show some sample messages
    if (chatId === 1) {
      setMessages([
        {
          id: 1,
          type: "user",
          content: "What are the key candlestick patterns I should know?",
          timestamp: "2:30 PM",
        },
        {
          id: 2,
          type: "assistant",
          content:
            "The most important candlestick patterns include the Doji, Hammer, Shooting Star, Engulfing patterns, and Morning/Evening Star patterns. Each has specific implications for market direction.",
          timestamp: "2:31 PM",
        },
      ]);
    } else {
      setMessages([
        {
          id: 1,
          type: "user",
          content: "This is a different chat conversation.",
          timestamp: "1:00 PM",
        },
      ]);
    }
  };

  const handleSendMessage = (message) => {
    const newMessage = {
      id: Date.now(),
      type: "user",
      content: message,
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    setMessages((prev) => [...prev, newMessage]);

    // Update the active chat's last message
    setChats((prevChats) =>
      prevChats.map((chat) =>
        chat.id === activeChatId
          ? { ...chat, lastMessage: message, timestamp: "Just now" }
          : chat
      )
    );

    // Simulate AI response (in real app, this would be an API call)
    setTimeout(() => {
      const aiResponse = {
        id: Date.now() + 1,
        type: "assistant",
        content:
          "This is a simulated response. In a real application, this would be an API call to your backend.",
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };
      setMessages((prev) => [...prev, aiResponse]);
    }, 1000);
  };

  return (
    <div className="app-layout">
      <ChatSidebar
        chats={chats}
        onNewChat={handleNewChat}
        onChatSelect={handleChatSelect}
        activeChatId={activeChatId}
      />
      <ChatView
        messages={messages}
        onSendMessage={handleSendMessage}
        activeChat={chats.find((chat) => chat.id === activeChatId)}
      />
    </div>
  );
};

export default AppLayout;
