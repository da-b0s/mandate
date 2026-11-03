// Writes the user-facing answer from what the paid services returned.
// The model only phrases facts it is given; it never sees keys or decides spending.
import { generateText } from "ai";
import { google } from "@ai-sdk/google";

const MODEL = process.env.ANSWER_MODEL ?? "gemini-2.5-flash";

export function plainAnswer(outputs) {
  const parts = Object.entries(outputs)
    .filter(([, o]) => o && !o.error)
    .map(([s, o]) => `${s}: ${o.summary}`);
  return parts.length ? parts.join("\n") : "No paid source delivered an answer; nothing useful to report.";
}

export async function writeAnswer({ ask, outputs, skipped }) {
  const facts = Object.entries(outputs).filter(([, o]) => o && !o.error);
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY || facts.length === 0) return { text: plainAnswer(outputs), model: null };
  try {
    const { text } = await generateText({
      model: google(MODEL),
      maxOutputTokens: 400,
      // Phrasing given facts needs no reasoning; thinking would eat the output budget.
      providerOptions: { google: { thinkingConfig: { thinkingBudget: 0 } } },
      system:
        "You are MANDATE, a research agent that buys data on the user's behalf. Answer the user's question in 2-4 short sentences " +
        "using ONLY the JSON facts provided. Lead with the verdict. Only say something was flagged if a fact shows a flag " +
        "(flagged: true or flaggedHolders non-empty), and then name the list that flagged it. When nothing is flagged, say which sources were checked. " +
        "Do not invent numbers, sources or advice beyond the facts. Plain text, no markdown.",
      prompt: `Question: ${ask}\n\nFacts from paid sources:\n${JSON.stringify(Object.fromEntries(facts), null, 1)}\n\nSources skipped: ${JSON.stringify(skipped)}`,
    });
    return { text: text.trim(), model: MODEL };
  } catch (e) {
    return { text: plainAnswer(outputs), model: null, modelError: String(e.message ?? e).slice(0, 200) };
  }
}
