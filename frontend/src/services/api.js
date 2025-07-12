const API_BASE_URL = "http://localhost:3000/api";

export const apiService = {
  // Send a message to the chat API
  async sendMessage(message, chatId = null) {
    try {
      const response = await fetch(`${API_BASE_URL}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message,
          chatId,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Error sending message:", error);
      throw error;
    }
  },

  // Get chat history
  async getChatHistory() {
    try {
      const response = await fetch(`${API_BASE_URL}/chats`);

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
      const response = await fetch(`${API_BASE_URL}/chats/${chatId}/messages`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Error fetching chat messages:", error);
      throw error;
    }
  },

  // Create a new chat
  async createChat(title = "New Chat") {
    try {
      const response = await fetch(`${API_BASE_URL}/chats`, {
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
