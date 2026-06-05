// server/src/agent/AgentLoop.ts
import { ToolRegistry } from '../tools/index.js';

export type AgentEvent = 
  | { type: 'thinking_start'; payload: { message: string } }
  | { type: 'thinking_end'; payload: { duration: number } }
  | { type: 'tool_call_start'; payload: { toolName: string; args: any } }
  | { type: 'tool_call_end'; payload: { toolName: string; result: any; duration: number } }
  | { type: 'tool_call_error'; payload: { toolName: string; error: string } }
  | { type: 'assistant_message'; payload: { content: string } }
  | { type: 'approval_request'; payload: { toolName: string; args: any; description: string } }
  | { type: 'loop_complete'; payload: { iterations: number } }
  | { type: 'loop_error'; payload: { error: string } };

export class AgentLoop {
  private sessionId: string;
  private eventHandler: (event: AgentEvent) => void;
  private isRunning: boolean = false;
  private shouldStop: boolean = false;
  private maxIterations: number = 10;
  private toolRegistry: ToolRegistry;

  constructor(
    sessionId: string,
    eventHandler: (event: AgentEvent) => void,
    options?: { maxIterations?: number }
  ) {
    this.sessionId = sessionId;
    this.eventHandler = eventHandler;
    this.maxIterations = options?.maxIterations || this.maxIterations;
    this.toolRegistry = ToolRegistry.getInstance();
  }

