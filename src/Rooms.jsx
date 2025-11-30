import React, { useEffect, useRef, useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import SuggestionList from "./SuggestionDisplay";
import Terminal from "./Terminal"; // Import the new terminal

// --- UPDATED STYLES ---
const styles = {
  container: {
    display: "flex",
    flexDirection: "column",
    height: "100vh",
    backgroundColor: "#1e1e1e",
    color: "#d4d4d4",
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
  },
  headerRow: {
    padding: "10px 20px",
    backgroundColor: "#333333",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottom: "1px solid #111",
    height: "50px",
    boxSizing: "border-box"
  },
  runButton: {
    backgroundColor: "#2ea043", // VS Code Green
    color: "white",
    border: "none",
    padding: "6px 12px",
    borderRadius: "3px",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: "bold",
    display: "flex",
    alignItems: "center",
    gap: "5px"
  },
  runButtonDisabled: {
    backgroundColor: "#2c3e2f",
    color: "#888",
    cursor: "not-allowed",
  },
  infoBar: {
    padding: "5px 20px",
    backgroundColor: "#007acc",
    color: "white",
    fontSize: "12px",
    display: "flex",
    gap: "15px",
    height: "25px",
    alignItems: "center"
  },
  editorContainer: {
    position: "relative",
    flex: 1,
    overflow: "hidden",
    display: "flex",
    flexDirection: "column"
  },
  editor: {
    width: "100%",
    flex: 1, // Take remaining height
    backgroundColor: "#1e1e1e",
    color: "#d4d4d4",
    border: "none",
    outline: "none",
    padding: "10px",
    fontSize: "14px",
    lineHeight: "20px",
    fontFamily: "'Consolas', 'Monaco', 'Courier New', monospace",
    resize: "none",
    boxSizing: "border-box",
    whiteSpace: "pre-wrap",
  },
  link: {
    color: "#fff",
    textDecoration: "none",
    fontSize: "14px"
  }
};

function debounce(fn, delay) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), delay);
  };
}

