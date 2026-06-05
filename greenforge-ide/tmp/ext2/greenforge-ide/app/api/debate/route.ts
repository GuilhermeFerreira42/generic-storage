import { NextRequest } from "next/server";
import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import { LoopDetector } from "@/lib/security/loop-detector";
import { callStructuredAgent } from "@/lib/structured-client";
import { 
  ProposerResponseSchema, 
  CriticResponseSchema, 
  JudgeResponseSchema 
} from "@/lib/agent-schemas";
import { 
  PROPOSER_PROMPT, 
  CRITIC_PROMPT, 
  JUDGE_PROMPT 
} from "@/lib/prompts/agent-prompts";

async function loadAgentPrompt(id: string, defaultPrompt: string): Promise<string> {
  try {
    const filePath = path.join(process.cwd(), "AGENTS.md");
    const fileContent = await fs.readFile(filePath, "utf8");
    const blocks = fileContent.split("---").map(b => b.trim()).filter(Boolean);
    for (const block of blocks) {
      if (block.includes(`id: ${id}`)) {
        const parts = fileContent.split("---").map(p => p.trim());
        if (id === "technical_proposer" && parts[2]) return `${defaultPrompt}\n\nInstruções locais adicionais:\n${parts[2]}`;
        if (id === "quality_critic" && parts[4]) return `${defaultPrompt}\n\nInstruções locais adicionais:\n${parts[4]}`;
        if (id === "debate_judge" && parts[6]) return `${defaultPrompt}\n\nInstruções locais adicionais:\n${parts[6]}`;
      }
    }
  } catch (e) {
    console.error(`Erro ao ler AGENTS.md para ${id}, usando padrão`, e);
  }
  return defaultPrompt;
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const objective = body.objective || "Construa o esqueleto base de um aplicativo.";

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (type: string, payload: any) => {
        controller.enqueue(encoder.encode(`event: ${type}\ndata: ${JSON.stringify(payload)}\n\n`));
      };

      const loopDetector = new LoopDetector();

      // Simulated helper to stream text token by token to the front-end for gorgeous visual UX
      const streamText = async (agentId: string, role: string, text: string) => {
        const chunkSize = 35; // optimal size for rapid typing experience
        for (let i = 0; i < text.length; i += chunkSize) {
          const chunk = text.substring(i, i + chunkSize);
          sendEvent('AGENT_TOKEN', { role, agentId, token: chunk, isLast: false });
          await new Promise(r => setTimeout(r, 6));
        }
        sendEvent('AGENT_TOKEN', { role, agentId, token: '', isLast: true });
      };

      try {
        // --- PROPOSER ---
        sendEvent('DEBATE_STATUS', { status: 'IN_PROGRESS', activeAgent: 'technical_proposer', currentRound: 1 });
        const proposerSys = await loadAgentPrompt("technical_proposer", PROPOSER_PROMPT);
        
        const proposerStructured = await callStructuredAgent(
          'gemini-3.5-flash',
          proposerSys,
          `Objetivo Solicitado pelo usuário:\n"${objective}"\n\nPor favor, elabore sua proposta arquitetural completa em JSON de acordo com o schema de resposta.`,
          ProposerResponseSchema
        );

        const proposerText = `PROPOSTA ARQUITETURAL:\n${proposerStructured.proposed_architecture}\n\nCONSIDERAÇÕES DE SEGURANÇA:\n${proposerStructured.security_considerations}\n\nTRADE-OFFS:\n${proposerStructured.tradeoffs.map(t => `- ${t}`).join("\n")}`;

        // Verify security loop signature
        const proposerLoopSig = loopDetector.detect(proposerText);
        if (proposerLoopSig.isLoop) {
          sendEvent('SECURITY_VIOLATION', { error: `Loop semântico detectado no Propositor (Tier: ${proposerLoopSig.tier})` });
          controller.close();
          return;
        }

        await streamText('technical_proposer', 'proposer', proposerText);

        // --- CRITIC ---
        sendEvent('DEBATE_STATUS', { status: 'IN_PROGRESS', activeAgent: 'quality_critic', currentRound: 1 });
        const criticSys = await loadAgentPrompt("quality_critic", CRITIC_PROMPT);

        const criticStructured = await callStructuredAgent(
          'gemini-3.5-flash',
          criticSys,
          `Proposta Técnica Proposta sob avaliação:\n>>>\n${proposerText}\n<<<\n\nPor favor, faça um escaneamento contraditório implacável em JSON de acordo com o schema de resposta.`,
          CriticResponseSchema
        );

        const vulnerabilitiesText = criticStructured.vulnerabilities.map(v => `[${v.severity}] ${v.description}\nMitigação: ${v.mitigation}`).join("\n\n");
        const designFlawsText = criticStructured.design_flaws.map(f => `- ${f}`).join("\n");
        const criticText = `AVALIAÇÃO DE SEGURANÇA (Score: ${criticStructured.overall_security_score}/100)\n\nVULNERABILIDADES ENCONTRADAS:\n${vulnerabilitiesText || "Nenhuma falha crítica detectada."}\n\nFALHAS DE DESIGN E REDUNDÂNCIAS:\n${designFlawsText || "Estrutura de design limpa e eficiente."}`;

        // Verify security loop signature
        const criticLoopSig = loopDetector.detect(criticText);
        if (criticLoopSig.isLoop) {
          sendEvent('SECURITY_VIOLATION', { error: `Loop semântico detectado no Crítico (Tier: ${criticLoopSig.tier})` });
          controller.close();
          return;
        }

        await streamText('quality_critic', 'critic', criticText);

        // --- JUDGE ---
        sendEvent('DEBATE_STATUS', { status: 'IN_PROGRESS', activeAgent: 'debate_judge', currentRound: 1 });
        const judgeSys = await loadAgentPrompt("debate_judge", JUDGE_PROMPT);

        let judgeStructured;
        try {
          judgeStructured = await callStructuredAgent(
            'gemini-3.1-pro-preview',
            judgeSys,
            `Proposta Técnica:\n${proposerText}\n\nCríticos Contra:\n${criticText}\n\nPor favor, aja como árbitro imparcial do debate. Produza a síntese dialética e escreva os códigos de correção apropriados em formato JSON estruturado.`,
            JudgeResponseSchema
          );
        } catch (err) {
          console.warn("Falha no modelo pro de julgamento (fallback para flash):", err);
          judgeStructured = await callStructuredAgent(
            'gemini-3.5-flash',
            judgeSys,
            `Proposta Técnica:\n${proposerText}\n\nCríticos Contra:\n${criticText}\n\nPor favor, aja como árbitro imparcial do debate. Produza a síntese dialética e escreva os códigos de solução em formato JSON estruturado.`,
            JudgeResponseSchema
          );
        }

        const judgeText = `SÍNTESE SOGRÁTICA FINAL:\n${judgeStructured.synthesis}\n\nVEREDITO:\n${judgeStructured.final_verdict}`;

        await streamText('debate_judge', 'judge', judgeText);

        const cpgSimHash = crypto.createHash('md5').update(judgeStructured.synthesis).digest('hex').substring(0, 8);

        // Map approved changes into card chunks
        const chunks = judgeStructured.approved_changes.map(change => ({
          path: change.path,
          originalContent: "",
          newContent: change.newContent
        }));

        const maxSeverity = criticStructured.vulnerabilities.some(v => v.severity === 'HIGH') ? 'HIGH' :
                            criticStructured.vulnerabilities.some(v => v.severity === 'MEDIUM') ? 'MEDIUM' : 'LOW';

        const redFlags = criticStructured.vulnerabilities.map(v => `[${v.severity}] ${v.description}`);

        // Dispatch final consensus gate
        sendEvent('HITL_GATE', {
          gateType: 'GATE_1',
          approvalCard: {
            id: `gate-g1-${cpgSimHash}-${Date.now()}`,
            sessionId: "session-local-01",
            type: "GATE_1",
            title: "Consenso Dialético Amortizado",
            summary: `Os engenheiros alcançaram convergência. A arquitetura foi robustecida prevenindo vulnerabilidades de severidade ${maxSeverity} identificadas pelo QA.`,
            underlyingQuestion: "Análise concluída. Deseja aplicar as modificações propostas no workspace?",
            synthesis: judgeStructured.synthesis,
            redFlags,
            estimatedTokens: judgeStructured.estimated_tokens || 8500,
            risk: maxSeverity,
            chunks: chunks
          }
        });

        controller.close();
      } catch (err: any) {
        console.error("NEXUS Structured Debate Error:", err);
        sendEvent('SECURITY_VIOLATION', { error: err.message || "Erro de Integração de Agentes" });
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no'
    }
  });
}
