import { useState, useRef, useEffect } from 'react';

export function useAppLogic() {
  // --- Search & Filter State ---
  const [zipcode, setZipcode] = useState('');
  const [target, setTarget] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [results, setResults] = useState([]);

  // --- Chat State ---
  const [messages, setMessages] = useState([
    { role: 'ai', text: "Welcome to Teck Open Box! How can I assist you today?" }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef(null);

  const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

  // Auto-scroll logic
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // --- PDF UPLOAD LOGIC ---
  const handleFileUpload = async (file, domain = 'main_inventory', overwrite = false) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('domain', domain);
    formData.append('overwrite', overwrite);

    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/upload`, {
        method: "POST",
        body: formData, // No headers needed for FormData
      });
      const data = await response.json();
      setMessages(prev => [...prev, { role: 'ai', text: `✅ ${data.message}` }]);
      return data;
    } catch (error) {
      setMessages(prev => [...prev, { role: 'ai', text: "❌ Upload failed." }]);
    } finally {
      setIsLoading(false);
    }
  };

  // --- CHAT LOGIC (Stateless) ---
  const handleChatSend = async () => {
    if (!chatInput.trim()) return;

    const currentInput = chatInput;
    const userMsg = { role: 'human', text: currentInput };
    
    // 1. Prepare history for the backend [["human", "text"], ["ai", "text"]]
    // We skip the very first welcome message which isn't in the vector store
    const historyForBackend = messages
      .filter(m => m.text !== "Welcome to Teck Open Box! How can I assist you today?")
      .map(m => [m.role, m.text]);

    setMessages(prev => [...prev, userMsg]);
    setChatInput('');
    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          userMessage: currentInput,
          history: historyForBackend 
        })
      });
      const data = await response.json();
      setMessages(prev => [...prev, { role: 'ai', text: data.aiResponse }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'ai', text: "⚠️ Error connecting to server." }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!target.trim()) return;
    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: target })
      });
      const data = await response.json();
      setResults(data.results || []);
    } catch (error) {
      console.error("Search failed", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Return everything the UI needs to display or trigger
  return {
    zipcode, setZipcode,
    target, setTarget,
    showAdvanced, setShowAdvanced,
    results,
    messages,
    chatInput, setChatInput,
    isLoading,
    chatEndRef,
    handleChatSend,
    handleSearch,
    handleFileUpload
  };
}