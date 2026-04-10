
import cors from 'cors';
import express from 'express';
import { initializeVectorStore, createAdvancedRAGChain } from './aiService.js';
import { HumanMessage, AIMessage } from "@langchain/core/messages";
import multer from 'multer';
const upload = multer({ storage: multer.memoryStorage() });

const app = express();
app.use(cors({
  origin: ["http://localhost:5173", "https://your-future-amplify-url.com"], 
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type"]
}));
app.use(express.json());

// Global variables to hold our initialized logic
let ragChain;
let vectorStore;

// Initialize the system once on startup
try {
    vectorStore = await initializeVectorStore();
    if (vectorStore) {
        ragChain = await createAdvancedRAGChain(vectorStore);
    }
} catch (e) {
    console.error("⚠️ Initial startup failed. System waiting for first upload.");
}

app.get('/', (req, res) => {
    res.send("Teck-Box Backend is online and healthy!");
});

app.post('/api/chat', async (req, res) => {
    if (!ragChain) {
        console.log("⚠️ Chat attempt but ragChain is null!");
        return res.status(503).json({ error: "AI is still indexing the files. Please wait 10 seconds." });
    }
    try {
        const { userMessage, domain, history = [] } = req.body; 

        // 1. Swap domain/chain logic if a domain is provided
        if (domain) {
            vectorStore = await initializeVectorStore(null, { domain });
            ragChain = await createAdvancedRAGChain(vectorStore);
        }

        // 2. Safety Check: If someone hits chat before the chain exists
        if (!ragChain) {
            return res.status(503).json({ error: "Brain not ready. Please upload a PDF first." });
        }

        // 3. Keep the history sent from the frontend manageable (e.g., last 6 messages)
        const trimmedHistory = history.slice(-6);

        // 4. Invoke the chain
        const result = await ragChain.invoke({
            input: userMessage,
            chat_history: trimmedHistory, 
        });

        // 5. Send back ONLY the answer
        res.json({ aiResponse: result.answer });

    } catch (error) {
        console.error("❌ Route Error:", error);
        res.status(500).json({ error: "The AI had trouble processing that request." });
    }
});

app.post('/api/search', async (req, res) => {
    if (!vectorStore) {
        return res.status(503).json({ error: "System is still initializing or no database found. Please upload a document first." });
    }
    try {
        const { query, domain } = req.body;
    
        // Swap domain for search if specified
        if (domain && domain !== currentDomain) {
            vectorStore = await initializeVectorStore(null, { domain });
        }

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

app.post('/upload', upload.single('file'), async (req, res) => {
  try {
    const { domain, overwrite } = req.body;
    const isOverwrite = overwrite === 'true'; 
    const targetDomain = domain || 'main_inventory';

    if (!req.file) return res.status(400).json({ error: "No file provided" });

    // 🚀 1. Import the new PDFParse class
    const { PDFParse } = await import('pdf-parse');
    
    // 🚀 2. Initialize the parser with your multer buffer
    const parser = new PDFParse({ data: req.file.buffer });
    
    // 🚀 3. Extract the text
    const result = await parser.getText();
    
    // 🚀 4. IMPORTANT: Destroy the parser to free up memory
    await parser.destroy();

    // Convert the extracted text to LangChain format
    const rawDocs = [{ 
      pageContent: result.text, 
      metadata: { source: req.file.originalname } 
    }];
    
    // Call the AI Service
    const vectorStore = await initializeVectorStore(rawDocs, { 
      overwrite: isOverwrite, 
      domain: targetDomain 
    });

    ragChain = await createAdvancedRAGChain(vectorStore);

    res.json({
      status: "Success",
      domain: targetDomain,
      mode: isOverwrite ? "Overwritten/New" : "Appended",
      message: "RAG Chain refreshed!"
    });

  } catch (error) {
    console.error("❌ Upload Error:", error);
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 8080; 
app.listen(PORT, async () => {
  console.log(`🚀 Backend live on port ${PORT}`);
  
  try {
    // 1. Try to load the existing vector store from disk
    const existingVectorStore = await initializeVectorStore([], { 
      domain: 'main_inventory', 
      overwrite: false 
    });

    if (existingVectorStore) {
      // 2. Build the chain so it's ready for chat immediately
      ragChain = await createAdvancedRAGChain(existingVectorStore);
      console.log("✅ RAG Chain initialized from existing index.");
    }
  } catch (error) {
    console.log("💡 No existing index found. AI will be ready after your first upload.");
  }
});