  /**
   * Processa uma mensagem do usuário através do loop agêntico
   */
  async processMessage(userMessage: string): Promise<void> {
    if (this.isRunning) {
      throw new Error('Agent loop já está em execução');
    }

    this.isRunning = true;
    this.shouldStop = false;

    try {
      // Histórico de mensagens para o contexto
      const messages: any[] = [
        {
          role: 'system',
          content: this.getSystemPrompt()
        },
        {
          role: 'user',
          content: userMessage
        }
      ];

      let iteration = 0;

      while (!this.shouldStop && iteration < this.maxIterations) {
        iteration++;

        // Envia evento de início do pensamento
        this.eventHandler({
          type: 'thinking_start',
          payload: { message: `Processando iteração ${iteration}...` }
        });

        const startTime = Date.now();

        // Chama o LLM (implementação mockada por enquanto)
        const llmResponse = await this.callLLM(messages);

        const thinkingDuration = Date.now() - startTime;
        this.eventHandler({
          type: 'thinking_end',
          payload: { duration: thinkingDuration }
        });

        // Verifica se há tool calls na resposta
        if (llmResponse.toolCalls && llmResponse.toolCalls.length > 0) {
          // Processa cada tool call
          for (const toolCall of llmResponse.toolCalls) {
            if (this.shouldStop) break;

            // Solicita aprovação se necessário
            const requiresApproval = this.toolRegistry.requiresApproval(toolCall.name);
            
            if (requiresApproval) {
              const toolInfo = this.toolRegistry.getToolInfo(toolCall.name);
              this.eventHandler({
                type: 'approval_request',
                payload: {
                  toolName: toolCall.name,
                  args: toolCall.args,
                  description: toolInfo?.description || 'Operação requer aprovação'
                }
              });

              // Aguarda aprovação (isso será implementado com WebSocket bidirecional)
              // Por enquanto, continuamos sem aprovação real
              // Na implementação real, pausaríamos aqui e aguardaríamos uma mensagem do cliente
            }

            // Executa a ferramenta
            const toolStartTime = Date.now();
            this.eventHandler({
              type: 'tool_call_start',
              payload: {
                toolName: toolCall.name,
                args: toolCall.args
              }
            });

            try {
              const result = await this.toolRegistry.execute(toolCall.name, toolCall.args);
              
              const toolDuration = Date.now() - toolStartTime;
              this.eventHandler({
                type: 'tool_call_end',
                payload: {
                  toolName: toolCall.name,
                  result,
                  duration: toolDuration
                }
              });

              // Adiciona o resultado ao histórico de mensagens
              messages.push({
                role: 'assistant',
                content: llmResponse.content || '',
                toolCalls: [toolCall]
              });

              messages.push({
                role: 'tool',
                content: JSON.stringify(result),
                toolName: toolCall.name
              });
            } catch (error) {
              const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
              this.eventHandler({
                type: 'tool_call_error',
                payload: {
                  toolName: toolCall.name,
                  error: errorMessage
                }
              });

              // Adiciona o erro ao histórico
              messages.push({
                role: 'tool',
                content: JSON.stringify({ error: errorMessage }),
                toolName: toolCall.name
              });
            }
          }

          // Se processou tool calls, continua o loop para próxima iteração
          continue;
        }

        // Se não há tool calls, envia a resposta final
        if (llmResponse.content) {
          this.eventHandler({
            type: 'assistant_message',
            payload: { content: llmResponse.content }
          });
        }

        // Loop completo
        break;
      }

      if (this.shouldStop) {
        this.eventHandler({
          type: 'loop_complete',
          payload: { iterations: iteration, stopped: true }
        });
      } else if (iteration >= this.maxIterations) {
        this.eventHandler({
          type: 'loop_error',
          payload: { error: `Número máximo de iterações (${this.maxIterations}) atingido` }
        });
      } else {
        this.eventHandler({
          type: 'loop_complete',
          payload: { iterations: iteration }
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      this.eventHandler({
        type: 'loop_error',
        payload: { error: errorMessage }
      });
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Para a execução do loop agêntico
   */
  stop(): void {
    this.shouldStop = true;
  }

  /**
   * Prompt do sistema para o agente
   */
  private getSystemPrompt(): string {
    const tools = this.toolRegistry.listTools();
    
    return `Você é o GreenForge AI, um assistente especializado em desenvolvimento de software.
    
Você tem acesso às seguintes ferramentas:

${tools.map(t => `- **${t.name}**: ${t.description}`).join('\n')}

Instruções:
1. Analise cuidadosamente a solicitação do usuário
2. Use as ferramentas disponíveis quando necessário
3. Sempre explique o que você está fazendo antes de executar uma ação
4. Para operações que modificam arquivos, descreva claramente as mudanças
5. Se encontrar erros, informe o usuário e sugira alternativas
6. Mantenha respostas concisas mas informativas

Você está pronto para ajudar o usuário com suas tarefas de desenvolvimento.`;
  }

  /**
   * Chama o LLM para obter uma resposta
   * Esta é uma implementação mockada - será substituída por uma chamada real à API
   */
  private async callLLM(messages: any[]): Promise<{ content?: string; toolCalls?: Array<{ name: string; args: any }> }> {
    // Mock implementation - será substituído por chamada real à API do Gemini/OpenAI/etc.
    
    // Simula delay de rede
    await new Promise(resolve => setTimeout(resolve, 500));

    // Resposta mockada inteligente baseada no conteúdo da mensagem
    const lastUserMessage = messages.filter(m => m.role === 'user').pop();
    
    if (!lastUserMessage) {
      return { content: 'Não entendi sua solicitação. Pode reformular?' };
    }

    const content = lastUserMessage.content.toLowerCase();

    // Detecta intenções simples para demonstração
    if (content.includes('list') || content.includes('listar') || content.includes('arquivo') || content.includes('diretório')) {
      return {
        content: 'Vou listar os arquivos do diretório atual para você.',
        toolCalls: [{
          name: 'list_directory',
          args: { path: '.', recursive: false }
        }]
      };
    }

    if (content.includes('ler') || content.includes('read') || content.includes('mostrar') || content.includes('ver')) {
      return {
        content: 'Vou ler o conteúdo do arquivo solicitado.',
        toolCalls: [{
          name: 'read_file',
          args: { path: 'package.json' }
        }]
      };
    }

    if (content.includes('criar') || content.includes('create') || content.includes('novo')) {
      return {
        content: 'Vou criar um novo arquivo conforme solicitado.',
        toolCalls: [{
          name: 'write_file',
          args: { 
            path: 'exemplo.txt', 
            content: 'Este é um arquivo de exemplo criado pelo GreenForge.' 
          }
        }]
      };
    }

    // Resposta padrão sem tool calls
    return {
      content: `Recebi sua mensagem: "${lastUserMessage.content}". 

Como esta é uma versão de demonstração, minhas capacidades estão limitadas. 
Em breve terei integração completa com LLM para fornecer assistência mais avançada.

Enquanto isso, você pode testar comandos como:
- "Listar arquivos do diretório"
- "Ler package.json"
- "Criar um arquivo de exemplo"`
    };
  }
}
