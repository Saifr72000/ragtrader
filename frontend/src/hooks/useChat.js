import { useState, useEffect } from "react";
import { apiService } from "../services/api";

const useChat = () => {
  const [error, setError] = useState(null);
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);
  const [retrievedChunks, setRetrievedChunks] = useState([]);

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

  return {
    error,
    chats,
    loading,
    messages,
    activeChatId,
    retrievedChunks,
    handleNewChat,
    handleChatSelect,
    handleSendMessage,
    setChats,
  };
};

export default useChat;
