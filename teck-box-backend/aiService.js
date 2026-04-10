import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { GoogleGenerativeAIEmbeddings as BaseEmbeddings } from "@langchain/google-genai";

// 🚀 PATCH: This forces the embedding model to handle non-string inputs safely
class GoogleGenerativeAIEmbeddings extends BaseEmbeddings {
  async _embedQueryContent(text) {
    // If 'text' is an object or undefined, convert it to a string before cleaning
    const safeText = typeof text === "string" ? text : JSON.stringify(text || "");
    return super._embedQueryContent(safeText);
  }
}

import { HNSWLib } from "@langchain/community/vectorstores/hnswlib";

import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { createHistoryAwareRetriever } from "@langchain/classic/chains/history_aware_retriever";
import { createRetrievalChain } from "@langchain/classic/chains/retrieval";
import { createStuffDocumentsChain } from "@langchain/classic/chains/combine_documents";

import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

// 1. Configuration Constants
const VECTOR_STORE_PATH = "teck_box_index";
const INVENTORY_FILE = "inventory.json";

// 2. Initialize the Gemini 3 Model (Verified 2026 ID)
const model = new ChatGoogleGenerativeAI({
  model: "gemini-3-flash-preview",
  apiKey: process.env.GEMINI_API_KEY,
  temperature: 0, // Keep it factual for inventory
  maxRetries: 2,
});

// 3. Initialize Embeddings
const embeddings = new GoogleGenerativeAIEmbeddings({
  model: "models/gemini-embedding-001",
  apiKey: process.env.GEMINI_API_KEY,
  taskType: "RETRIEVAL_DOCUMENT",
});

/**
 * @param {Array} newDocs - The documents to add
 * @param {Object} options - { overwrite: boolean, domain: string }
 */
export async function initializeVectorStore(newDocs = null, options = { overwrite: false, domain: "default" }) {
  const STORAGE_PATH = `index_${options.domain}`; // Dynamic domain folder
  let vectorStore;

  // 1. If 'overwrite' is false, try to load the existing domain first
  if (!options.overwrite && fs.existsSync(STORAGE_PATH)) {
    console.log(`📂 Loading existing index for domain: ${options.domain}`);
    vectorStore = await HNSWLib.load(STORAGE_PATH, embeddings);
  }

  // 2. Process new documents if provided
  if (newDocs && newDocs.length > 0) {
    const splitter = new RecursiveCharacterTextSplitter({ chunkSize: 500, chunkOverlap: 100 });
    const splitDocs = await splitter.splitDocuments(newDocs);

    if (vectorStore && !options.overwrite) {
      console.log("➕ Appending to existing domain...");
      await vectorStore.addDocuments(splitDocs);
    } else {
      console.log(`🆕 Creating fresh index for domain: ${options.domain}`);
      vectorStore = await HNSWLib.fromDocuments(splitDocs, embeddings);
    }

    // Save to the specific domain path
    await vectorStore.save(STORAGE_PATH);
  } 

  console.log(`vectorStore is ready.`);
  return vectorStore;
}

/**
 * Creates the Advanced RAG Chain with History Awareness
 */
export async function createAdvancedRAGChain(vectorStore) {
  
  // A. Contextualizer: Rephrases follow-up questions based on history
  // Example: "Which is cheapest?" -> "Which of the M5 MacBooks is cheapest?"
    const contextualizeQPrompt = ChatPromptTemplate.fromMessages([
    ["system", "Given the chat history and a user question, rephrase the question to be a standalone search query. If the question is already clear, just repeat the original question exactly. NEVER return an empty response."],
    new MessagesPlaceholder("chat_history"),
    ["human", "{input}"],
    ]);

    const historyAwareRetriever = await createHistoryAwareRetriever({
    llm: model,
    retriever: vectorStore.asRetriever(15),
    rephrasePrompt: contextualizeQPrompt,
    });

  // B. Response Prompt: How the AI speaks to the customer
  const qaPrompt = ChatPromptTemplate.fromMessages([
    ["system", "You are the expert sales assistant for Teck Box in Dallas, Texas. Use the provided context to answer the user's question accurately. If you don't know the answer based on the inventory, say you don't know. Be helpful and professional.\n\nContext: {context}"],
    new MessagesPlaceholder("chat_history"),
    ["human", "{input}"],
  ]);

  const combineDocsChain = await createStuffDocumentsChain({
    llm: model,
    prompt: qaPrompt,
  });

  // C. The Final Chain
  return await createRetrievalChain({
    retriever: historyAwareRetriever,
    combineDocsChain,
  });
}