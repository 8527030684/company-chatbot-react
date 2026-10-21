import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Icon from "./Icon.jsx";

export default function Message({ message }) {
  const [copied, setCopied] = useState(false);

  if (message.role === "user") {
    return (
      <div className="msg user">
        <div className="bubble">{message.content}</div>
      </div>
    );
  }

  if (message.role === "error") {
    return (
      <div className="msg error">
        <Icon name="alert" size={16} /> {message.content}
      </div>
    );
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked — ignore */
    }
  }

  // assistant
  return (
    <div className="msg assistant">
      <div className="avatar">
        <Icon name="sparkle" size={16} />
      </div>
      <div className="answer">
        {/* react-markdown renders bold, lists and tables; raw HTML is not rendered (safe) */}
        <div className="markdown">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              // wrap tables so wide ones scroll sideways instead of breaking the layout
              table: (props) => (
                <div className="table-wrap">
                  <table {...props} />
                </div>
              ),
            }}
          >
            {message.content}
          </ReactMarkdown>
        </div>
        <div className="answer-actions">
          <button className="chip-btn" onClick={copy}>
            <Icon name={copied ? "check" : "copy"} size={14} /> {copied ? "Copied" : "Copy"}
          </button>
        </div>
      </div>
    </div>
  );
}
