import { useRef } from "react";
import Icon from "./Icon.jsx";

const STATUS_LABEL = {
  indexing: "Indexing…",
  ready: "Ready",
  failed: "Failed",
};

export default function Sidebar({ docs, onUpload, onNewChat, onRemoveDoc, onClose }) {
  const fileInput = useRef(null);

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">
          <Icon name="sparkle" size={18} />
        </div>
        <div>
          <div className="brand-name">CG Assistant</div>
          <div className="brand-sub">Internal docs chatbot</div>
        </div>
        <button className="icon-btn close-btn" onClick={onClose} aria-label="Close menu">
          <Icon name="x" />
        </button>
      </div>

      <button className="new-chat" onClick={onNewChat}>
        <Icon name="plus" /> New chat
      </button>

      <div className="section-head">
        <span>Knowledge base</span>
        <button className="link-btn" onClick={() => fileInput.current?.click()}>
          <Icon name="upload" size={14} /> Add PDF
        </button>
      </div>

      <input
        ref={fileInput}
        type="file"
        accept="application/pdf,.pdf"
        hidden
        onChange={(e) => {
          onUpload(e.target.files[0]);
          e.target.value = ""; // allow picking the same file again
        }}
      />

      <ul className="doc-list">
        {docs.length === 0 && (
          <li className="doc-empty">
            <Icon name="file" size={22} strokeWidth={1.6} />
            <p>No documents yet. Upload a PDF to start asking questions.</p>
          </li>
        )}

        {docs.map((doc) => (
          <li key={doc.id} className={`doc-item ${doc.status}`} title={doc.error || doc.name}>
            <span className="doc-icon">
              {doc.status === "indexing" ? <span className="spinner" /> : <Icon name={doc.status === "failed" ? "alert" : "file"} size={16} />}
            </span>
            <span className="doc-text">
              <span className="doc-name">{doc.name}</span>
              <span className="doc-status">{doc.status === "failed" ? doc.error : STATUS_LABEL[doc.status]}</span>
            </span>
            {doc.status !== "indexing" && (
              <button className="icon-btn doc-remove" onClick={() => onRemoveDoc(doc.id)} aria-label="Remove from list">
                <Icon name="x" size={14} />
              </button>
            )}
          </li>
        ))}
      </ul>

      <div className="sidebar-foot">Answers come from your PDFs, plus the web when 🌐 Web is on.</div>
    </aside>
  );
}
