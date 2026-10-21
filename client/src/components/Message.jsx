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
        {/* Where the answer came from: company docs and/or web links */}
        {message.sources?.web?.length > 0 && (
          <div className="web-sources">
            <div className="web-sources-title">Sources</div>
            <ol>
              {message.sources.web.slice(0, 5).map((s) => (
                <li key={s.url}>
                  <a href={s.url} target="_blank" rel="noopener noreferrer">
                    <Icon name="link" size={13} />
                    <span>{s.title || new URL(s.url).hostname}</span>
                  </a>
                </li>
              ))}
            </ol>
          </div>
        )}

        <div className="answer-actions">
          {message.sources?.docs && (
            <span className="source-tag">
              <Icon name="file" size={13} /> Company docs
            </span>
          )}
          {message.sources?.web?.length > 0 && (
            <span className="source-tag web">
              <Icon name="globe" size={13} /> Web search
            </span>
          )}
          <button className="chip-btn" onClick={copy}>
            <Icon name={copied ? "check" : "copy"} size={14} /> {copied ? "Copied" : "Copy"}
          </button>
        </div>
      </div>
    </div>
  );
}
