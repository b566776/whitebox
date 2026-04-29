# Fluxograma de Processo - WhiteBox

Este documento detalha o fluxo de interação entre Aluno e Professor, baseado nas jornadas descritas no planejamento do MVP.

```mermaid
graph TD
    %% Estilos
    classDef professor fill:#e1f5fe,stroke:#01579b,stroke-width:2px;
    classDef aluno fill:#e8f5e9,stroke:#1b5e20,stroke-width:2px;
    classDef sistema fill:#fff3e0,stroke:#e65100,stroke-width:2px,stroke-dasharray: 5 5;

    subgraph "Fase 1: Preparação e Início"
        P1[Professor cria atividade no Google Classroom]:::professor
        P2[Distribuição automática: Uma cópia por aluno]:::professor
        P3[Professor define parâmetros na Sidebar<br/>'Exigir Scholar', 'Alertas de Colagem']:::professor
        
        P1 --> P2 --> P3
    end

    subgraph "Fase 2: Produção e Rastreamento"
        A1[Aluno abre o documento]:::aluno
        S1{Add-on detecta abertura}:::sistema
        S2[Início do registro silencioso de metadados<br/>Tempo, Ritmo, Revisões, Colagens]:::sistema
        A2[Aluno escreve e pesquisa via Scholar/Validador]:::aluno
        
        P3 --> A1
        A1 --> S1 --> S2
        S2 --> A2
    end

    subgraph "Fase 3: Monitoramento e Auditoria"
        P4[Professor visualiza Radar de Esforço<br/>e Heatmap de Autoria]:::professor
        P5{Suspeita de automação ou falta de reflexão?}:::professor
        P6[Seleciona trecho e clica em 'Analisar Evolução']:::professor
        
        A2 --> P4
        P4 --> P5
        P5 -- Sim --> P6
        P5 -- Não --> P9
    end

    subgraph "Fase 4: Validação de Autonomia"
        S3[Backend gera Quiz Socrático personalizado<br/>via IA baseada no texto do aluno]:::sistema
        P7[Professor dispara o Desafio para o Aluno]:::professor
        A3[Interface do Quiz aparece na Sidebar do Aluno]:::aluno
        A4[Aluno responde ao Quiz de Autonomia]:::aluno
        
        P6 --> S3 --> P7 --> A3 --> A4
    end

    subgraph "Fase 5: Conclusão e Feedback"
        S4[Resultados do Quiz enviados ao Professor]:::sistema
        P8[Professor analisa evidências + Quiz<br/>e recebe sugestões de Diálogo Socrático]:::professor
        P9[Conversa pedagógica e Avaliação Final]:::professor
        
        A4 --> S4 --> P8 --> P9
    end
```

## Detalhamento dos Gatilhos (Itens 2 e 3)

### Para o Aluno
*   **Registro Silencioso**: Ativado no `onOpen` e mantido pelo polling de metadados. Gera o "histórico de rascunhos".
*   **Validador de Fontes**: Ferramenta proativa para o aluno garantir a qualidade de suas citações.
*   **Desafio de Autonomia**: Interface bloqueante ou de destaque quando o professor solicita a validação.

### Para o Professor
*   **Radar de Esforço**: Visão macro da construção do documento (vertical/sincronizada).
*   **Análise de Trecho**: O "Raio-X" de fragmentos suspeitos para detecção de mudança de tom.
*   **Gerador de Quiz**: Ferramenta de intervenção baseada em evidências, não apenas em "score de IA".

---
*Documento gerado como suporte visual ao Planejamento WhiteBox.*

## Diagrama de Sequência: Jornada Pedagógica (MVP)

Este diagrama representa a interação entre os atores conforme descrito nos itens 2 e 3 do planejamento, focando na jornada de ensino e aprendizagem.

