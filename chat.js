import readline from 'node:readline/promises';
import Groq from "groq-sdk";
import { vectorStore } from "./prepare.js";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const SYSTEM_PROMPT = `you are an assistant for question-answering tasks. Use the 
    following relevant pieces of retrieved context to answer the question.
    If you don't known the answer, say I don't know.`

export async function chat() {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

    while (true) {
        const question = await rl.question('you: ');
        if (question === '/bye') {
            break;
        }

        // retrieval
        const relevantChunks = await vectorStore.similaritySearch(question, 3);
        const context = relevantChunks.map((chunk) => chunk.pageContent).join("\n\n");

        const useQuery = `Question: ${question}
        Relevant context: ${context}
        Answer:`;

        const chatCompletion = await getGroqChatCompletion(useQuery);
        console.log("Assistant:", chatCompletion.choices[0]?.message?.content || "");
    }

    rl.close();
}

export async function getGroqChatCompletion(useQuery) {
  return groq.chat.completions.create({
    messages: [
      {
        role: "system",
        content: SYSTEM_PROMPT,
      },
      {
        role: "user",
        content: useQuery,
      },
    ],
    model: "openai/gpt-oss-20b",
  });
}

chat();