# 🚀 RagTrader

**AI-Powered Cryptocurrency Trading Platform with RAG (Retrieval-Augmented Generation)**

RagTrader is an intelligent cryptocurrency trading platform that combines real-time market data, AI-powered insights, and automated trading capabilities. Using a sophisticated RAG engine, the platform provides context-aware trading advice by leveraging your custom knowledge base, real-time market data, and advanced AI models.

---

## 📋 Table of Contents

- [Features](#-features)
- [Architecture](#-architecture)
- [Tech Stack](#-tech-stack)
- [Prerequisites](#-prerequisites)
- [Installation & Setup](#-installation--setup)
- [Running the Project](#-running-the-project)
- [Project Structure](#-project-structure)
- [RAG Engine](#-rag-engine-explained)
- [API Endpoints](#-api-endpoints)
- [Environment Variables](#-environment-variables)
- [Contributing](#-contributing)

---

## ✨ Features

### 🤖 AI-Powered Chat System

- **Context-Aware Responses**: RAG engine retrieves relevant information from your knowledge base before generating responses
- **Multimodal Support**: Send text and images in chat queries
- **Chat History Management**: Persistent conversation history with MongoDB
- **Retrieved Chunks Display**: View the source documents/chunks used to generate each response

### 📊 Real-Time Market Data

- **Coinbase WebSocket Integration**: Live cryptocurrency price updates
- **5-Minute Candle Streaming**: Automated OHLCV (Open, High, Low, Close, Volume) data streaming
- **Polygon.io Historical Data**: Fetch historical price bars for analysis
- **Customizable Timeframes**: Filter data by date ranges and timeframes

### 💹 Trading Features

- **Auto-Trading Signals**: AI-powered trading signal detection from RAG responses
- **Coinbase CDP Integration**: Direct trading execution on Coinbase
- **Signal Management**: Track and manage trading signals with status monitoring
- **Price Monitoring**: Real-time price tracking with customizable alerts

### 📚 Knowledge Base Management

- **Document Ingestion**: Upload PDFs and automatically process them into embeddings
- **Vector Search**: Semantic search powered by Pinecone vector database
- **Image Extraction**: Extract and store images from PDFs with Google Cloud Storage
- **Multimodal Embeddings**: Text and image embeddings using Voyage AI

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (React + Vite)                  │
│  - Chat Interface                                           │
│  - Real-time WebSocket Dashboard                            │
│  - Polygon Data Viewer                                      │
│  - Custom Hooks (useChat, useCoinbase, usePolygonBars)     │
└────────────────────┬────────────────────────────────────────┘
                     │ REST API + WebSocket/SSE
┌────────────────────▼────────────────────────────────────────┐
│                Backend (Node.js + Express)                  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Controllers                                         │  │
│  │  - Chat, Message (RAG Pipeline)                     │  │
│  │  - Coinbase (WebSocket → SSE Bridge)                │  │
│  │  - Polygon (Historical Data)                        │  │
│  │  - Auto-Trading (Signal Detection & Execution)      │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Services                                            │  │
│  │  - Coinbase Service (WebSocket Client)              │  │
│  │  - Candle Buffer (5-min aggregation)                │  │
│  │  - Trading Engine (Order Management)                │  │
│  │  - Signal Manager (Trading Logic)                   │  │
│  └──────────────────────────────────────────────────────┘  │
└────────────────────┬────────────────────────────────────────┘
                     │
        ┌────────────┼────────────┐
        ▼            ▼            ▼
┌───────────┐  ┌──────────┐  ┌─────────────┐
│  MongoDB  │  │ Pinecone │  │  External   │
│  (Chats & │  │  Vector  │  │   APIs      │
│ Messages) │  │    DB    │  │             │
└───────────┘  └──────────┘  │ - OpenAI    │
                              │ - Voyage AI │
                              │ - Coinbase  │
                              │ - Polygon   │
                              └─────────────┘
```

---

## 🛠️ Tech Stack

### Frontend

- **React 19** - UI framework
- **Vite** - Build tool and dev server
- **React Router** - Client-side routing
- **React Dropzone** - File upload handling
- **Custom Hooks** - Modular state management (`useChat`, `useCoinbase`, `usePolygonBars`, `useDragResize`)

### Backend

- **Node.js + Express** - Server framework
- **MongoDB + Mongoose** - Database and ODM
- **WebSocket (ws)** - Real-time communication
- **Helmet** - Security middleware
- **Express Rate Limit** - API rate limiting
- **Multer** - File upload handling

### AI & Embeddings

- **OpenAI GPT-5** - Large Language Model for chat completions
- **Voyage AI** - Multimodal embeddings (text + image)
- **Pinecone** - Vector database for semantic search

### Market Data & Trading

- **Coinbase CDP SDK** - Trading execution on Coinbase
- **Coinbase WebSocket API** - Real-time price feeds
- **Polygon.io API** - Historical cryptocurrency data

### Storage & Processing

- **Google Cloud Storage** - Image storage from PDFs
- **pdf-parse** - PDF text extraction
- **pdf2pic** - PDF to image conversion

---

## 📦 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18 or higher) - [Download here](https://nodejs.org/)
- **npm** or **yarn** - Comes with Node.js
- **MongoDB** - Local installation or [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) account
- **Python 3.8+** (for PDF preprocessing) - [Download here](https://www.python.org/)

You'll also need API keys for:

- **OpenAI** - [Get API key](https://platform.openai.com/api-keys)
- **Voyage AI** - [Get API key](https://www.voyageai.com/)
- **Pinecone** - [Get API key](https://www.pinecone.io/)
- **Polygon.io** - [Get API key](https://polygon.io/)
- **Coinbase** - [CDP API key](https://portal.cdp.coinbase.com/)

---

## 🚀 Installation & Setup

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd ragtrader
```

### 2. Backend Setup

```bash
cd backend
npm install
```

Create a `.env` file in the `backend` directory:

```env
# Database
MONGO_DB_URL=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/ragtrader?retryWrites=true&w=majority

# AI Services
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxx
VOYAGE_API_KEY=pa-xxxxxxxxxxxxxxxxxxxxx

# Vector Database
PINECONE_API_KEY=pcsk_xxxxxxxxxxxxxxxxxxxxx
PINECONE_URL=https://your-index.pinecone.io

# Market Data & Trading
POLYGON_API_KEY=xxxxxxxxxxxxxxxxxxxxx
COINBASE_API_KEY=organizations/xxx/apiKeys/xxx
COINBASE_PRIVATE_KEY=-----BEGIN EC PRIVATE KEY-----\nYourPrivateKeyHere\n-----END EC PRIVATE KEY-----\n
```

### 3. Frontend Setup

```bash
cd ../frontend
npm install
```

Create a `.env` file in the `frontend` directory:

```env
VITE_LOCAL_BACKEND_URL=http://localhost:3000/api
VITE_PUBLIC_BACKEND_URL=https://your-production-backend.com/api
```

### 4. PDF Preprocessor Setup (Optional)

If you want to ingest PDFs with image extraction:

```bash
cd ../pdf-preprocessor
pip install -r requirements.txt
```

Create a `.env` file in the `pdf-preprocessor` directory with your Google Cloud Storage credentials.

---

## ▶️ Running the Project

### Development Mode

**Terminal 1 - Backend:**

```bash
cd backend
npm run dev
```

The backend will start on `http://localhost:3000`

**Terminal 2 - Frontend:**

```bash
cd frontend
npm run dev
```

The frontend will start on `http://localhost:5173`

**Terminal 3 - PDF Preprocessor (Optional):**

```bash
cd pdf-preprocessor
python app.py
```

The preprocessor will start on `http://localhost:5001`

### Production Mode

**Backend:**

```bash
cd backend
npm start
```

**Frontend:**

```bash
cd frontend
npm run build
npm run preview
```

---

## 📁 Project Structure

```
ragtrader/
├── backend/
│   ├── src/
│   │   ├── app.js                          # Express app entry point
│   │   ├── controllers/                    # Request handlers
│   │   │   ├── chat.controller.js          # Chat management
│   │   │   ├── message.controller.js       # RAG pipeline
│   │   │   ├── coinbase.controller.js      # WebSocket → SSE bridge
│   │   │   ├── polygon.controller.js       # Historical data
│   │   │   ├── autoTrading.controller.js   # Trading signals
│   │   │   └── openai.controller.js        # LLM calls
│   │   ├── models/                         # MongoDB schemas
│   │   │   ├── chat.js
│   │   │   └── message.js
│   │   ├── routes/                         # API routes
│   │   ├── services/                       # Business logic
│   │   │   ├── coinbase.service.js         # WebSocket client
│   │   │   ├── candleBuffer.service.js     # Data aggregation
│   │   │   ├── tradingEngine.service.js    # Order execution
│   │   │   └── signalManager.service.js    # Signal detection
│   │   ├── embeddings/                     # Voyage AI integration
│   │   │   ├── voyage.js
│   │   │   └── embeddingScript.js
│   │   ├── vectorstore/                    # Pinecone integration
│   │   │   ├── pinecone.js
│   │   │   └── searchSimilar.js
│   │   └── utils/                          # Helper functions
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── main.jsx                        # React entry point
│   │   ├── App.jsx                         # Root component
│   │   ├── components/                     # Reusable components
│   │   │   ├── ChatInputBar/
│   │   │   ├── ChatMessages/
│   │   │   ├── ChatSidebar/
│   │   │   ├── PolygonModal/
│   │   │   └── WebSocket/
│   │   │       └── WebSocketDashboard.jsx  # Real-time data display
│   │   ├── hooks/                          # Custom React hooks
│   │   │   ├── coinbase/
│   │   │   │   └── useCoinbase.js          # Coinbase WebSocket logic
│   │   │   ├── useChat.js                  # Chat state management
│   │   │   ├── useDragResize.js            # Sidebar resizing
│   │   │   ├── useDropzone.js              # File upload
│   │   │   └── usePolygonBars.js           # Polygon data fetching
│   │   ├── layout/                         # Layout components
│   │   │   ├── AppLayout.jsx
│   │   │   ├── ChatView.jsx
│   │   │   └── RetrievedChunksSidebar.jsx
│   │   └── services/
│   │       └── api.js                      # API client
│   └── package.json
│
├── pdf-preprocessor/
│   ├── app.py                              # Flask app for PDF processing
│   ├── utils/
│   │   ├── pdf_processor.py                # PDF text/image extraction
│   │   └── gcs_uploader.py                 # Google Cloud Storage upload
│   └── requirements.txt
│
└── README.md
```

---

## 🧠 RAG Engine Explained

The **Retrieval-Augmented Generation (RAG)** engine is the core of RagTrader's intelligence. Here's how it works:

### 1. Document Ingestion Pipeline

```
PDF Upload → Text Extraction → Image Extraction → Chunking → Embedding → Pinecone Storage
```

**Process:**

1. User uploads a PDF document
2. Backend extracts text and images from each page
3. Text is chunked into semantic segments (~500 tokens)
4. **Voyage AI** creates embeddings for each chunk (1536-dimensional vectors)
5. Embeddings are stored in **Pinecone** with metadata (text, page number, image URLs)

**Key File:** `backend/src/routes/ingest.js`

### 2. Query Processing Pipeline

```
User Query → Voyage Embedding → Pinecone Search → Context Retrieval → OpenAI GPT-5 → Response
```

**Process:**

1. User sends a message in the chat
2. Message text (and optional image) is embedded using **Voyage AI**
3. Pinecone performs semantic search to find top 5 most relevant chunks
4. Retrieved chunks are formatted into context
5. **OpenAI GPT-5** generates response using:
   - System prompt (trading expert persona)
   - Retrieved context (RAG chunks)
   - Full chat history
   - Current user query
6. Response is saved to MongoDB and returned to user

**Key File:** `backend/src/controllers/message.controller.js`

### 3. Components Breakdown

#### **Voyage AI (Embeddings)**

- **Model:** `voyage-multimodal-3`
- **Dimension:** 1536
- **Input:** Text + optional image URLs
- **Output:** Dense vector representation
- **Use Cases:**
  - Embedding user queries
  - Embedding knowledge base chunks
  - Multimodal search (text + image)

**Key File:** `backend/src/embeddings/voyage.js`

#### **Pinecone (Vector Database)**

- **Index Name:** `rag-data`
- **Dimension:** 1536 (matches Voyage embeddings)
- **Metric:** Cosine similarity
- **Operations:**
  - `upsert`: Store new embeddings
  - `query`: Semantic search with topK=5
  - Metadata filtering (coming soon)

**Key Files:**

- `backend/src/vectorstore/pinecone.js` - Connection setup
- `backend/src/vectorstore/searchSimilar.js` - Search queries

#### **OpenAI GPT-5 (LLM)**

- **Model:** `gpt-5`
- **Role:** Generate human-like responses
- **Input:**
  - System prompt (defines AI persona as crypto trading expert)
  - Retrieved context from Pinecone
  - Full conversation history
  - Current user message
- **Output:** Contextually-aware trading advice

**Key File:** `backend/src/controllers/openai.controller.js`

### 4. RAG Flow Diagram

```
┌──────────────┐
│ User Message │
└──────┬───────┘
       │
       ▼
┌──────────────────┐
│  Voyage AI       │  "What's a good entry point for BTC?"
│  (Embedding)     │  → [0.234, -0.891, 0.445, ..., 0.123]
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│  Pinecone        │  Find 5 most similar chunks:
│  (Search)        │  1. "Support levels indicate..." (score: 0.89)
└──────┬───────────┘  2. "Technical analysis of BTC..." (score: 0.85)
       │              3. "Entry strategies include..." (score: 0.82)
       │              ...
       ▼
┌──────────────────┐
│  Context Builder │  System: "You are a crypto trading expert..."
│                  │  Context: [Retrieved chunks]
└──────┬───────────┘  History: [Previous messages]
       │              User: "What's a good entry point for BTC?"
       ▼
┌──────────────────┐
│  OpenAI GPT-5    │  "Based on the technical analysis in your
│  (Generation)    │   knowledge base, BTC shows support at..."
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│  Save to DB      │  MongoDB: Store message + metadata
│  & Return        │  Frontend: Display response + retrieved chunks
└──────────────────┘
```

---

## 🔌 API Endpoints

### Chat Management

- `POST /api/chat` - Create new chat
- `GET /api/chat` - Get all chats
- `GET /api/chat/:id/messages` - Get messages for a chat

### Messages (RAG Pipeline)

- `POST /api/message` - Send message and get AI response
  - Supports multipart/form-data for image uploads
  - Returns: `{ reply, retrievedChunks }`

### Coinbase WebSocket

- `POST /api/coinbase/ws/connect` - Connect to Coinbase WebSocket
- `POST /api/coinbase/ws/subscribe` - Subscribe to ticker
- `POST /api/coinbase/ws/unsubscribe` - Unsubscribe from ticker
- `POST /api/coinbase/ws/subscribe-candles` - Subscribe to candle data
- `GET /api/coinbase/ws/stream` - Server-Sent Events (SSE) stream
- `GET /api/coinbase/ws/candles` - Get candle buffer data

### Polygon Historical Data

- `POST /api/polygon/bars` - Fetch historical OHLCV bars
  - Params: `ticker`, `fromDate`, `toDate`, `timespan`, `multiplier`

### Auto-Trading

- `GET /api/auto-trading/status` - Get auto-trading status
- `POST /api/auto-trading/enable` - Enable auto-trading
- `POST /api/auto-trading/disable` - Disable auto-trading
- `POST /api/auto-trading/process-rag` - Manually process RAG response for signals
- `GET /api/auto-trading/signals` - Get signal status

### Document Ingestion

- `POST /api/embed-pdf` - Upload and embed PDF document
  - Multipart/form-data: `pdf` file
  - Extracts text, images, creates embeddings, stores in Pinecone

---

## 🔐 Environment Variables

### Backend (`backend/.env`)

| Variable               | Description                       | Required |
| ---------------------- | --------------------------------- | -------- |
| `MONGO_DB_URL`         | MongoDB connection string         | ✅       |
| `OPENAI_API_KEY`       | OpenAI API key for GPT-5          | ✅       |
| `VOYAGE_API_KEY`       | Voyage AI API key for embeddings  | ✅       |
| `PINECONE_API_KEY`     | Pinecone API key                  | ✅       |
| `PINECONE_URL`         | Pinecone index URL                | ✅       |
| `POLYGON_API_KEY`      | Polygon.io API key                | ✅       |
| `COINBASE_API_KEY`     | Coinbase CDP API key              | ✅       |
| `COINBASE_PRIVATE_KEY` | Coinbase private key (multi-line) | ✅       |

### Frontend (`frontend/.env`)

| Variable                  | Description                       | Required |
| ------------------------- | --------------------------------- | -------- |
| `VITE_LOCAL_BACKEND_URL`  | Backend URL for local development | ✅       |
| `VITE_PUBLIC_BACKEND_URL` | Backend URL for production        | ✅       |

---

## 🎯 Key Features Explained

### 1. Real-Time Coinbase Data Streaming

**Architecture:** WebSocket → Backend Buffer → Server-Sent Events → Frontend

- Backend maintains a **single WebSocket connection** to Coinbase
- Multiple frontend clients can subscribe via **SSE (Server-Sent Events)**
- **5-minute candle aggregation** in `candleBuffer.service.js`
- Automatic candle completion sends data to active chat

### 2. Trading Signal Detection

- AI agent analyzes RAG responses for trading signals
- Extracts: entry price, stop loss, take profit, position size
- Validates signals using current market data
- Executes orders via Coinbase CDP SDK

### 3. Multimodal Chat

- Users can upload images with queries
- Images are embedded alongside text using Voyage AI
- OpenAI GPT-5 Vision processes images in responses
- Images stored in Google Cloud Storage

### 4. Historical Data Analysis

- Fetch OHLCV data from Polygon.io
- Filter by time window or last N bars
- Attach formatted data to chat messages
- RAG engine uses data for context-aware analysis

---

## 🧪 Testing

### Backend Tests

```bash
cd backend
npm test
```

### Frontend Tests

```bash
cd frontend
npm run lint
```

### Check Image URLs in Database

```bash
cd backend
npm run check-urls        # Full check
npm run check-urls-quick  # Quick check
```

---

## 🚀 Deployment

### Backend (Render/Railway/Heroku)

1. Set environment variables in hosting platform
2. Ensure MongoDB Atlas is accessible
3. Deploy from `main` branch
4. Set start command: `npm start`

### Frontend (Vercel/Netlify)

1. Set `VITE_PUBLIC_BACKEND_URL` environment variable
2. Build command: `npm run build`
3. Output directory: `dist`

---

## 🤝 Contributing

Contributions are welcome! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

---

## 📝 License

This project is private and proprietary.

---

## 🙏 Acknowledgments

- **OpenAI** - GPT-5 language model
- **Voyage AI** - Multimodal embeddings
- **Pinecone** - Vector database
- **Coinbase** - Real-time market data and trading infrastructure
- **Polygon.io** - Historical cryptocurrency data

---

## 📞 Support

For questions or issues, please open an issue on GitHub or contact the maintainers.

---

**Built with ❤️ by the RagTrader Team**
