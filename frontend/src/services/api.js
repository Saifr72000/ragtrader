const API_BASE_URL =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1"
    ? import.meta.env.VITE_LOCAL_BACKEND_URL || "http://localhost:3000/api"
    : import.meta.env.VITE_PUBLIC_BACKEND_URL || "http://localhost:3000/api";

export const apiService = {
  // Send a message to the chat API
  async sendMessage(message, chatId = null, imageFile = null) {
    try {
      let response;

      if (imageFile) {
        // Handle image upload
        const formData = new FormData();
        formData.append("chatId", chatId);
        formData.append("role", "user");
        formData.append("content[text]", message);
        formData.append("content[file]", imageFile);
        formData.append("folder", "queries");

        response = await fetch(`${API_BASE_URL}/message`, {
          method: "POST",
          body: formData,
        });
      } else {
        // Handle text-only message
        response = await fetch(`${API_BASE_URL}/message`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            chatId,
            role: "user",
            content: {
              text: message,
              image_url: null,
            },
          }),
        });
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return {
        reply: data.reply,
        retrievedChunks: data.retrievedChunks || [],
      };
    } catch (error) {
      console.error("Error sending message:", error);
      throw error;
    }
  },

  // Fetch Polygon candlestick bars and return only the results array (GET with query params)
  async fetchPolygonBars({
    fromDate,
    toDate,
    timespan,
    multiplier,
    limit,
    ticker = "X:BTCUSD",
    max = 5000,
  }) {
    const params = new URLSearchParams({
      ticker,
      fromDate,
      toDate,
      timespan,
      multiplier: String(parseInt(multiplier)),
      limit: String(parseInt(limit)),
      max: String(parseInt(max)),
    });
    const resp = await fetch(`${API_BASE_URL}/polygon?${params}`);
    if (!resp.ok) {
      throw new Error(`Polygon fetch failed: ${resp.status}`);
    }
    const data = await resp.json();
    const arr = Array.isArray(data?.results) ? data.results : [];
    return arr;
  },

  // Get chat history
  async getChatHistory() {
    try {
      const response = await fetch(`${API_BASE_URL}/chat`);
      console.log("response", response);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Error fetching chat history:", error);
      throw error;
    }
  },

  // Get messages for a specific chat
  async getChatMessages(chatId) {
    try {
      const response = await fetch(`${API_BASE_URL}/chat/${chatId}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.messages; // Return just the messages array
    } catch (error) {
      console.error("Error fetching chat messages:", error);
      throw error;
    }
  },

  // Create a new chat
  async createChat(title = "New Chat") {
    try {
      const response = await fetch(`${API_BASE_URL}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ title }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Error creating chat:", error);
      throw error;
    }
  },

  // Upload PDF for processing
  async uploadPDF(file) {
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(`${API_BASE_URL}/ingest`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Error uploading PDF:", error);
      throw error;
    }
  },

  // Delete a chat
  async deleteChat(chatId) {
    try {
      const response = await fetch(`${API_BASE_URL}/chat/${chatId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error deleting chat:", error);
      throw error;
    }
  },

  // Get candles data for RAG analysis
  async getCandlesData() {
    try {
      const response = await fetch(`${API_BASE_URL}/coinbase/candles/raw`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error fetching candles data:", error);
      throw error;
    }
  },
};

// Example usage in your components:
/*
import { apiService } from '../services/api';

// Send a message
const handleSendMessage = async (message) => {
  try {
    const response = await apiService.sendMessage(message, activeChatId);
    // Handle the response
    console.log('AI Response:', response);
  } catch (error) {
    // Handle error
    console.error('Failed to send message:', error);
  }
};

// Create new chat
const handleNewChat = async () => {
  try {
    const newChat = await apiService.createChat('New Trading Discussion');
    // Handle the new chat
    console.log('New chat created:', newChat);
  } catch (error) {
    console.error('Failed to create chat:', error);
  }
};
*/
