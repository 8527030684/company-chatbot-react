// All calls to the Express server live here.

// Locally this is "" (Vite proxy sends /api to localhost:8787).
// On Vercel, set VITE_API_URL = your Render server URL, e.g. https://company-chatbot-api.onrender.com
const API_URL = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

// Upload a PDF → server indexes it into Pinecone
export async function uploadPdf(file) {
  const formData = new FormData();
  formData.append("document", file);

  const res = await fetch(`${API_URL}/api/upload`, { method: "POST", body: formData });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Upload failed (HTTP ${res.status}). Is the server running?`);
  return data; // { fileName }
}

// Ask a question → server agent uses company docs and/or web search.
// threadId tells the server which chat memory (node-cache) to use.
export async function askQuestion(question, threadId, webSearch) {
  const res = await fetch(`${API_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, threadId, webSearch }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Something went wrong (HTTP ${res.status}). Is the server running?`);
  return data; // { answer, sources: { docs: boolean, web: [{ title, url }] } }
}

// New chat → tell the server to forget this chat's memory
export async function clearChat(threadId) {
  try {
    await fetch(`${API_URL}/api/chat/${encodeURIComponent(threadId)}`, { method: "DELETE" });
  } catch {
    /* not important if this fails — memory expires on its own */
  }
}
