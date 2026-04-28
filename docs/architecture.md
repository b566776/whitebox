# Arquitetura Técnica: Whitebox

## Padrão Arquitetural
A arquitetura do Whitebox baseia-se em um modelo **Client-Server com Proxy Reverso Centralizado** adaptado para o ambiente do Google Apps Script. 

- O **Cliente** (Container-bound Script no Google Docs) funciona como um agente de borda (Edge Agent), coletando telemetria de edição, gerindo a UI interativa (Sidebar) e formatando o payload.
- O **Servidor** (Standalone Script) funciona como um "Brain Proxy", centralizando a inteligência de negócios (prompts), o acesso a recursos externos (Gemini API) e a persistência de dados (Google Sheets) para contornar limitações de segurança e acesso do lado do cliente.

## Fluxo de Integração (Integration Architecture)
Existem dois fluxos principais de comunicação entre os sistemas:

### 1. Auditoria e Telemetria (Client → Server)
Quando o aluno finaliza o trabalho:
1. `whitebox-client` agrupa o Documento (texto) e a Telemetria (Cpm, Tempo Ativo, Colagens).
2. O payload é enviado via requisição `POST` (`UrlFetchApp.fetch`) para a rota pública do `BrainProxy`.
3. O payload inclui o `SHARED_TOKEN` configurado no cliente.
4. O `BrainProxy.gs` autentica a requisição (`doPost`).
5. O `BrainProxy.gs` solicita ao Gemini 1.5 Flash a análise Socrática passando o payload + Configuração Pedagógica do professor.
6. A resposta do Gemini é registrada na Planilha Google (Log do Professor).
7. O `BrainProxy` retorna o resultado e a nota (Heatmap) para o cliente renderizar a Aura.

### 2. Distribuição Mestre e Classroom (Server → Google API)
Quando o Admin/Professor atua no Dashboard:
1. `Dashboard.html` faz chamadas RPC (`google.script.run`) para `ClassroomService.gs` e `AdminSetup.gs`.
2. A integração `publishToClassroom` aciona a Google Classroom API para clonar o "Doc Semente" e distribuí-lo aos alunos da turma selecionada (`courseStates: ['ACTIVE']`).
3. O rastreio entre Turma, Tarefa (Assignment) e Documento do Aluno é feito via `findAssignmentIdByDocId` que faz fallback iterativo nas submissões usando curso e usuário logado.

## Modelagem de Dados
O banco de dados é "NoSQL" virtualizado em Google Sheets:

### 1. Planilha Global Admin
Contém 3 abas principais:
- **Assinaturas**: `Email`, `Instituicao`, `Status`, `UsaChaveGlobal`, `ChaveIndividual`, `SpreadsheetId`.
- **Tarefas_Globais**: `ID_Tarefa`, `Professor`, `Instituicao`, `Titulo`, `Course_ID`, `Data_Criacao`.
- **Config**: Chaves-valor (`seed_document_id`, `gemini_model`, `versao_addon`).

### 2. Planilha do Professor (Individual)
Criada dinamicamente pelo AdminSetup.
- **Config_Pedagogica**: Autonomia da IA por turma/tarefa (`Course_ID`, `Assignment_ID`, `Instrucoes_IA`, `Nivel_Rigor_IA`).
- **Logs**: Onde cada linha representa a submissão de um aluno (Telemetria, Score de Risco, IA Mode).
- **Dashboard_Professor**: Visualização agregada de rankings e turmas.

## Segurança e Tratamento de Edge Cases
- **Tokenização:** `SHARED_TOKEN` gerado dinamicamente no Auto-Provisionamento. O frontend usa o token em memória e só executa as ações privilegiadas passando a validação em `validateAdminAccess()`.
- **Prevenção Duplo-Clique:** Interface (`Dashboard.html`) bloqueia botões durante requests de rede via `google.script.run`.
- **Tratamentos de Falha na UI:** Chamadas como `getDocumentAuraMap` possuem fallback com `.withFailureHandler` para evitar bloqueios de loaders eternos na view.
- **Paginação em APIs Google:** As requisições para `Classroom.Courses.list` implementam loops `do...while` com `nextPageToken` para cobrir professores com vasto número de turmas/alunos.
