# Company Chatbot (RAG) — React + Express

```
company-chatbot/
├── prepare.js      ← PDF load → chunk → OpenAI embeddings → Pinecone   (unchanged)
├── server.js       ← Express API: /api/upload and /api/chat (same Groq logic as chat.js)
├── chat.js         ← old terminal chat (still works)
├── rag.js          ← old script to index cg-internal-docs.pdf (still works)
├── .env            ← your keys (not included in the zip)
└── client/         ← React app (Vite)
    └── src/
        ├── App.jsx            ← state: messages, docs, upload + send logic
        ├── api.js             ← fetch calls to the server
        ├── index.css          ← all styling (light + dark mode)
        └── components/
            ├── Sidebar.jsx    ← brand, New chat, uploaded PDFs list
            ├── ChatWindow.jsx ← welcome screen, messages, typing dots
            ├── Message.jsx    ← user bubble / AI answer (Markdown) / error
            ├── Composer.jsx   ← textarea, 📎 attach, send
            ├── DropOverlay.jsx← drag & drop a PDF anywhere
            └── Icon.jsx       ← small SVG icons
```

## .env (project root)

```
GROQ_API_KEY=...
OPENAI_API_KEY=...
PINECONE_API_KEY=...
PINECONE_INDEX_NAME=...
```

## First time setup

```bash
npm install                 # server packages (adds multer)
npm install --prefix client # React packages
```

## Run in development (2 terminals)

```bash
# Terminal 1 — API server on http://localhost:3000
npm run server

# Terminal 2 — React app on http://localhost:5173
npm run client
```

Open **http://localhost:5173**. Vite forwards every `/api/...` call to the Express server.

## Run as one app (production style)

```bash
npm run build    # builds React into client/dist
npm run server   # serves the React app + API on http://localhost:3000
```

## API

| Method | URL           | Body                                   | Returns            |
|--------|---------------|----------------------------------------|--------------------|
| POST   | `/api/upload` | form-data `document` (PDF, max 10 MB)  | `{ fileName }`     |
| POST   | `/api/chat`   | JSON `{ question, history }`           | `{ answer }`       |

`history` = previous `{ role, content }` messages. The server keeps the last 6 as conversation memory.
