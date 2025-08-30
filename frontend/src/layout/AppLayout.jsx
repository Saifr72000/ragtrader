import React, { useState, useEffect, useRef } from "react";
import "./AppLayout.css";
import ChatSidebar from "./ChatSidebar";
import ChatView from "./ChatView";
import RetrievedChunksSidebar from "./RetrievedChunksSidebar";
import { apiService } from "../services/api";

const AppLayout = () => {
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);

  const [activeChatId, setActiveChatId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [error, setError] = useState(null);

  // Draggable sidebar state
  const [sidebarWidth, setSidebarWidth] = useState(300); // Default width in pixels
  const [isDragging, setIsDragging] = useState(false);
  const sidebarRef = useRef(null);

  // Left sidebar visibility
  const [isLeftSidebarVisible, setIsLeftSidebarVisible] = useState(true);

  // Right sidebar state
  const [rightSidebarWidth, setRightSidebarWidth] = useState(350); // Default width in pixels
  const [isRightDragging, setIsRightDragging] = useState(false);
  const rightSidebarRef = useRef(null);
  const [isRightSidebarVisible, setIsRightSidebarVisible] = useState(false);
  const [retrievedChunks, setRetrievedChunks] = useState([]);

  // Load chats from backend on component mount
  useEffect(() => {
    const loadChats = async () => {
      try {
        setLoading(true);
        const chatHistory = await apiService.getChatHistory();

        if (chatHistory && chatHistory.length > 0) {
          // Transform backend data to match frontend format
          let transformedChats = chatHistory.map((chat) => ({
            id: chat._id,
            title: chat.title,
            lastMessage: chat.lastMessage || "Start a new conversation...",
            timestamp: chat.updatedAt,
            isActive: false,
          }));

          // Prefer previously active chat if present
          const savedChatId = localStorage.getItem("activeChatId");
          const hasSaved =
            savedChatId &&
            transformedChats.some((c) => String(c.id) === String(savedChatId));
          const initialChatId = hasSaved ? savedChatId : transformedChats[0].id;

          transformedChats = transformedChats.map((c) => ({
            ...c,
            isActive: String(c.id) === String(initialChatId),
          }));

          setChats(transformedChats);
          setActiveChatId(initialChatId);
          localStorage.setItem("activeChatId", initialChatId);

          // Load messages for the initially active chat
          try {
            const chatMessages = await apiService.getChatMessages(
              initialChatId
            );
            setMessages(
              chatMessages && chatMessages.length > 0 ? chatMessages : []
            );
          } catch (err) {
            console.error("Error loading initial chat messages:", err);
            setMessages([]);
          }
        }
      } catch (error) {
        console.error("Error loading chats:", error);
        // Fallback to default chats if API fails
        setError(error.message || "Failed to load chats");
      } finally {
        setLoading(false);
      }
    };

    loadChats();
  }, []);

  const handleNewChat = async () => {
    try {
      const response = await apiService.createChat("New Chat");
      const newChat = {
        id: response.id || response._id || Date.now(),
        title: response.title || "New Chat",
        lastMessage: "Start a new conversation...",
        timestamp: response.updatedAt || "Just now",
        isActive: true,
      };

      // Deactivate others and prepend new chat
      setChats((prev) => {
        const updated = prev.map((c) => ({ ...c, isActive: false }));
        return [newChat, ...updated];
      });

      setActiveChatId(newChat.id);
      localStorage.setItem("activeChatId", newChat.id);
      setMessages([]);
    } catch (error) {
      console.error("Error creating new chat:", error);
      // Fallback local chat
      const fallback = {
        id: Date.now(),
        title: "New Chat",
        lastMessage: "Start a new conversation...",
        timestamp: "Just now",
        isActive: true,
      };
      setChats((prev) => [
        { ...fallback },
        ...prev.map((c) => ({ ...c, isActive: false })),
      ]);
      setActiveChatId(fallback.id);
      localStorage.setItem("activeChatId", fallback.id);
      setMessages([]);
    }
  };

  const handleChatSelect = (chatId) => {
    setActiveChatId(chatId);
    localStorage.setItem("activeChatId", chatId);

    // Load messages for the selected chat from backend
    const loadChatMessages = async () => {
      try {
        const chatMessages = await apiService.getChatMessages(chatId);
        if (chatMessages && chatMessages.length > 0) {
          setMessages(chatMessages);
        } else {
          // If no messages exist for this chat, show empty state
          setMessages([]);
        }
      } catch (error) {
        console.error("Error loading chat messages:", error);
        // Fallback to empty messages if API fails
        setMessages([]);
      }
    };

    loadChatMessages();
  };

  const handleSendMessage = async (message, imageFile = null) => {
    try {
      // Create user message object for immediate display
      const userMessage = {
        _id: `temp-${Date.now()}`, // Temporary ID
        role: "user",
        content: [
          {
            text: message,
            image_url: imageFile ? URL.createObjectURL(imageFile) : null,
          },
        ],
        timestamp: new Date().toISOString(),
        isPending: true, // Flag to indicate this is a pending message
      };

      // Assistant placeholder to show hourglass while waiting
      const assistantPlaceholderId = `temp-assistant-${Date.now()}`;
      const assistantPlaceholder = {
        _id: assistantPlaceholderId,
        role: "assistant",
        content: [{ text: "Analyzing market data..." }], // Better pending text
        timestamp: new Date().toISOString(),
        isPending: true,
      };

      // Add user message and assistant placeholder immediately to the UI
      setMessages((prevMessages) => [
        ...prevMessages,
        userMessage,
        assistantPlaceholder,
      ]);

      console.log("🤖 Sending message to backend...", {
        chatId: activeChatId,
        messageLength: message.length,
      });

      // Send message to backend
      const response = await apiService.sendMessage(
        message,
        activeChatId,
        imageFile
      );

      console.log("✅ Message sent successfully, reloading chat messages...");

      // Store retrieved chunks for the right sidebar
      if (response.retrievedChunks) {
        setRetrievedChunks(response.retrievedChunks);
        setIsRightSidebarVisible(true);
      }

      // Reload messages to replace the placeholder with the real assistant reply
      // Add a longer delay to ensure backend has processed the RAG response
      let retryCount = 0;
      const maxRetries = 5; // Maximum number of retries

      const reloadMessages = async () => {
        try {
          retryCount++;
          console.log(
            `📥 Attempting to reload messages (attempt ${retryCount}/${maxRetries})`
          );

          const chatMessages = await apiService.getChatMessages(activeChatId);
          if (chatMessages && chatMessages.length > 0) {
            console.log("📥 Reloaded chat messages:", chatMessages.length);

            // Check if we have a new assistant message (not pending)
            const hasNewAssistantMessage = chatMessages.some(
              (msg) =>
                msg.role === "assistant" &&
                !msg.isPending &&
                msg.timestamp > userMessage.timestamp // Ensure it's newer than our sent message
            );

            if (hasNewAssistantMessage) {
              console.log("✅ Found new assistant response, updating messages");
              setMessages(chatMessages);
            } else if (retryCount < maxRetries) {
              console.log(
                "⏳ No new assistant response yet, retrying in 3 seconds..."
              );
              // Keep trying for a bit longer
              setTimeout(reloadMessages, 3000);
            } else {
              console.log("⚠️ Maximum retries reached, keeping pending state");
              // After max retries, update the pending message to show the issue
              setMessages((prevMessages) =>
                prevMessages.map((msg) =>
                  msg._id === assistantPlaceholderId
                    ? {
                        ...msg,
                        content: [
                          {
                            text: "⚠️ RAG analysis failed. Please check your OpenAI API quota and try again.",
                          },
                        ],
                        isPending: false,
                      }
                    : msg
                )
              );
            }
          }
        } catch (reloadError) {
          console.error("Error reloading messages:", reloadError);
          if (retryCount < maxRetries) {
            // Keep the pending message if reload fails and try again
            setTimeout(reloadMessages, 5000);
          }
        }
      };

      // Start the reload process after a short delay
      setTimeout(reloadMessages, 2000); // Increased initial delay
    } catch (error) {
      console.error("Error sending message:", error);

      // Check if it's an API quota/rate limit error
      const isAPIError =
        error.message &&
        (error.message.includes("quota") ||
          error.message.includes("rate limit") ||
          error.message.includes("429"));

      // Update the assistant placeholder with error info
      setMessages((prevMessages) =>
        prevMessages.map((msg) =>
          msg._id === assistantPlaceholderId
            ? {
                ...msg,
                content: [
                  {
                    text: isAPIError
                      ? "⚠️ OpenAI API quota exceeded. Please check your billing and try again."
                      : `❌ Error sending message: ${error.message}`,
                  },
                ],
                isPending: false,
              }
            : msg
        )
      );

      // Don't start the reload process if we have an immediate error
      return;
    }
  };

  const handleMouseDown = (e) => {
    setIsDragging(true);
    e.preventDefault();
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;

    const newWidth = e.clientX;
    const minWidth = 200; // Minimum sidebar width
    const maxWidth = window.innerWidth * 0.3; // Maximum 60% of screen width

    if (newWidth >= minWidth && newWidth <= maxWidth) {
      setSidebarWidth(newWidth);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Right sidebar drag handlers
  const handleRightMouseDown = (e) => {
    setIsRightDragging(true);
    e.preventDefault();
  };

  const handleRightMouseMove = (e) => {
    if (!isRightDragging) return;

    const newWidth = window.innerWidth - e.clientX;
    const minWidth = 250; // Minimum sidebar width
    const maxWidth = window.innerWidth * 0.4; // Maximum 40% of screen width

    if (newWidth >= minWidth && newWidth <= maxWidth) {
      setRightSidebarWidth(newWidth);
    }
  };

  const handleRightMouseUp = () => {
    setIsRightDragging(false);
  };

  // Add global mouse event listeners
  useEffect(() => {
    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);

      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isDragging]);

  // Add global mouse event listeners for right sidebar
  useEffect(() => {
    if (isRightDragging) {
      document.addEventListener("mousemove", handleRightMouseMove);
      document.addEventListener("mouseup", handleRightMouseUp);

      return () => {
        document.removeEventListener("mousemove", handleRightMouseMove);
        document.removeEventListener("mouseup", handleRightMouseUp);
      };
    }
  }, [isRightDragging]);

  // Show loading state while fetching chats
  if (loading) {
    return (
      <div className="app-layout">
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            height: "100vh",
          }}
        >
          <div>Loading chats...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-layout">
      {/* Top control bar */}
      <div className="top-control-bar">
        <div className="top-control-icons">
          <button
            className="control-icon-btn"
            title={
              isLeftSidebarVisible ? "Hide left sidebar" : "Show left sidebar"
            }
            onClick={() => setIsLeftSidebarVisible((v) => !v)}
          >
            {/* Left drawer icon */}
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <rect
                x="3"
                y="4"
                width="18"
                height="16"
                rx="2"
                stroke="#6c757d"
                strokeWidth="1.8"
              />
              <rect x="3" y="4" width="4" height="16" rx="2" fill="#6c757d" />
            </svg>
          </button>
          <button
            className="control-icon-btn"
            title={
              isRightSidebarVisible
                ? "Hide right sidebar"
                : "Show right sidebar"
            }
            onClick={() => setIsRightSidebarVisible((v) => !v)}
          >
            {/* Right drawer icon */}
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <rect
                x="3"
                y="4"
                width="18"
                height="16"
                rx="2"
                stroke="#6c757d"
                strokeWidth="1.8"
              />
              <rect x="17" y="4" width="4" height="16" rx="2" fill="#6c757d" />
            </svg>
          </button>
        </div>
      </div>

      {isLeftSidebarVisible && (
        <div
          ref={sidebarRef}
          className="chat-sidebar-container"
          style={{ width: `${sidebarWidth}px` }}
        >
          <ChatSidebar
            chats={chats}
            onNewChat={handleNewChat}
            onChatSelect={handleChatSelect}
            activeChatId={activeChatId}
          />
        </div>
      )}

      {/* Left resize handle */}
      {isLeftSidebarVisible && (
        <div
          className={`resize-handle ${isDragging ? "dragging" : ""}`}
          onMouseDown={handleMouseDown}
          style={{
            cursor: "col-resize",
            width: "4px",
            backgroundColor: isDragging ? "#007bff" : "#e1e5e9",
            transition: isDragging ? "none" : "background-color 0.2s ease",
          }}
        />
      )}

      <div className="chat-view-container" style={{ flex: 1 }}>
        <ChatView
          messages={messages}
          onSendMessage={handleSendMessage}
          activeChat={chats.find((chat) => chat.id === activeChatId)}
        />
      </div>

      {/* Right resize handle */}
      {isRightSidebarVisible && (
        <div
          className={`resize-handle right ${isRightDragging ? "dragging" : ""}`}
          onMouseDown={handleRightMouseDown}
          style={{
            cursor: "col-resize",
            width: "4px",
            backgroundColor: isRightDragging ? "#007bff" : "#e1e5e9",
            transition: isRightDragging ? "none" : "background-color 0.2s ease",
          }}
        />
      )}

      {/* Right sidebar */}
      {isRightSidebarVisible && (
        <div
          ref={rightSidebarRef}
          className="retrieved-chunks-sidebar-container"
          style={{ width: `${rightSidebarWidth}px` }}
        >
          <RetrievedChunksSidebar
            retrievedChunks={retrievedChunks}
            isVisible={true}
            onToggle={() => setIsRightSidebarVisible(false)}
          />
        </div>
      )}

      {/* We intentionally remove the floating toggle when hidden to rely on the top bar */}
    </div>
  );
};

export default AppLayout;
