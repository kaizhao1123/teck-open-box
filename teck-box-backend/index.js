
import cors from 'cors';
import express from 'express';
import { initializeVectorStore, createAdvancedRAGChain } from './aiService.js';
import { HumanMessage, AIMessage } from "@langchain/core/messages";

const app = express();
app.use(cors());
app.use(express.json());

// Global variables to hold our initialized logic
let ragChain;

// Initialize the system once on startup
const vectorStore = await initializeVectorStore();
ragChain = await createAdvancedRAGChain(vectorStore);

// index.js
let chatHistory = []; // Keep it as an array for now

app.post('/api/chat', async (req, res) => {
    try {
        const { userMessage } = req.body;

        // Ensure the input is exactly what the chain expects
        const result = await ragChain.invoke({
            input: userMessage,
            chat_history: chatHistory, // Use the global array
        });

        // Store history in the standard [role, content] format
        chatHistory.push(["human", userMessage]);
        chatHistory.push(["ai", result.answer]);

        // Keep history to the last 3 turns to prevent memory bloat
        if (chatHistory.length > 6) chatHistory = chatHistory.slice(-6);

        res.json({ aiResponse: result.answer });
    } catch (error) {
        console.error("❌ Route Error:", error);
        res.status(500).json({ error: "Check terminal for the 'replace' fix" });
    }
});

app.post('/api/search', async (req, res) => {
    try {
        const { query } = req.body;
        if (!query) return res.status(400).json({ error: "No query provided" });

        // Search the vector store for the top 10 matches
        const searchResults = await vectorStore.similaritySearch(query, 10);
        
        // Format the results for the frontend table
        const formattedResults = searchResults.map(doc => ({
            name: doc.pageContent.split(".")[0].replace("Product: ", ""),
            sku: doc.metadata.sku,
            // You can extract other fields using regex or by saving them in metadata earlier
            details: doc.pageContent
        }));

        res.json({ results: formattedResults });
    } catch (error) {
        console.error("❌ Search Error:", error);
        res.status(500).json({ error: "Search failed" });
    }
});

app.listen(8000, () => console.log("🚀 Teck Box Server live on port 8000"));