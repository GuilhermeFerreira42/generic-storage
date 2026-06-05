import { z } from 'zod';

export const ProposerResponseSchema = z.object({
  proposed_architecture: z.string().describe("A arquitetura técnica proposta e plano de ação"),
  security_considerations: z.string().describe("Considerações de segurança integradas ao design"),
  tradeoffs: z.array(z.string()).describe("Lista de trade-offs de performance e complexidade"),
  changes: z.array(z.object({
    path: z.string().describe("Caminho do arquivo afetado"),
    action: z.enum(["CREATE", "MODIFY", "DELETE"]).describe("Ação a ser executada no arquivo"),
    newContent: z.string().describe("Conteúdo integral ou diff do arquivo")
  })).optional()
});

export const CriticResponseSchema = z.object({
  vulnerabilities: z.array(z.object({
    description: z.string().describe("Descrição detalhada da vulnerabilidade encontrada"),
    severity: z.enum(["LOW", "MEDIUM", "HIGH"]).describe("Nível de severidade"),
    mitigation: z.string().describe("Proposta de mitigação")
  })).describe("Lista de vulnerabilidades encontradas no código ou arquitetura proposta"),
  design_flaws: z.array(z.string()).describe("Falhas de design, loops conceituais, ou redundâncias"),
  overall_security_score: z.number().min(0).max(100).describe("Nota geral de segurança de 0 a 100")
});

export const JudgeResponseSchema = z.object({
  synthesis: z.string().describe("Síntese Dialética Socrática consolidando o debate entre Propositor e Crítico"),
  approved_changes: z.array(z.object({
    path: z.string().describe("Caminho do arquivo aprovado"),
    action: z.enum(["CREATE", "MODIFY", "DELETE"]).describe("Tipo de operação"),
    newContent: z.string().describe("Conteúdo completo do arquivo")
  })).describe("Lista de modificações validadas e aprovadas para o workspace"),
  final_verdict: z.string().describe("Veredito final avaliando se a segurança e performance foram garantidas"),
  estimated_tokens: z.number().describe("Cálculo estimado do uso de tokens")
});

export type ProposerResponse = z.infer<typeof ProposerResponseSchema>;
export type CriticResponse = z.infer<typeof CriticResponseSchema>;
export type JudgeResponse = z.infer<typeof JudgeResponseSchema>;
