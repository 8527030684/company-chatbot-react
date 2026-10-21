import Groq from "groq-sdk";
import { tavily } from "@tavily/core";
import { vectorStore } from "./prepare.js";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const tvly = tavily({ apiKey: process.env.TAVILY_API_KEY });

const MODEL = "openai/gpt-oss-20b";
const MAX_TOOL_ROUNDS = 5; // safety: stop the loop after 5 tool rounds

const SYSTEM_PROMPT = `You are a helpful company assistant.

You have tools:
- searchCompanyDocs: searches the company's uploaded internal documents (HR policies, leave rules, processes, etc.).
- webSearch: searches the internet for current or general information (only available when the user turns web search on).

Rules:
- For any question about the company, its policies or internal processes, ALWAYS call searchCompanyDocs first.
- Use webSearch for current events, news, prices, general knowledge, or when company docs don't have the answer.
- Base your answer only on what the tools returned. If nothing relevant is found, say "I don't know".
- Answer in the same language the user asks in (English, Hindi or Hinglish).
- Use Markdown (bold, lists, tables) when it makes the answer clearer.
Current date: ${new Date().toDateString()}.`;

/* ------------------------------------------------------------------ */
/* Tool definitions (what the LLM sees)                                 */
/* ------------------------------------------------------------------ */

const searchCompanyDocsTool = {
  type: "function",
  function: {
    name: "searchCompanyDocs",
    description: "Search the company's internal documents (policies, HR rules, processes) for relevant information.",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "The search query, written as a full question." },
      },
      required: ["query"],
    },
  },
};

const webSearchTool = {
  type: "function",
  function: {
    name: "webSearch",
    description: "Search the internet for latest or general information.",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "The search query." },
      },
      required: ["query"],
    },
  },
};

/* ------------------------------------------------------------------ */
/* Tool functions (what actually runs)                                  */
/* ------------------------------------------------------------------ */

// RAG: same Pinecone search as before
async function searchCompanyDocs({ query }, sources) {
  const relevantChunks = await vectorStore.similaritySearch(query, 3);
  if (relevantChunks.length === 0) return "No relevant company documents found.";

  sources.docs = true;
  return relevantChunks.map((chunk) => chunk.pageContent).join("\n\n");
}

// Web search with Tavily
async function webSearch({ query }, sources) {
  const response = await tvly.search(query, { maxResults: 5 });
  const results = response.results || [];
  if (results.length === 0) return "No web results found.";

  // remember links so the UI can show them under the answer
  for (const r of results) {
    if (!sources.web.some((s) => s.url === r.url)) sources.web.push({ title: r.title, url: r.url });
  }
  return results.map((r) => `Title: ${r.title}\nURL: ${r.url}\nContent: ${r.content}`).join("\n\n");
}

const toolFunctions = { searchCompanyDocs, webSearch };

/* ------------------------------------------------------------------ */
/* Agent loop                                                           */
/* ------------------------------------------------------------------ */

// history = previous messages from the React app: [{ role: "user" | "assistant", content }]
export async function askQuestion(question, history = [], { allowWeb = false } = {}) {
  const tools = allowWeb ? [searchCompanyDocsTool, webSearchTool] : [searchCompanyDocsTool];
  const sources = { docs: false, web: [] };

  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    ...history, // conversation memory
    { role: "user", content: question },
  ];

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const completion = await groq.chat.completions.create({
      model: MODEL,
      messages,
      tools,
      tool_choice: "auto",
    });

    const message = completion.choices[0]?.message;
    const toolCalls = message?.tool_calls || [];

    // No tool needed → this is the final answer
    if (toolCalls.length === 0) {
      return { answer: message?.content || "", sources };
    }

    // LLM asked for tools → keep its request in the conversation
    messages.push({ role: "assistant", content: message.content || "", tool_calls: toolCalls });

    // Run every tool it asked for and send the results back
    for (const call of toolCalls) {
      const name = call.function.name;
      let result;
      try {
        const args = JSON.parse(call.function.arguments || "{}");
        const fn = toolFunctions[name];
        if (!fn || (name === "webSearch" && !allowWeb)) {
          result = `Tool "${name}" is not available.`;
        } else {
          console.log(`🔧 ${name}("${args.query}")`);
          result = await fn(args, sources);
        }
      } catch (err) {
        console.error(`Tool ${name} failed:`, err);
        result = `Tool "${name}" failed: ${err.message}`;
      }

      messages.push({ role: "tool", tool_call_id: call.id, content: result });
    }
  }

  // Too many rounds → ask for a final answer without tools
  const final = await groq.chat.completions.create({
    model: MODEL,
    messages: [...messages, { role: "user", content: "Give your final answer now using the information above." }],
  });
  return { answer: final.choices[0]?.message?.content || "", sources };
}
