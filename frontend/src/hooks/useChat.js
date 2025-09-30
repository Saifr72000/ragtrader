import { useState, useEffect } from "react";

const useChat = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  return { messages, input, isLoading, error };
};

export default useChat;
