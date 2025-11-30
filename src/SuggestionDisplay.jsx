import React, { useLayoutEffect, useState } from "react";

// --- CSS STYLES (Internal) ---
const styles = {
  listContainer: {
    position: "absolute",
    backgroundColor: "#252526", // VS Code Menu Background
    border: "1px solid #454545",
    borderRadius: "0px", // VS Code uses sharp corners usually, or very slight radius
    boxShadow: "0 4px 6px rgba(0,0,0,0.5)",
    zIndex: 1000,
    minWidth: "200px",
    display: "flex",
    flexDirection: "column",
    padding: "0",
    margin: "0",
    maxHeight: "200px",
    overflowY: "auto",
  },
  item: {
    padding: "4px 8px",
    fontSize: "13px",
    fontFamily: "'Consolas', 'Monaco', 'Courier New', monospace",
    color: "#cccccc",
    cursor: "pointer",
    borderLeft: "3px solid transparent", // Marker for selection
    display: "flex",
    alignItems: "center",
  },
  activeItem: {
    backgroundColor: "#04395e", // VS Code List Hover/Active Blue
    color: "white",
    borderLeft: "3px solid #007acc", // Active indicator
  },
  icon: {
    display: "inline-block",
    width: "14px",
    height: "14px",
    backgroundColor: "#b180d7", // Mock purple box for "keyword"
    marginRight: "8px",
    borderRadius: "2px",
  }
};

// --- HELPER: Pixel Measurement ---
const getCursorCoordinates = (textarea, position) => {
  if (!textarea) return { top: 0, left: 0 };

  const div = document.createElement("div");
  const style = window.getComputedStyle(textarea);

  // Copy specific styles to mirror the textarea exactly
  [
    "boxSizing", "width", "paddingTop", "paddingRight", "paddingBottom", "paddingLeft",
    "borderTopWidth", "borderRightWidth", "borderBottomWidth", "borderLeftWidth",
    "fontFamily", "fontSize", "lineHeight", "letterSpacing", "whiteSpace", "wordWrap"
  ].forEach((prop) => {
    div.style[prop] = style[prop];
  });

  div.style.position = "absolute";
  div.style.visibility = "hidden";
  div.style.whiteSpace = "pre-wrap"; 
  div.style.overflowWrap = "break-word";
  div.style.top = "0";
  div.style.left = "0";
  
  // Mirror text content
  div.textContent = textarea.value.substring(0, position);

  // Marker
  const span = document.createElement("span");
  span.textContent = "|"; 
  div.appendChild(span);

  document.body.appendChild(div);

  const spanRect = span.getBoundingClientRect();
  const divRect = div.getBoundingClientRect();

  // Clean up
  document.body.removeChild(div);

  // Calculate relative position
  return {
    top: spanRect.top - divRect.top - textarea.scrollTop,
    left: spanRect.left - divRect.left - textarea.scrollLeft,
    // Add offsets for border/padding to position correctly over the textarea
    offsetX: parseFloat(style.paddingLeft) + parseFloat(style.borderLeftWidth),
    offsetY: parseFloat(style.paddingTop) + parseFloat(style.borderTopWidth) + 5 // +5 for line height gap
  };
};

export default function SuggestionList({
  editorRef,
  text,
  cursorPos,
  suggestions,
  selectedIndex,
  onSelect,
}) {
  const [coords, setCoords] = useState({ top: 0, left: 0 });

  useLayoutEffect(() => {
    if (editorRef.current && suggestions.length > 0) {
      const { top, left, offsetX, offsetY } = getCursorCoordinates(
        editorRef.current,
        cursorPos
      );
      setCoords({ top: top + offsetY, left: left + offsetX });
    }
  }, [text, cursorPos, suggestions.length, editorRef]);

  if (!suggestions || suggestions.length === 0) return null;

  return (
    <div
      style={{
        ...styles.listContainer,
        top: coords.top,
        left: coords.left,
      }}
    >
      {suggestions.map((sug, index) => (
        <div
          key={index}
          style={{
            ...styles.item,
            ...(index === selectedIndex ? styles.activeItem : {}),
          }}
          onClick={() => onSelect(sug)}
          onMouseDown={(e) => e.preventDefault()} // Prevent losing focus from editor
        >
          <span style={styles.icon}></span>
          {sug}
        </div>
      ))}
    </div>
  );
}