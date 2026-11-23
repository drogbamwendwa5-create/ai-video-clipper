import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { addCost, retry } from "./util.js";

let injectedClient;
export function setLlmClient(client) {
  injectedClient = client;
}

export async function generateJson({ system, user, schema }) {
  const provider = process.env.LLM_PROVIDER;
  const model = process.env.LLM_MODEL;
  if (!provider || !["anthropic", "openai"].includes(provider)) {
    throw new Error("LLM_PROVIDER must be anthropic or openai.");
  }
  if (!model) throw new Error("LLM_MODEL is required.");

  let validationError = "";
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const prompt = validationError
      ? `${user}\n\nYour previous response failed validation: ${validationError}`
      : user;
    const raw = await retry(async () => {
      if (injectedClient) return injectedClient.generate({ system, user: prompt, model });
      if (provider === "anthropic") {
        const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
        return (await client.messages.create({
          model,
          max_tokens: 4096,
          system,
          messages: [{ role: "user", content: `${prompt}\nRespond with JSON only.` }],
        })).content.map((item) => item.text ?? "").join("");
      }
      const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const response = await client.chat.completions.create({
        model,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: `${system}\nRespond with JSON only.` },
          { role: "user", content: prompt },
        ],
      });
      return response.choices[0]?.message?.content ?? "";
    });

    let parsed;
    try {
      const match = String(raw).match(/\{[\s\S]*\}/);
      parsed = JSON.parse(match?.[0] ?? String(raw));
    } catch (error) {
      validationError = error.message;
      continue;
    }
    const result = schema.safeParse(parsed);
    if (result.success) {
      addCost("llm", 0);
      return result.data;
    }
    validationError = result.error.message;
  }
  throw new Error(`LLM JSON validation failed: ${validationError}`);
}