```mermaid
sequenceDiagram
    autonumber
    actor V as Virdia
    actor P as Professor
    V->>P: Entrega arquivo<br/>(Google Doc-Semente)<br/>com Addon
    participant UI as WhiteBox<br/>Addon - DocSidebar / UI - mobile responsiva
    actor A as Aluno
    participant BE as Backend & IA

    Note over P, A: Fase 1: Início e Configuração<br/>(Google Classroom ou na nossa UI responsiva)
    P-->>P: Cria Tarefa 
    P-->>P: Faz uma copia do arquivo<br/> google doc (semente) 
    P->>UI: Publica Tarefa
    
    Note over P, A: Fase 2: Produção e Rastreamento
    UI->>A: Envia link da Tarefa
    A-->>A: Abre o Google Doc da atividade
    A-->>A: Aceita termos de uso e cria<br/>uma cópia do arquivo google doc emente 
    A-->>A: Inicia a produção do texto
    UI-->>UI: Inicia rastreamento<br/>silencioso (coleta de metadados)
    A-->>A: Escreve o texto e pesquisa fontes
    UI->>BE: Envia metadados (tempo, ritmo, colagens)
    BE-->>UI: Atualiza, para o Professor,<br/>Radar de Esforço em tempo real
    P->>UI: Pode monitorar (on-the-fly) o mapa<br/>de calor e métricas do Aluno
    A->>UI: Formaliza entrega do trabalho
    UI->>BE: Contabiliza entrega e envia metadados finais
    
    Note over P, A: Fase 3: Auditoria do Professor
    P->>UI: Acessa DASHBOARD
    BE->>UI: Envia métricas Turmas/Aluno
    P-->>P: Analisa métricas e mapa de calor<br>dos trabalhos por Turma/Aluno
    P->>UI: Seleciona, no doc do aluno, um <br>trecho suspeito e solicita análise
    UI->>BE: Solicita análise de tom e consistência
   
    
    Note over P, A: Fase 4: Desafio e Validação
    BE-->>UI: Retorna evidências de risco<br>e sugestões socráticas
    P->>UI: Solicita disparo do <br>Quiz de Autonomia para o Aluno
    UI-->>A: Exibe Quiz personalizado
    A-->>A: Responde ao Quiz
    A->>UI: Envia respostas ao Quiz
    UI->>BE: Salva respostas 
    UI->>UI: Gera Relatório final
    
    Note over P, A: Fase 5: Diálogo e Veredito
    P->UI: Solicita resultados do Quiz e Relatório Final
    BE->>UI: Disponibiliza dados
    P->>UI: Solicitarespostas do aluno e evidências finais
    UI->>P: Exibe respostas do aluno e evidências finais
    P->>P: Revisa respostas do aluno e evidências finais
    P->>A: Realiza devolutiva com conversa<br/>pedagógica baseada em evidências
```

## Fluxo de Informação (Arquitetura de Dados)

Este diagrama detalha como os dados técnicos trafegam entre o Google Docs, o Backend e os motores de IA.

```mermaid
sequenceDiagram
    participant AD as Google Docs (Add-on)
    participant GS as Apps Script (Server-side)
    participant BE as Backend API (triagem.cliv.app)
    participant DB as Banco de Dados (Postgres/Supabase)
    participant AI as IA Engine (Gemini Pro/NLP)

    Note over AD, GS: "Captura de Metadados (Debounce 3s)"
    AD->>GS: "google.script.run.sendToBackend(payload)"
    
    GS->>BE: "POST /api/send (JSON + ID Token)"
    
    rect rgba(62, 60, 60, 1)
        Note right of BE: Processamento no Backend
        BE->>DB: "Busca Histórico de Estilo (studentId)"
        DB-->>BE: Retorna padrão de escrita anterior
        
        BE->>AI: Envia Fragmento + Contexto do Aluno
        Note right of AI: Análise de Tom e Consistência
        AI-->>BE: Retorna Score e Perguntas do Quiz
        
        BE->>DB: "Salva métricas e estado do Quiz"
    end
    
    BE-->>GS: "JSON Response (toneChange, quizData, advice)"
    GS-->>AD: "Callback Success(response)"
    
    AD->>AD: "Atualiza UI (Semáforos, Radar, Quiz)"
```

---
*Atualizado em 18/04/2026 para incluir o fluxo técnico de dados.*
