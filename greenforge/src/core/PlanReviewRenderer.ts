import { PlanReviewView } from './types/PlanReview.js';

/**
 * Fase 15 — PlanReviewRenderer
 *
 * Renderizador textual para visões de revisão de plano.
 * Transforma uma PlanReviewView estruturada em markdown
 * formatado para revisão humana em terminal.
 *
 * Este componente é puro (sem efeitos colaterais) e testável.
 */
export class PlanReviewRenderer {
  /**
   * Renderiza uma PlanReviewView em markdown completo para revisão.
   */
  render(view: PlanReviewView): string {
    let md = `# GREENFORGE_PLAN_REVIEW — ${view.title}\n\n`;
    md += `**Task ID:** ${view.taskId}\n`;
    md += `**Review Status:** ${view.reviewStatus}\n`;
    md += `**Original Prompt:** ${view.originalPrompt}\n`;
    md += `**Created At:** ${view.createdAt}\n\n`;

    md += this.renderQuestions(view);
    md += this.renderSubtasks(view);
    md += this.renderAcceptanceCriteria(view);
    md += this.renderRisks(view);
    md += this.renderAgents(view);
    md += this.renderDependencies(view);

    return md;
  }

  /**
   * Renderiza a seção de perguntas de clarificação.
   */
  renderQuestions(view: PlanReviewView): string {
    let md = `## Questions\n`;

    if (view.questions.length === 0) {
      md += `_No clarification questions._\n`;
    } else {
      for (const q of view.questions) {
        const tag = q.required ? 'REQUIRED' : 'OPTIONAL';
        md += `- [${tag}] ${q.question} (id: ${q.id})\n`;
      }
    }
    md += `\n`;

    return md;
  }

  /**
   * Renderiza a seção de subtarefas.
   */
  renderSubtasks(view: PlanReviewView): string {
    let md = `## Subtasks\n`;

    if (view.subtasks.length === 0) {
      md += `_No subtasks defined._\n`;
    } else {
      for (const st of view.subtasks) {
        md += `### ${st.id}: ${st.title}\n`;
        md += `- **Agent:** ${st.assignedAgent ?? 'Unassigned'}\n`;
        md += `- **Depends On:** ${st.dependsOn.length > 0 ? st.dependsOn.join(', ') : 'None'}\n\n`;
      }
    }

    return md;
  }

  /**
   * Renderiza a seção de critérios de aceitação.
   */
  renderAcceptanceCriteria(view: PlanReviewView): string {
    let md = `## Acceptance Criteria\n`;

    if (view.acceptanceCriteria.length === 0) {
      md += `_No acceptance criteria._\n`;
    } else {
      for (const ac of view.acceptanceCriteria) {
        md += `- ${ac}\n`;
      }
    }
    md += `\n`;

    return md;
  }

  /**
   * Renderiza a seção de riscos.
   * Não quebra com riscos vazios.
   */
  renderRisks(view: PlanReviewView): string {
    let md = `## Risks\n`;

    if (view.risks.length === 0) {
      md += `_No risks identified._\n`;
    } else {
      for (const r of view.risks) {
        md += `- ${r}\n`;
      }
    }
    md += `\n`;

    return md;
  }

  /**
   * Renderiza a seção de agentes atribuídos.
   */
  renderAgents(view: PlanReviewView): string {
    let md = `## Agents Assigned\n`;

    if (view.agents.length === 0) {
      md += `_No agents assigned._\n`;
    } else {
      for (const agent of view.agents) {
        md += `- ${agent}\n`;
      }
    }
    md += `\n`;

    return md;
  }

  /**
   * Renderiza a seção de dependências entre subtarefas.
   */
  renderDependencies(view: PlanReviewView): string {
    let md = `## Dependencies\n`;

    if (view.dependencies.length === 0) {
      md += `_No inter-subtask dependencies._\n`;
    } else {
      for (const dep of view.dependencies) {
        md += `- **${dep.subtaskId}** depends on: ${dep.dependsOn.join(', ')}\n`;
      }
    }
    md += `\n`;

    return md;
  }

  /**
   * Renderiza um template de feedback para o usuário responder.
   */
  renderFeedbackTemplate(view: PlanReviewView): string {
    let md = `# Feedback Template — ${view.title}\n\n`;
    md += `Use this template to provide feedback on the plan.\n\n`;

    md += `## General Feedback\n`;
    md += `_Write your general feedback here:_\n\n`;

    if (view.questions.length > 0) {
      md += `## Clarification Answers\n`;
      for (const q of view.questions) {
        const tag = q.required ? '[REQUIRED]' : '[OPTIONAL]';
        md += `- ${tag} ${q.question} (id: ${q.id})\n`;
        md += `  _Your answer:_\n\n`;
      }
    }

    return md;
  }

  /**
   * Renderiza um resumo compacto da revisão (one-liner por subtarefa).
   */
  renderCompact(view: PlanReviewView): string {
    const lines: string[] = [];
    lines.push(`Plan Review: ${view.title} [${view.reviewStatus}]`);
    lines.push(`  Task: ${view.taskId}`);
    lines.push(`  Prompt: ${view.originalPrompt.slice(0, 60)}...`);
    lines.push(`  Subtasks: ${view.subtasks.length}`);
    lines.push(`  Questions: ${view.questions.length}`);
    lines.push(`  Criteria: ${view.acceptanceCriteria.length}`);
    lines.push(`  Risks: ${view.risks.length}`);
    lines.push(`  Agents: ${view.agents.join(', ') || 'None'}`);

    return lines.join('\n');
  }
}