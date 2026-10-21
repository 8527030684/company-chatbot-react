import express from "express";
import cors from "cors";
import multer from "multer";
import path from "node:path";
import fs from "node:fs";
import Groq from "groq-sdk";
import { indexTheDocument, vectorStore } from "./prepare.js";

/* ------------------------------------------------------------------ */
/* AI part — same Groq logic as chat.js                                 */
/* ------------------------------------------------------------------ */

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const SYSTEM_PROMPT = `you are an assistant for question-answering tasks. Use the
    following relevant pieces of retrieved context to answer the question.
    If you don't known the answer, say I don't know.`;

// history = previous messages from the React app: [{ role: "user" | "assistant", content }]
async function getGroqChatCompletion(useQuery, history = []) {
  return groq.chat.completions.create({
    messages: [
      {
        role: "system",
        content: SYSTEM_PROMPT,
      },
      ...history, // conversation memory (last few messages)
      {
        role: "user",
        content: useQuery,
      },
    ],
    model: "openai/gpt-oss-20b",
  });
}

async function askQuestion(question, history) {
  // retrieval
  const relevantChunks = await vectorStore.similaritySearch(question, 3);
  const context = relevantChunks.map((chunk) => chunk.pageContent).join("\n\n");

  const useQuery = `Question: ${question}
        Relevant context: ${context}
        Answer:`;

  const chatCompletion = await getGroqChatCompletion(useQuery, history);
  return chatCompletion.choices[0]?.message?.content || "";
}

/* ------------------------------------------------------------------ */
/* File upload setup (multer)                                           */
/* ------------------------------------------------------------------ */

const UPLOAD_DIR = "uploads";
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: UPLOAD_DIR,
  filename: (req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
    cb(null, `${Date.now()}-${safeName}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (req, file, cb) => {
    const isPdf =
      file.mimetype === "application/pdf" &&
      path.extname(file.originalname).toLowerCase() === ".pdf";
    cb(isPdf ? null : new Error("Only PDF files are allowed."), isPdf);
  },
});

/* ------------------------------------------------------------------ */
/* API routes (React calls these with fetch)                           */
/* ------------------------------------------------------------------ */

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// 1) Upload a PDF → index it into Pinecone
app.post("/api/upload", upload.single("document"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "Please choose a PDF file." });
  }

  try {
    await indexTheDocument(req.file.path);
    res.json({ fileName: req.file.originalname });
  } catch (err) {
    console.error("Indexing failed:", err);
    res.status(500).json({ error: "Upload worked, but indexing failed. Check the server logs." });
  }
});

// 2) Ask a question → retrieval + Groq answer
app.post("/api/chat", async (req, res) => {
  const question = (req.body.question || "").trim();
  if (!question) {
    return res.status(400).json({ error: "Question is empty." });
  }

  // Keep only the last 6 user/assistant messages as memory
  const history = (Array.isArray(req.body.history) ? req.body.history : [])
    .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .slice(-6)
    .map((m) => ({ role: m.role, content: m.content }));

  try {
    const answer = await askQuestion(question, history);
    res.json({ answer: answer || "No answer returned." });
  } catch (err) {
    console.error("Question failed:", err);
    res.status(500).json({ error: "Something went wrong while answering. Check the server logs." });
  }
});

// Upload errors (wrong file type, file too large) → JSON error
app.use((err, req, res, next) => {
  const message = err.code === "LIMIT_FILE_SIZE" ? "File is too large. Max size is 10 MB." : err.message;
  res.status(400).json({ error: message });
});

/* ------------------------------------------------------------------ */
/* Serve the built React app (after `npm run build` in /client)         */
/* ------------------------------------------------------------------ */

const CLIENT_DIST = path.resolve("client", "dist");
if (fs.existsSync(CLIENT_DIST)) {
  app.use(express.static(CLIENT_DIST));
  app.get(/^\/(?!api).*/, (req, res) => res.sendFile(path.join(CLIENT_DIST, "index.html")));
}

app.listen(PORT, () => {
  console.log(`API running at http://localhost:${PORT}`);
});
