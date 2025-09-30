import { useState, useEffect, useRef } from "react";

const useDragResize = () => {
  // Draggable sidebar state
  const [sidebarWidth, setSidebarWidth] = useState(300); // Default width in pixels
  const [isDragging, setIsDragging] = useState(false);
  const sidebarRef = useRef(null);

  // Left sidebar visibility
  const [isLeftSidebarVisible, setIsLeftSidebarVisible] = useState(true);

  // Right sidebar state
  const [rightSidebarWidth, setRightSidebarWidth] = useState(350); // Default width in pixels
  const [isRightDragging, setIsRightDragging] = useState(false);
  const rightSidebarRef = useRef(null);
  const [isRightSidebarVisible, setIsRightSidebarVisible] = useState(false);

  const handleMouseDown = (e) => {
    setIsDragging(true);
    e.preventDefault();
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;

    const newWidth = e.clientX;
    const minWidth = 200; // Minimum sidebar width
    const maxWidth = window.innerWidth * 0.3; // Maximum 60% of screen width

    if (newWidth >= minWidth && newWidth <= maxWidth) {
      setSidebarWidth(newWidth);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleRightMouseDown = (e) => {
    setIsRightDragging(true);
    e.preventDefault();
  };

  const handleRightMouseMove = (e) => {
    if (!isRightDragging) return;

    const newWidth = window.innerWidth - e.clientX;
    const minWidth = 250; // Minimum sidebar width
    const maxWidth = window.innerWidth * 0.4; // Maximum 40% of screen width

    if (newWidth >= minWidth && newWidth <= maxWidth) {
      setRightSidebarWidth(newWidth);
    }
  };

  const handleRightMouseUp = () => {
    setIsRightDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);

      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isDragging]);

  // Add global mouse event listeners for right sidebar
  useEffect(() => {
    if (isRightDragging) {
      document.addEventListener("mousemove", handleRightMouseMove);
      document.addEventListener("mouseup", handleRightMouseUp);

      return () => {
        document.removeEventListener("mousemove", handleRightMouseMove);
        document.removeEventListener("mouseup", handleRightMouseUp);
      };
    }
  }, [isRightDragging]);

  return {
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
  };
};

export default useDragResize;
