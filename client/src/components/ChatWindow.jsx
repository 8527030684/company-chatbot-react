import { useEffect, useRef } from "react";
import Message from "./Message.jsx";
import Icon from "./Icon.jsx";

const SUGGESTIONS = [
  "How many leaves can I take in a year?",
  "What is the work from home policy?",
  "How do I apply for leave?",
  "What are the office timings?",
];

export default function ChatWindow({ messages, isThinking, hasDocs, onPick }) {
  const bottomRef = useRef(null);

  // Auto-scroll to the newest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, isThinking]);

  if (messages.length === 0) {
    return (
      <section className="chat">
        <div className="welcome">
          <div className="welcome-mark">
            <Icon name="sparkle" size={28} />
          </div>
          <h1>
            Ask anything about your <span className="grad">company docs</span>
          </h1>
          <p>
            {hasDocs
              ? "Your documents are indexed. Try one of these or type your own question."
              : "Upload a PDF using the 📎 button or drop it anywhere on the page, then ask away."}
          </p>
          <div className="suggestions">
            {SUGGESTIONS.map((s) => (
              <button key={s} className="suggestion" onClick={() => onPick(s)} disabled={isThinking}>
                {s}
              </button>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="chat">
      <div className="messages">
        {messages.map((m) => (
          <Message key={m.id} message={m} />
        ))}

        {isThinking && (
          <div className="msg assistant">
            <div className="avatar">
              <Icon name="sparkle" size={16} />
            </div>
            <div className="typing" aria-label="Assistant is typing">
              <span />
              <span />
              <span />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
    </section>
  );
}
