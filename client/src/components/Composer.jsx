import { useRef, useState } from "react";
import Icon from "./Icon.jsx";

export default function Composer({ disabled, onSend, onUpload, webSearch, onToggleWeb }) {
  const [text, setText] = useState("");
  const fileInput = useRef(null);
  const textarea = useRef(null);

  function send() {
    const question = text.trim();
    if (!question || disabled) return;
    onSend(question);
    setText(""); // clear immediately, like ChatGPT
    if (textarea.current) textarea.current.style.height = "auto";
  }

  function handleKeyDown(e) {
    // Enter = send, Shift + Enter = new line
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  function handleInput(e) {
    setText(e.target.value);
    // grow the textarea with the text (max 200px)
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 200) + "px";
  }

  return (
    <footer className="composer-wrap">
      <div className="composer">
        <button className="icon-btn attach" onClick={() => fileInput.current?.click()} aria-label="Attach PDF" title="Attach PDF">
          <Icon name="clip" size={20} />
        </button>
        <input
          ref={fileInput}
          type="file"
          accept="application/pdf,.pdf"
          hidden
          onChange={(e) => {
            onUpload(e.target.files[0]);
            e.target.value = "";
          }}
        />

        <textarea
          ref={textarea}
          rows={1}
          value={text}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder={webSearch ? "Ask docs or the web…" : "Ask about your documents…"}
        />

        {/* 🌐 Web search on/off */}
        <button
          className={`web-toggle ${webSearch ? "on" : ""}`}
          onClick={onToggleWeb}
          aria-pressed={webSearch}
          title={webSearch ? "Web search is ON" : "Web search is OFF"}
        >
          <Icon name="globe" size={16} />
          <span>Web</span>
        </button>

        <button className="send" onClick={send} disabled={disabled || !text.trim()} aria-label="Send">
          <Icon name="send" size={18} strokeWidth={2.4} />
        </button>
      </div>
      <p className="hint">
        <kbd>Enter</kbd> to send · <kbd>Shift</kbd> + <kbd>Enter</kbd> for a new line
      </p>
    </footer>
  );
}
