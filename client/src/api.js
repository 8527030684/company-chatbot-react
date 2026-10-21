// All calls to the Express server live here.

// Upload a PDF → server indexes it into Pinecone
export async function uploadPdf(file) {
  const formData = new FormData();
  formData.append("document", file);

  const res = await fetch("/api/upload", { method: "POST", body: formData });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Upload failed.");
  return data; // { fileName }
}

// Ask a question → server does retrieval + Groq and returns the answer
export async function askQuestion(question, history) {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, history }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Something went wrong.");
  return data.answer;
}
