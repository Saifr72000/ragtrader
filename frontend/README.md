# RAGTrader Frontend - ChatGPT-like Interface

A clean, minimalist React frontend with a ChatGPT-like interface for trading discussions and market analysis.

## Features

- **ChatGPT-like Layout**: 1/4 chat history sidebar, 3/4 main chat area
- **Minimalist Design**: Clean, modern UI with subtle colors
- **Responsive**: Works on desktop and mobile devices
- **Ready for API Integration**: Built-in service layer for backend communication
- **Real-time Chat**: Message sending with simulated AI responses

## Quick Start

1. **Install dependencies**:

   ```bash
   npm install
   ```

2. **Start the development server**:

   ```bash
   npm run dev
   ```

3. **Open your browser** to `http://localhost:5173`

## Interface Overview

### Layout Structure

```
┌─────────────────────────────────────────┐
│  Chat History (25%) │  Main Chat (75%)  │
│                     │                   │
│  • Chat 1           │  Message Area     │
│  • Chat 2           │                   │
│  • Chat 3           │                   │
│                     │                   │
│  + New Chat         │  Input Area       │
└─────────────────────────────────────────┘
```

### Components

- **AppLayout**: Main container with sidebar and chat view
- **ChatSidebar**: Left panel showing chat history
- **ChatView**: Right panel with messages and input
- **apiService**: Service layer for backend integration

## API Integration

The interface is ready for backend integration. Use the `apiService` in `src/services/api.js`:

### Send a Message

```javascript
import { apiService } from "../services/api";

const handleSendMessage = async (message) => {
  try {
    const response = await apiService.sendMessage(message, chatId);
    // Handle AI response
  } catch (error) {
    // Handle error
  }
};
```

### Create New Chat

```javascript
const handleNewChat = async () => {
  try {
    const newChat = await apiService.createChat("New Trading Discussion");
    // Update chat list
  } catch (error) {
    // Handle error
  }
};
```

### Upload PDF

```javascript
const handleFileUpload = async (file) => {
  try {
    const result = await apiService.uploadPDF(file);
    // Handle processing result
  } catch (error) {
    // Handle error
  }
};
```

## Customization

### Colors

The interface uses a minimalist color palette:

- **Primary Blue**: `#007bff`
- **Background**: `#f8f9fa`
- **Text**: `#1a1a1a`
- **Borders**: `#e1e5e9`

### Styling

All styles are in the respective CSS files:

- `src/layout/AppLayout.css` - Main layout
- `src/layout/ChatSidebar.css` - Sidebar styling
- `src/layout/ChatView.css` - Chat area styling

## Backend Integration Points

To connect with your backend, you'll need these endpoints:

1. **POST /api/chat** - Send message and get AI response
2. **GET /api/chats** - Get chat history
3. **POST /api/chats** - Create new chat
4. **GET /api/chats/:id/messages** - Get messages for a chat
5. **POST /api/ingest** - Upload and process PDF

## Development

### File Structure

```
src/
├── layout/
│   ├── AppLayout.jsx      # Main layout component
│   ├── AppLayout.css      # Layout styles
│   ├── ChatSidebar.jsx    # Chat history sidebar
│   ├── ChatSidebar.css    # Sidebar styles
│   ├── ChatView.jsx       # Main chat area
│   └── ChatView.css       # Chat area styles
├── services/
│   └── api.js            # API service layer
├── App.jsx               # Main app component
└── App.css               # App-level styles
```

### Adding Features

1. **New Chat Types**: Modify the chat data structure in `AppLayout.jsx`
2. **Custom Styling**: Update the CSS files with your preferred colors
3. **Additional API Calls**: Add methods to `apiService`
4. **Real-time Features**: Integrate WebSocket or polling for live updates

## Responsive Design

The interface automatically adapts to different screen sizes:

- **Desktop**: Side-by-side layout (25% + 75%)
- **Mobile**: Stacked layout (sidebar on top, chat below)

## Next Steps

1. **Connect to Backend**: Update `API_BASE_URL` in `api.js`
2. **Add Authentication**: Implement login/logout functionality
3. **Real-time Updates**: Add WebSocket connection for live chat
4. **File Upload**: Add PDF upload interface
5. **Error Handling**: Implement proper error states and loading indicators
