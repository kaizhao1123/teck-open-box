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

  // Auto-scroll logic
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Network logic
  const handleChatSend = async () => {
    if (!chatInput.trim()) return;

    const userMsg = { role: 'human', text: chatInput };
    setMessages(prev => [...prev, userMsg]);
    setChatInput('');
    setIsLoading(true);

    try {
      const response = await fetch("http://localhost:8000/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userMessage: chatInput })
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
      const response = await fetch("http://localhost:8000/api/search", {
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
    handleSearch
  };
}