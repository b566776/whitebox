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
2. O payload é enviado via requisição `POST` para a rota pública do `BrainProxy`.
3. O `BrainProxy.gs` autentica a requisição e resolve a **Chave API**:
   - Tenta ler do **Cofre no Drive** do professor (ID do arquivo via `DriveApp`).
   - Se falhar ou estiver vazio, tenta a **Chave Global**.
   - Se ambas falharem, opera em **Modo Offline**.
4. O Gemini 1.5 Flash realiza a análise Socrática.
5. O resultado é registrado na Planilha do Professor e retornado para a Aura no cliente.

### 2. Distribuição Mestre e Classroom (Server → Google API)
Quando o Admin/Professor atua no Dashboard:
1. `Dashboard.html` faz chamadas RPC (`google.script.run`) para `ClassroomService.gs` e `AdminSetup.gs`.
2. A integração `publishToClassroom` aciona a Google Classroom API para clonar o "Doc Semente" e distribuí-lo aos alunos da turma selecionada (`courseStates: ['ACTIVE']`).
3. O rastreio entre Turma, Tarefa (Assignment) e Documento do Aluno é feito via `findAssignmentIdByDocId` que faz fallback iterativo nas submissões usando curso e usuário logado.

### 3. Onboarding Autônomo por Levas (Dashboard → Form → Server)
1. O Admin gera uma "Leva" no Dashboard, especificando nome e deadline.
2. O sistema clona um **Formulário Semente**, configura triggers de submissão e um gatilho temporal para fechamento automático.
3. O professor submete o formulário com seu link de Cofre (Drive).
4. O `FormOnboarding.gs` valida a permissão de acesso ao arquivo.
5. Se aprovado, o professor é inserido na Planilha Global e seu banco individual é provisionado.

## Modelagem de Dados
O banco de dados é "NoSQL" virtualizado em Google Sheets:

### 1. Planilha Global Admin
Contém 3 abas principais:
- **Assinaturas**: `Email`, `Instituicao`, `Status`, `UsaChaveGlobal`, `ChaveIndividual` (ID do arquivo no Drive), `SpreadsheetId`.
- **Tarefas_Globais**: `ID_Tarefa`, `Professor`, `Instituicao`, `Titulo`, `Course_ID`, `Data_Criacao`.
- **Config**: Chaves-valor (`seed_document_id`, `seed_form_id`, `gemini_global_key`).

### 2. Planilha do Professor (Individual)
Criada dinamicamente pelo AdminSetup.
- **Config_Pedagogica**: Autonomia da IA por turma/tarefa (`Course_ID`, `Assignment_ID`, `Instrucoes_IA`, `Nivel_Rigor_IA`).
- **Logs**: Onde cada linha representa a submissão de um aluno (Telemetria, Score de Risco, IA Mode).
- **Dashboard_Professor**: Visualização agregada de rankings e turmas.

## Segurança e Governança (GRC)
- **Soberania da Chave:** A estratégia de Cofre no Drive garante que o segredo (API Key) permaneça sob posse exclusiva do professor, podendo ser revogada via permissões do Google Drive.
- **Isolamento de Dados:** Cada professor possui uma planilha de logs dedicada, isolando dados de diferentes turmas e instituições.
- **Tratamento de Permissões:** O sistema audita permissões de arquivo durante o onboarding e fornece feedback imediato via e-mail automático.

## Segurança e Tratamento de Edge Cases
- **Tokenização:** `SHARED_TOKEN` gerado dinamicamente no Auto-Provisionamento. O frontend usa o token em memória e só executa as ações privilegiadas passando a validação em `validateAdminAccess()`.
- **Prevenção Duplo-Clique:** Interface (`Dashboard.html`) bloqueia botões durante requests de rede via `google.script.run`.
- **Tratamentos de Falha na UI:** Chamadas como `getDocumentAuraMap` possuem fallback com `.withFailureHandler` para evitar bloqueios de loaders eternos na view.
- **Paginação em APIs Google:** As requisições para `Classroom.Courses.list` implementam loops `do...while` com `nextPageToken` para cobrir professores com vasto número de turmas/alunos.
