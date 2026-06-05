import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

export async function POST(req: Request) {
  try {
    const { message } = await req.json();

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({
        content: "A chave GEMINI_API_KEY não está configurada.",
        role: "system",
        agentName: "Error"
      });
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: message,
    });

    return NextResponse.json({
      content: response.text || "Sem resposta...",
      role: "assistant",
      agentName: "Gemini"
    });
  } catch (error: any) {
    return NextResponse.json({
      content: `Erro na API: ${error.message}`,
      role: "system",
      agentName: "Error"
    });
  }
}
