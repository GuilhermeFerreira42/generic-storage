import { GoogleGenAI } from "@google/genai";
import { z } from "zod";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

export async function callStructuredAgent<T extends z.ZodTypeAny>(
  model: string,
  systemInstruction: string,
  userPrompt: string,
  schema: T
): Promise<z.infer<T>> {
  // Instruct model to follow the specific JSON format
  const jsonInstruction = `
  Você deve responder ESTRITAMENTE com um objeto JSON válido que corresponda ao seguinte schema de dados.
  Não inclua explicações fora do JSON. Não coloque markdown em volta exceto se for necessário, retorne apenas o JSON puro.
  `;

  const fullPrompt = `${userPrompt}\n\n${jsonInstruction}`;

  const response = await ai.models.generateContent({
    model: model || "gemini-3.5-flash",
    contents: fullPrompt,
    config: {
      systemInstruction,
      responseMimeType: "application/json",
    }
  });

  const rawText = response.text || "{}";
  let text = rawText.trim();
  
  // Clean markdown blocks if the model insists on adding them
  if (text.startsWith("```json")) {
    text = text.substring(7);
  } else if (text.startsWith("```")) {
    text = text.substring(3);
  }
  if (text.endsWith("```")) {
    text = text.substring(0, text.length - 3);
  }
  text = text.trim();

  try {
    const parsed = JSON.parse(text);
    return schema.parse(parsed);
  } catch (error) {
    console.error("Erro ao validar resposta estruturada do agente no VFS:", error, "Raw text:", rawText);
    // Fallback or retry logic if needed, or rethrow
    throw new Error(`Resposta do agente inválida para o schema esperado: ${error instanceof Error ? error.message : "Parse Error"}`);
  }
}
