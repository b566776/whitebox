# PRD - Whitebox: Sistema de Auditoria Pedagógica Autônoma

## 1. Visão & Propósito
O Whitebox é um ecossistema de auditoria de alta fidelidade para Google Docs, projetado para preencher a lacuna entre a escrita do aluno e a supervisão pedagógica. Em uma era de IA generativa, o Whitebox fornece aos professores ferramentas para verificar o "processo" de escrita, não apenas o "produto final", rastreando a telemetria comportamental e fornecendo feedback socrático assistido por IA.

## 2. Público-Alvo
- **Professores**: Buscando garantir a integridade acadêmica e fornecer feedback personalizado.
- **Instituições (B2B)**: Procurando soluções de integridade escaláveis para seu corpo discente.
- **Alunos**: Beneficiando-se de orientação socrática e expectativas claras de integridade.

## 3. Recursos Principais

### 3.1. Telemetria Comportamental (Cliente)
- **Rastreamento de Foco Ativo**: Monitoramento do tempo que o aluno passa editando ativamente o documento.
- **Análise de Eventos**: Detecção de eventos de copiar e colar, exclusões massivas e mudanças estruturais.
- **Coleta de Métricas**: Contagem de palavras, CPM (Caracteres por Minuto) e proporção de edição.

### 3.2. Auditor de IA Socrático (Servidor)
- **Feedback Pedagógico**: Usando a IA Gemini para analisar fragmentos de texto e fornecer perguntas socráticas que incentivem uma reflexão mais profunda.
- **Pontuação de Integridade**: Cálculo de um "Score de Risco" baseado em padrões comportamentais e análise de IA.
- **Chaves de API Hierárquicas**: Permitindo que os professores usem suas próprias chaves (via Cofre no Drive) ou chaves globais institucionais.

### 3.3. Segurança Anti-LLM
- **Marca d'Água**: Injeção de Caracteres de Largura Zero e Blocos de Tags Unicode no texto de quiz/prompt para identificar e bloquear respostas automatizadas de IA.

### 3.4. Integração com Google Classroom
- **Provisionamento Automatizado**: Publicação de tarefas como cópias para os alunos.
- **Vínculo de Tarefas**: Mapeamento automático de documentos de alunos para tarefas do Classroom para avaliação e logs contínuos.

### 3.5. Painel Administrativo
- **Gestão de Professores**: Licenciamento, rastreamento de status e distribuição de recursos.
- **Mapas de Calor (Heatmaps)**: Visualização de tendências de integridade e esforço nos níveis de aluno, turma e instituição.

## 4. Requisitos Técnicos
- **Runtime**: Google Apps Script (V8 Engine).
- **Comunicação**: JSON seguro sobre HTTPS via `doPost` com autenticação `SHARED_TOKEN`.
- **Persistência**: Google Sheets como camada de banco de dados relacional (Admin Global vs. Logs Individuais).
- **IA**: API Gemini (1.5 Flash recomendado).

## 5. Segurança & Privacidade
- **Token Compartilhado**: Todas as chamadas Add-on para Proxy devem ser autenticadas.
- **Criptografia**: As chaves de API são armazenadas em "Cofres" (Drive Vaults) com acesso controlado.
- **Isolamento de Dados**: Cada professor gerencia sua própria planilha de log, garantindo a segregação de dados.