export default function Room() {
  const { roomId } = useParams();
  const [clientId] = useState(() => Math.floor(Date.now() / 1000));
  const [codeContent, setCodeContent] = useState("");
  const [status, setStatus] = useState("Connecting...");
  const [cursorPosition, setCursorPosition] = useState(0);

  // Suggestions State
  const [suggestions, setSuggestions] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(0);

  // EXECUTION STATE
  const [isLocked, setIsLocked] = useState(false); // Code freeze
  const [terminalOpen, setTerminalOpen] = useState(false);
  const [terminalOutput, setTerminalOutput] = useState("");

  const wsRef = useRef(null);
  const editorRef = useRef(null);

  // --- WEBSOCKET SETUP ---
  useEffect(() => {
    const ws = new WebSocket(`ws://localhost:8000/ws/${roomId}/${clientId}`);
    wsRef.current = ws;

    ws.onopen = () => setStatus("Connected");
    
    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        
        // 1. Code Update
        if (msg.type === "code_update" && msg.clientId !== String(clientId)) {
          setCodeContent(msg.message);
        } 
        // 2. Lock State (Execution Started)
        else if (msg.type === "execution_lock") {
           setIsLocked(true);
           setStatus(`Running... (Locked by ${msg.clientId})`);
        }
        // 3. Execution Result (Execution Finished)
        else if (msg.type === "execution_result") {
            setIsLocked(false);
            setTerminalOutput(msg.output);
            setTerminalOpen(true);
            setStatus("Connected");
        }

      } catch (err) {}
    };

    ws.onclose = () => setStatus("Disconnected");
    return () => ws.close();
  }, [roomId, clientId]);

  const debouncedSend = useRef(debounce((text) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) wsRef.current.send(text);
  }, 500)).current;

  // --- API: AUTOCOMPLETE ---
  const fetchSuggestions = async (code, pos) => {
    if(isLocked) return; // Don't suggest if locked
    try {
      const res = await fetch("http://localhost:8000/autocomplete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, cursorPosition: pos, language: "python" })
      });
      const json = await res.json();
      if (json.suggestions && json.suggestions.length > 0) {
        setSuggestions(json.suggestions);
        setSelectedIndex(0);
      } else {
        setSuggestions([]);
      }
    } catch (err) { console.error(err); }
  };
  const debouncedFetch = useRef(debounce(fetchSuggestions, 400)).current;

  // --- API: EXECUTE CODE ---
  const handleExecute = async () => {
    if (isLocked) return;

    // 1. Notify everyone to LOCK
    if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: "execution_lock", clientId }));
    }

    // 2. Set Local State
    setIsLocked(true);
    setTerminalOpen(true);
    setTerminalOutput(""); // Clear previous
    setStatus("Running code...");

    try {
        // 3. Call Backend API
        const res = await fetch("http://localhost:8000/execute", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ code: codeContent })
        });
        const json = await res.json();
        
        const output = json.output;

        // 4. Notify everyone with RESULT (Unlock)
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ 
                type: "execution_result", 
                output: output,
                clientId 
            }));
        }

        // Also update local immediately (redundant if WS is fast, but good for safety)
        setTerminalOutput(output);
        setIsLocked(false);
        setStatus("Connected");

    } catch (err) {
        console.error(err);
        setIsLocked(false);
        setTerminalOutput("Error connecting to server.");
    }
  };


  // --- HANDLERS ---
  const handleChange = (e) => {
    if (isLocked) return; // Prevent typing if locked

    const val = e.target.value;
    const pos = e.target.selectionStart;
    
    setCodeContent(val);
    setCursorPosition(pos);
    debouncedSend(val);

    const lastChar = val.slice(pos - 1, pos);
    if (lastChar.trim() === "") {
        setSuggestions([]); 
    } else {
        debouncedFetch(val, pos);
    }
  };

  const handleSelect = (e) => setCursorPosition(e.target.selectionStart);

  const acceptSuggestion = (suggestion) => {
    if (!suggestion || isLocked) return;
    const before = codeContent.slice(0, cursorPosition);
    const after = codeContent.slice(cursorPosition);
    const newCode = before + suggestion + after;
    setCodeContent(newCode);
    const newPos = cursorPosition + suggestion.length;
    setCursorPosition(newPos);
    setSuggestions([]);
    
    setTimeout(() => {
      if (editorRef.current) {
        editorRef.current.focus();
        editorRef.current.selectionStart = newPos;
        editorRef.current.selectionEnd = newPos;
      }
    }, 0);
  };

  const handleKeyDown = (e) => {
    if (isLocked) {
        e.preventDefault();
        return;
    }
    // Ctrl + Enter to RUN
    if (e.ctrlKey && e.key === "Enter") {
        e.preventDefault();
        handleExecute();
        return;
    }
    // Ctrl + Space to Suggest
    if (e.ctrlKey && e.key === " ") {
      e.preventDefault();
      fetchSuggestions(codeContent, cursorPosition);
      return;
    }
    // Navigation
    if (suggestions.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % suggestions.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length);
      } else if (e.key === "Tab" || e.key === "Enter") {
        e.preventDefault();
        acceptSuggestion(suggestions[selectedIndex]);
      } else if (e.key === "Escape") {
        e.preventDefault();
        setSuggestions([]);
      }
    }
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.headerRow}>
        <div style={{display:'flex', alignItems:'center', gap: '15px'}}>
            <h2 style={{ margin: 0, fontSize: "16px" }}>Room: {roomId}</h2>
            <button 
                style={isLocked ? {...styles.runButton, ...styles.runButtonDisabled} : styles.runButton}
                onClick={handleExecute}
                disabled={isLocked}
            >
                ▶ Run Code
            </button>
        </div>
        <Link to="/" style={styles.link}>Exit</Link>
      </div>

      {/* Editor Area */}
      <div style={styles.editorContainer}>
        <textarea
          ref={editorRef}
          value={codeContent}
          onChange={handleChange}
          onSelect={handleSelect}
          onKeyDown={handleKeyDown}
          placeholder={isLocked ? "Executing code..." : "// Type Python code... (Ctrl+Enter to Run)"}
          style={{
              ...styles.editor,
              color: isLocked ? "#666" : "#d4d4d4", // Dim text if locked
              cursor: isLocked ? "not-allowed" : "text"
          }}
          spellCheck={false}
          readOnly={isLocked} // Disable input
        />
        
        <SuggestionList
          editorRef={editorRef}
          text={codeContent}
          cursorPos={cursorPosition}
          suggestions={suggestions}
          selectedIndex={selectedIndex}
          onSelect={acceptSuggestion}
        />

        {/* TERMINAL AT THE BOTTOM */}
        <Terminal 
            isOpen={terminalOpen} 
            output={terminalOutput} 
            onClose={() => setTerminalOpen(false)} 
        />
      </div>

      <div style={styles.infoBar}>
        <span>STATUS: <strong>{status}</strong></span>
        <span>ID: {clientId}</span>
      </div>
    </div>
  );
}