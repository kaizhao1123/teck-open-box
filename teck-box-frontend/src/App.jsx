import React, { useState } from 'react';
import { useAppLogic } from './useAppLogic';
import './App.css';

function App() {
  // Import all the "brains" from our custom hook
  const {
    zipcode, setZipcode, target, setTarget,
    showAdvanced, setShowAdvanced, results,
    messages, chatInput, setChatInput,
    isLoading, chatEndRef, handleChatSend, handleSearch,
    handleFileUpload
  } = useAppLogic();

  // Local state just for the file input
  const [selectedFile, setSelectedFile] = useState(null);

  const onFileChange = (e) => {
    setSelectedFile(e.target.files[0]);
  };

  const onUploadClick = async () => {
    if (!selectedFile) return alert("Please select a PDF first!");
    await handleFileUpload(selectedFile);
    setSelectedFile(null); // Clear after upload
  };

  return (
    <div className="app-layout">

      {/* LEFT SIDE: Main Search & Results */}
      <div className="main-content">
        <header>
          <h1>Teck Open Box</h1>
        </header>

        {/* --- NEW: PDF Upload Section --- */}
        <div className="upload-section">
          <label className="upload-label">Update AI Knowledge Base:</label>
          <div className="upload-controls">
            <input 
              type="file" 
              accept=".pdf" 
              onChange={onFileChange} 
              className="file-input"
            />
            <button 
              className="btn-upload" 
              onClick={onUploadClick}
              disabled={isLoading || !selectedFile}
            >
              {isLoading ? "Uploading..." : "Upload PDF"}
            </button>
          </div>
        </div>

        <div className="search-controls">
          <div className="input-group">
            <label>your address / zipcode</label>
            <input
              value={zipcode}
              onChange={e => setZipcode(e.target.value)}
              placeholder="e.g. 75201"
            />
          </div>

          <div className="input-group">
            <label>your target</label>
            <input
              value={target}
              onChange={e => setTarget(e.target.value)}
              placeholder="e.g. MacBook Neo"
            />
          </div>

          <div className="action-buttons">
            <button className="btn-secondary" onClick={() => setShowAdvanced(true)}>advanced:</button>
            <button className="btn-primary" onClick={handleSearch}>Search</button>
          </div>
        </div>

        <div className="results-area">
          <h2>Results ({results.length} items found)</h2>

          {results.length > 0 ? (
            <table className="results-table">
              <thead>
                <tr>
                  <th>SKU</th>
                  <th>Product Name</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {results.map((item, index) => (
                  <tr key={index}>
                    <td>{item.sku}</td>
                    <td><strong>{item.name}</strong></td>
                    <td>{item.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="placeholder-text">Enter a target and click Search to see inventory...</div>
          )}
        </div>
      </div>

      {/* RIGHT SIDE: Chat Area */}
      <div className="chat-sidebar">
        <div className="chat-messages">
          {messages.map((msg, i) => (
            <div key={i} className={`message-bubble ${msg.role}`}>
              {msg.text}
            </div>
          ))}
          {isLoading && <div className="message-bubble ai loading">Thinking...</div>}
          <div ref={chatEndRef} />
        </div>
        <div className="chat-input-area">
          <input
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleChatSend()}
            placeholder="Ask AI..."
          />
          <button onClick={handleChatSend} disabled={isLoading}>Send</button>
        </div>
      </div>

      {/* MODAL: Advanced Popup Window */}
      {showAdvanced && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Advanced Filters</h3>

            <div className="filter-grid">
              <label>category <select><option>All</option></select></label>
              <label>color <select><option>All</option></select></label>
              <label>brand <select><option>All</option></select></label>
              <label>price range <select><option>Any</option></select></label>
              <label>status <select><option>Any</option></select></label>
              <label>distance range <select><option>Within 10 miles</option></select></label>
            </div>

            <div className="modal-actions">
              <button className="btn-secondary">clear</button>
              <button className="btn-secondary" onClick={() => setShowAdvanced(false)}>cancel</button>
              <button className="btn-primary" onClick={() => setShowAdvanced(false)}>ok</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default App;