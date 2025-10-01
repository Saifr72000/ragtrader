import "./AppLayout.css";
import ChatSidebar from "../components/ChatSidebar/ChatSidebar";
import ChatView from "./ChatView";
import RetrievedChunksSidebar from "./RetrievedChunksSidebar";
import useDragResize from "../hooks/useDragResize";
import useChat from "../hooks/useChat";

const AppLayout = () => {
  /* Draggable resizing of sidebars */
  const {
    sidebarWidth,
    isDragging,
    isLeftSidebarVisible,
    rightSidebarWidth,
    isRightDragging,
    isRightSidebarVisible,
    sidebarRef,
    rightSidebarRef,
    handleMouseDown,
    handleRightMouseDown,
    setIsLeftSidebarVisible,
    setIsRightSidebarVisible,
  } = useDragResize();

  /* Chat logic */
  const {
    error,
    chats,
    loading,
    messages,
    activeChatId,
    retrievedChunks,
    handleNewChat,
    handleChatSelect,
    handleSendMessage,
  } = useChat();

  // Show loading state while fetching chats
  if (loading) {
    return (
      <div className="app-layout">
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            height: "100vh",
          }}
        >
          <div>Loading chats...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-layout">
      {/* Top control bar */}
      <div className="top-control-bar">
        <div className="top-control-icons">
          <button
            className="control-icon-btn"
            title={
              isLeftSidebarVisible ? "Hide left sidebar" : "Show left sidebar"
            }
            onClick={() => setIsLeftSidebarVisible((v) => !v)}
          >
            {/* Left drawer icon */}
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <rect
                x="3"
                y="4"
                width="18"
                height="16"
                rx="2"
                stroke="#6c757d"
                strokeWidth="1.8"
              />
              <rect x="3" y="4" width="4" height="16" rx="2" fill="#6c757d" />
            </svg>
          </button>
          <button
            className="control-icon-btn"
            title={
              isRightSidebarVisible
                ? "Hide right sidebar"
                : "Show right sidebar"
            }
            onClick={() => setIsRightSidebarVisible((v) => !v)}
          >
            {/* Right drawer icon */}
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <rect
                x="3"
                y="4"
                width="18"
                height="16"
                rx="2"
                stroke="#6c757d"
                strokeWidth="1.8"
              />
              <rect x="17" y="4" width="4" height="16" rx="2" fill="#6c757d" />
            </svg>
          </button>
        </div>
      </div>

      {isLeftSidebarVisible && (
        <div
          ref={sidebarRef}
          className="chat-sidebar-container"
          style={{ width: `${sidebarWidth}px` }}
        >
          <ChatSidebar
            chats={chats}
            onNewChat={handleNewChat}
            onChatSelect={handleChatSelect}
            activeChatId={activeChatId}
          />
        </div>
      )}

      {/* Left resize handle */}
      {isLeftSidebarVisible && (
        <div
          className={`resize-handle ${isDragging ? "dragging" : ""}`}
          onMouseDown={handleMouseDown}
          style={{
            cursor: "col-resize",
            width: "4px",
            backgroundColor: isDragging ? "#007bff" : "#e1e5e9",
            transition: isDragging ? "none" : "background-color 0.2s ease",
          }}
        />
      )}

      <div className="chat-view-container" style={{ flex: 1 }}>
        <ChatView
          messages={messages}
          onSendMessage={handleSendMessage}
          activeChat={chats.find((chat) => chat.id === activeChatId)}
        />
      </div>

      {/* Right resize handle */}
      {isRightSidebarVisible && (
        <div
          className={`resize-handle right ${isRightDragging ? "dragging" : ""}`}
          onMouseDown={handleRightMouseDown}
          style={{
            cursor: "col-resize",
            width: "4px",
            backgroundColor: isRightDragging ? "#007bff" : "#e1e5e9",
            transition: isRightDragging ? "none" : "background-color 0.2s ease",
          }}
        />
      )}

      {/* Right sidebar */}
      {isRightSidebarVisible && (
        <div
          ref={rightSidebarRef}
          className="retrieved-chunks-sidebar-container"
          style={{ width: `${rightSidebarWidth}px` }}
        >
          <RetrievedChunksSidebar
            retrievedChunks={retrievedChunks}
            isVisible={true}
            onToggle={() => setIsRightSidebarVisible(false)}
          />
        </div>
      )}

      {/* We intentionally remove the floating toggle when hidden to rely on the top bar */}
    </div>
  );
};

export default AppLayout;
