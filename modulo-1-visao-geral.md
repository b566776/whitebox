# Módulo 1 — Visão Geral do Whitebox

Conteúdo formatado para publicação como **Materiais** no Google Classroom.

---

## Material 1.1 — O Problema da Escrita na Era da IA

**Título**: Por que precisamos repensar a avaliação da escrita?

Olá, professores!

Vocês já receberam um texto impecável, com vocabulário avançado e estrutura perfeita, mas com a sensação de que *"não foi o aluno que escreveu"*?

Com a popularização do ChatGPT, Gemini, Claude e outras IAs generativas, esse desafio se tornou parte do nosso dia a dia. Não se trata mais de apenas detectar plágio tradicional (cópia e cola da internet) — hoje, qualquer redação pode ser gerada em segundos, de forma única e sem correspondências exatas na web.

### 🚫 A Ilusão dos Detectores de IA
Muitas escolas tentam usar ferramentas de "detecção de IA". No entanto, pesquisas mostram que esses detectores:
- Geram muitos **falsos positivos** (acusando alunos inocentes, especialmente os que usam inglês como segunda língua ou têm escrita mais formal).
- São facilmente burlados com pequenas edições de texto.
- Não explicam *como* chegaram ao veredito.

> **💡 O Novo Paradigma Pedagógico:**
> O problema não é a tecnologia de IA, mas sim o fato de avaliarmos apenas o **produto final**. Para garantir uma avaliação justa e desenvolver habilidades reais de escrita, precisamos voltar nosso olhar para o **processo de construção** do texto.

É exatamente aí que entra o **Whitebox**. Em vez de tentar "adivinhar" se o texto final foi gerado por IA, o Whitebox torna visível o esforço, as pausas, a digitação e a evolução do pensamento do aluno ao longo do tempo.

**Recursos de Apoio**:
- 📹 [Reportagem do Jornal Nacional: Universidades estabelecem regras para uso de IA por alunos](https://g1.globo.com/jornal-nacional/video/universidades-estabelecem-regras-para-uso-de-ia-por-alunos-14546463.ghtml) — *Reportagem essencial sobre o cenário regulatório do uso de IA por estudantes.*
- 📄 [Termos de Uso e Privacidade do Aluno](https://docs.google.com/document/d/...) — *Cole o link do documento de termos de privacidade*

---

## Material 1.2 — O que é o Whitebox?

**Título**: O que é o Whitebox? Transparência e Parceria no Processo de Escrita

O **Whitebox** é um assistente pedagógico integrado diretamente ao **Google Docs** na forma de um painel lateral (Sidebar add-on). Ele foi desenvolvido para que professores e alunos analisem juntos a jornada de criação de um texto.

### 📊 As Três Métricas Fundamentais do Processo
O Whitebox não monitora telas nem grava áudio. Ele analisa exclusivamente três indicadores de escrita dentro do documento:

| Métrica | Descrição Pedagógica | Faixa de Normalidade esperada |
| :--- | :--- | :--- |
| ⏱️ **Tempo de Foco Ativo** | Tempo que o aluno passou ativamente digitando ou editando o texto. | Proporcional ao tamanho e complexidade da proposta. |
| ⌨️ **Ritmo de Escrita (CPM)** | Caracteres por Minuto. Mede o fluxo de escrita do aluno. | **100 a 300 CPM**: Digitação natural.<br>**> 500 CPM**: Velocidade sobre-humana (possível colagem em massa). |
| 📋 **Eventos de Colagem** | Registro de inserções de grandes blocos de texto externos. | Baixo ou nulo em produções autorais puras; alto em casos de cópia direta. |

### 🔒 Segurança, Privacidade e Ética (LGPD/GDPR)
Como o Whitebox lida com a privacidade dos alunos?
- **Consentimento**: O rastreamento só ocorre quando o aluno abre o painel lateral voluntariamente.
- **Isolamento**: O sistema não rastreia abas externas do navegador, histórico de busca ou outros arquivos pessoais do aluno.
- **Destino dos Dados**: As métricas são gravadas de forma segura em uma planilha controlada exclusivamente pela escola e pelo professor.
- **Apenas Desktop**: Funciona somente no Google Docs via navegadores para computador (não compatível com celulares ou tablets).

**Recursos de Apoio**:
- 🔗 [Google Doc de Demonstração (Ativado)](https://docs.google.com/document/d/12XWtB6UawhTpWmm3dReb2gSJu7ErVcpV3p67d2vrgeI/edit) — *Link real para o template configurado com o Whitebox para testes*
- 📊 [Planilha de Heatmap (Modelo)](https://docs.google.com/spreadsheets/d/exemplo-heatmap-modelo/edit) — *Exemplo ilustrativo de painel do professor*

---

## Material 1.3 — Fluxo Completo do Trabalho

**Título**: Como o Whitebox funciona na prática? A jornada do documento

Para que a avaliação do processo ocorra sem problemas, o documento passa por cinco etapas simples. Veja o fluxo visual do Whitebox:

```
┌──────────────────────────────────────┐
│  1. Admin gera o Documento Modelo    │
└──────────────────┬───────────────────┘
                   ▼
┌──────────────────────────────────────┐
│  2. Professor cria Atividade no      │
│     Classroom (Fazer cópia p/ cada)  │
└──────────────────┬───────────────────┘
                   ▼
┌──────────────────────────────────────┐
│  3. Aluno abre o Doc no computador,  │
│     ativa o painel e escreve o texto │
└──────────────────┬───────────────────┘
                   ▼
┌──────────────────────────────────────┐
│  4. Professor abre o Doc entregue e  │
│     vê métricas e alertas de escrita │
└──────────────────┬───────────────────┘
                   ▼
┌──────────────────────────────────────┐
│  5. Feedback Pedagógico humanizado   │
│     apoiado em dados transparentes   │
└──────────────────────────────────────┘
```

### 📋 Passo a Passo Detalhado
1. **Preparação**: O administrador de tecnologia da escola cria e configura um **Documento Modelo** (template) que contém o código do Whitebox.
2. **Distribuição**: O professor anexa este Documento Modelo em uma atividade do Google Classroom, marcando obrigatoriamente a opção **"Fazer uma cópia para cada aluno"**.
3. **Escrita**: O aluno abre seu documento individualizado, abre o painel (menu *Extensões > Whitebox > Abrir Painel*) e redige o texto com o painel aberto.
4. **Análise**: Ao receber a tarefa, o professor abre o próprio documento do aluno. O painel lateral carrega as métricas do processo de escrita e indica o nível de consistência do trabalho.
5. **Orientação**: Se houver anomalias (como colagem massiva de texto ou CPM excessivo), o professor realiza uma conversa pedagógica para entender a dificuldade do aluno e orientar seu aprendizado.

**Recursos de Apoio**:
- 🔗 [Guia Completo de Implementação para Professores](https://docs.google.com/document/d/...) — *Link para o arquivo Teacher.md*
- 🔗 [Guia de Orientação para Alunos](https://docs.google.com/document/d/...) — *Link para o arquivo Student.md*

