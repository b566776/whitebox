# Fluxograma de Processo - EvidencIA

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
*   **Registro Silencioso**: Ativado no `onOpen` e mantido pelo polling de metadados. Gera o "historio de rascunhos".
*   **Validador de Fontes**: Ferramenta proativa para o aluno garantir a qualidade de suas citações.
*   **Desafio de Autonomia**: Interface bloqueante ou de destaque quando o professor solicita a validação.

### Para o Professor
*   **Radar de Esforço**: Visão macro da construção do documento (vertical/sincronizada).
*   **Análise de Trecho**: O "Raio-X" de fragmentos suspeitos para detecção de mudança de tom.
*   **Gerador de Quiz**: Ferramenta de intervenção baseada em evidências, não apenas em "score de IA".

---
*Documento gerado como suporte visual ao Planejamento EvidencIA.*

## Diagrama de Sequência: Jornada Pedagógica (MVP)

Este diagrama representa a interação entre os atores conforme descrito nos itens 2 e 3 do planejamento, focando na jornada de ensino e aprendizagem.

```mermaid
sequenceDiagram
    autonumber
    actor V as Virdia
    participant DA as Dashboard (Backend)
    actor P as Professor
    V->>P: Entrega arquivo Google Doc com Addon
    participant UI as Addon do documento (Sidebar)
    actor A as Aluno
    participant BE as Backend & IA

    Note over P, A: Fase 1: Início e Configuração
    P->>P: Cria atividade no Google Classroom
    P->>P: copia do arquivo semente 
    P->>UI: Define parâmetros (define tarefa, prazo, Alertas)
    
    Note over P, A: Fase 2: Produção e Rastreamento
    A->>A: Abre o Google Doc da atividade
    UI->>UI: Inicia rastreamento silencioso de rascunhos
    A->>A: Escreve o texto e pesquisa fontes
    UI->>BE: Envia metadados (tempo, ritmo, colagens)
    BE->>UI: Atualiza Radar de Esforço em tempo real
    P->>UI: Monitora o Radar e métricas do Aluno
    A->>UI: Formaliza entrega do trabalho
    UI->>BE: COntabiliza entrega e envia metadados finais
    
    Note over P, A: Fase 3: Auditoria do Professor

    P->>P: Analisa metricas e mapa de calor dos trabalhos dos alunos  
    P->>P: Analisa metricas e mapa de calor dos trabalhos dos alunos    
    P->>UI: Seleciona trecho suspeito e clica em "Analisar"
    UI->>BE: Solicita análise de tom e consistência
    BE->>UI: Retorna evidências de risco e sugestões socráticas
    
    Note over P, A: Fase 4: Desafio e Validação
    P->>UI: Solicita disparo do Quiz de Autonomia
    UI->>A: Exibe Quiz personalizado na Sidebar do Aluno
    A->>UI: Responde ao Quiz
    UI->>BE: Salva respostas e gera relatório final
    
    Note over P, A: Fase 5: Diálogo e Veredito
    BE-->>UI: Disponibiliza resultados do Quiz
    P->>UI: Revisa respostas e evidências finais
    P->>A: Realiza conversa pedagógica baseada em evidências
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

    Note over AD, GS: Captura de Metadados (Debounce 3s)
    AD->>GS: google.script.run.sendToBackend(payload)
    
    GS->>BE: POST /api/send (JSON + ID Token)
    
    rect rgba(62, 60, 60, 1)
        Note right of BE: Processamento no Backend
        BE->>DB: Busca Histórico de Estilo (studentId)
        DB-->>BE: Retorna padrão de escrita anterior
        
        BE->>AI: Envia Fragmento + Contexto do Aluno
        Note right of AI: Análise de Tom e Consistência
        AI-->>BE: Retorna Score e Perguntas do Quiz
        
        BE->>DB: Salva métricas e estado do Quiz
    end
    
    BE-->>GS: JSON Response (toneChange, quizData, advice)
    GS-->>AD: Callback Success(response)
    
    AD->>AD: Atualiza UI (Semáforos, Radar, Quiz)
```

---
*Atualizado em 18/04/2026 para incluir o fluxo técnico de dados.*
