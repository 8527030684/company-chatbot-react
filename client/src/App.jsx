import { useEffect, useState } from "react";
import { askQuestion, clearChat, uploadPdf } from "./api.js";
import Sidebar from "./components/Sidebar.jsx";
import ChatWindow from "./components/ChatWindow.jsx";
import Composer from "./components/Composer.jsx";
import DropOverlay from "./components/DropOverlay.jsx";
import Icon from "./components/Icon.jsx";

// Small helpers to keep chat + docs after a page refresh
const load = (key, fallback) => {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
};
const save = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage not available — ignore */
  }
};

const newId = () => Math.random().toString(36).slice(2, 10);

export default function App() {
  // messages: { id, role: "user" | "assistant" | "error", content }
  const [messages, setMessages] = useState(() => load("chat.messages", []));
  // docs: { id, name, status: "indexing" | "ready" | "failed", error? }
  const [docs, setDocs] = useState(() =>
    load("chat.docs", []).filter((d) => d.status !== "indexing")
  );
  // threadId = this chat's id; the server uses it as the node-cache key for memory
  const [threadId, setThreadId] = useState(() => load("chat.threadId", null) || newId());
  // 🌐 web search on/off
  const [webSearch, setWebSearch] = useState(() => load("chat.webSearch", false));
  const [isThinking, setIsThinking] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => save("chat.messages", messages), [messages]);
  useEffect(() => save("chat.docs", docs), [docs]);
  useEffect(() => save("chat.threadId", threadId), [threadId]);
  useEffect(() => save("chat.webSearch", webSearch), [webSearch]);

  /* ---------------- Upload a PDF ---------------- */
  async function handleUpload(file) {
    if (!file) return;
    const id = newId();
    setDocs((prev) => [{ id, name: file.name, status: "indexing" }, ...prev]);

    try {
      await uploadPdf(file);
      setDocs((prev) => prev.map((d) => (d.id === id ? { ...d, status: "ready" } : d)));
    } catch (err) {
      setDocs((prev) =>
        prev.map((d) => (d.id === id ? { ...d, status: "failed", error: err.message } : d))
      );
    }
  }

  /* ---------------- Ask a question ---------------- */
  async function handleSend(question) {
    // Show the question immediately
    setMessages((prev) => [...prev, { id: newId(), role: "user", content: question }]);
    setIsThinking(true);

    try {
      // Memory now lives on the server (node-cache), so we only send the threadId
      const { answer, sources } = await askQuestion(question, threadId, webSearch);
      setMessages((prev) => [...prev, { id: newId(), role: "assistant", content: answer, sources }]);
    } catch (err) {
      setMessages((prev) => [...prev, { id: newId(), role: "error", content: err.message }]);
    } finally {
      setIsThinking(false);
    }
  }

  function handleNewChat() {
    clearChat(threadId); // server forgets the old chat
    setThreadId(newId()); // fresh memory for the new chat
    setMessages([]);
    setSidebarOpen(false);
  }

  const readyCount = docs.filter((d) => d.status === "ready").length;

  return (
    <div className={`app ${sidebarOpen ? "sidebar-open" : ""}`}>
      <Sidebar
        docs={docs}
        onUpload={handleUpload}
        onNewChat={handleNewChat}
        onRemoveDoc={(id) => setDocs((prev) => prev.filter((d) => d.id !== id))}
        onClose={() => setSidebarOpen(false)}
      />
      <div className="scrim" onClick={() => setSidebarOpen(false)} />

      <main className="main">
        <header className="topbar">
          <button className="icon-btn menu-btn" onClick={() => setSidebarOpen(true)} aria-label="Open menu">
            <Icon name="menu" />
          </button>
          <div className="topbar-title">
            <span className="status-dot" />
            <span>Company Assistant</span>
            <span className="model-tag">gpt-oss-20b · Groq</span>
          </div>
          <span className="kb-count">
            <Icon name="file" size={15} /> {readyCount} {readyCount === 1 ? "doc" : "docs"}
          </span>
        </header>

        <ChatWindow messages={messages} isThinking={isThinking} hasDocs={readyCount > 0} onPick={handleSend} />

        <Composer
          disabled={isThinking}
          onSend={handleSend}
          onUpload={handleUpload}
          webSearch={webSearch}
          onToggleWeb={() => setWebSearch((v) => !v)}
        />
      </main>

      <DropOverlay onDrop={handleUpload} />
    </div>
  );
}
