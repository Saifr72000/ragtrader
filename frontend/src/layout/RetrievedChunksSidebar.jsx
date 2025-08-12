import React from "react";
import "./RetrievedChunksSidebar.css";

const RetrievedChunksSidebar = ({ retrievedChunks, isVisible, onToggle }) => {
  if (!isVisible) {
    return (
      <div className="retrieved-chunks-toggle" onClick={onToggle}>
        <span>📄</span>
      </div>
    );
  }

  return (
    <div className="retrieved-chunks-sidebar">
      <div className="retrieved-chunks-header">
        <h3>Retrieved Context</h3>
        <button className="close-btn" onClick={onToggle}>
          ×
        </button>
      </div>

      <div className="retrieved-chunks-content">
        {retrievedChunks && retrievedChunks.length > 0 ? (
          retrievedChunks.map((chunk, index) => (
            <div key={index} className="chunk-item">
              <div className="chunk-header">
                <span className="chunk-number">Page {chunk.page}</span>
              </div>

              <div className="chunk-text">{chunk.text}</div>

              {chunk.image_url && (
                <div className="chunk-image">
                  <img
                    src={chunk.image_url}
                    alt="Retrieved context"
                    onError={(e) => {
                      e.target.style.display = "none";
                    }}
                  />
                </div>
              )}
              <p className="image-url"> {chunk.image_url}</p>

              {chunk.metadata && (
                <div className="chunk-metadata">
                  <small>
                    {chunk.metadata.source &&
                      `Source: ${chunk.metadata.source}`}
                    {chunk.metadata.page && ` | Page: ${chunk.metadata.page}`}
                  </small>
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="no-chunks">
            <p>No context retrieved for this message</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default RetrievedChunksSidebar;
