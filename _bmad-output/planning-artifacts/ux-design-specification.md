---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
inputDocuments:
  - _bmad-output/planning-artifacts/prd.md
  - _bmad-output/planning-artifacts/epics.md
  - _bmad-output/planning-artifacts/stories.md
  - docs/architecture.md
  - docs/data-schema.md
  - docs/api-contracts.md
  - whitebox-client/Código.gs
  - whitebox-client/Sidebar.html
---

# UX Design Specification — Whitebox
### Módulo: Distribuição de Doc Templates

**Autor:** Marcelo  
**Data:** 2026-05-02  
**Escopo:** Interface 1 — Admin → Professores | Interface 2 — Professor → Turmas/Alunos

---

## 1. CONTEXTO E VISÃO

### 1.1 Problema a Resolver

O Whitebox atualmente possui um fluxo de criação de "Levas" que é operado pelo Professor a partir de um documento mestre. Porém, **não existe** uma interface que permita:

1. **Admin → Professor**: O Admin distribuir um Doc Template (modelo de documento mestre) para os professores cadastrados, garantindo consistência institucional.
2. **Professor → Turma/Aluno**: O Professor, a partir de um template recebido ou próprio, distribuir cópias individualizadas para cada aluno de uma ou mais turmas via Google Classroom.

### 1.2 Usuários

| Papel | Quem É | Contexto de Uso |
|-------|--------|-----------------|
| **Admin** | Coordenador pedagógico / TI | Admin Dashboard (Google Sheets + Script) |
| **Professor** | Docente | Sidebar do Add-on no Google Docs |
| **Aluno** | Estudante | Google Docs (receptor da cópia) |

### 1.3 Princípios de Design

- **Clareza Hierárquica**: Cada papel deve ver apenas o que é relevante para ele
- **Fluxo Progressivo**: Ações complexas divididas em etapas com feedback em cada passo
- **Segurança Visível**: Confirmações explícitas antes de ações irreversíveis
- **Feedback de Estado**: Progresso sempre visível (loading, sucesso, erro)
- **Integração Natural**: Aproveitar o ecossistema Google (Drive, Classroom) sem sair do fluxo

---

## 2. INTERFACE 1 — ADMIN: DISTRIBUIÇÃO DE TEMPLATE PARA PROFESSORES

### 2.1 Onde Vive

**Localização**: Google Apps Script Web App (Admin Dashboard) ou aba dedicada no Google Sheets do Admin.  
**Trigger**: Botão "Distribuir Template" no menu Whitebox do Google Sheets Admin, ou item de menu no Admin Dashboard HTML.

### 2.2 Fluxo de Usuário (User Journey)

```
Admin abre Admin Dashboard
        ↓
Navega para aba "Templates"
        ↓
┌─────────────────────────────────────┐
│  PAINEL DE TEMPLATES               │
│  [+ Novo Template]  [Ver Histórico]│
│                                    │
│  Templates Disponíveis:            │
│  📄 Modelo_Redação_2026.docx      │
│  📄 Modelo_Seminário_ABNT.docx    │
│  📄 Template_Pesquisa_Básica.docx │
└─────────────────────────────────────┘
        ↓
Admin clica em [+ Novo Template]
        ↓
MODAL: Upload / Selecionar do Drive
        ↓
Admin configura: Nome, Disciplina, Turmas-alvo
        ↓
Admin seleciona Professores destinatários
        ↓
[Revisar e Distribuir]
        ↓
CONFIRMAÇÃO: "Distribuir para N professores?"
        ↓
Execução: Cópia no Drive de cada professor + Email
        ↓
Relatório de distribuição (sucesso/falha por professor)
```

### 2.3 Wireframe — Tela Principal (Admin Templates)

```
╔══════════════════════════════════════════════════════════════════╗
║  🧠 Whitebox Admin Dashboard                    [Sair] [Ajuda]  ║
╠══════════════════════════════════════════════════════════════════╣
║  [📊 Visão Geral] [👩‍🏫 Professores] [📄 Templates] [📈 Relatórios]  ║
╠══════════════════════════════════════════════════════════════════╣
║                                                                  ║
║  📄 GESTÃO DE TEMPLATES                                          ║
║  ─────────────────────────────────────────────────              ║
║  Templates prontos para distribuição pedagógica                  ║
║                                                                  ║
║  [🔵 + Novo Template]              [🔍 Buscar template...]       ║
║                                                                  ║
║  ┌────────────────────────────────────────────────────────────┐  ║
║  │ NOME                    │ DISCIPLINA │ DIST. │ DATA       │  ║
║  ├─────────────────────────┼────────────┼───────┼────────────┤  ║
║  │ 📄 Redação Dissertativa  │ Português  │  12   │ 28/04/2026 │  ║
║  │    [👁 Ver] [📤 Distribuir] [✏ Editar] [🗑 Excluir]        │  ║
║  ├─────────────────────────┼────────────┼───────┼────────────┤  ║
║  │ 📄 Pesquisa Bibliográfica│ Geral      │   8   │ 15/04/2026 │  ║
║  │    [👁 Ver] [📤 Distribuir] [✏ Editar] [🗑 Excluir]        │  ║
║  └────────────────────────────────────────────────────────────┘  ║
║                                                                  ║
╚══════════════════════════════════════════════════════════════════╝
```

### 2.4 Wireframe — Modal de Nova Distribuição

```
╔══════════════════════════════════════════════╗
║  📤 DISTRIBUIR TEMPLATE                    ✕ ║
╠══════════════════════════════════════════════╣
║                                              ║
║  PASSO 1 de 3: SELECIONAR TEMPLATE           ║
║  ●──────────────────────────                 ║
║                                              ║
║  Template:  [Redação Dissertativa      ▼]    ║
║  Prévia:    📄 Redação_Dissertativa.gdoc     ║
║             "Orientações gerais, seções..."  ║
║             [👁 Abrir no Drive]              ║
║                                              ║
║  OU  [📁 Selecionar outro do Drive]          ║
║  OU  [⬆ Fazer upload de arquivo]            ║
║                                              ║
║                        [Cancelar] [Próximo →]║
╚══════════════════════════════════════════════╝

╔══════════════════════════════════════════════╗
║  📤 DISTRIBUIR TEMPLATE                    ✕ ║
╠══════════════════════════════════════════════╣
║                                              ║
║  PASSO 2 de 3: SELECIONAR DESTINATÁRIOS      ║
║  ──●────────────────────                     ║
║                                              ║
║  Filtrar por: [Todas as disciplinas ▼]       ║
║                                              ║
║  ☑ Selecionar todos (12 professores)         ║
║  ┌──────────────────────────────────────┐    ║
║  │ ☑ Ana Silva — Português              │    ║
║  │ ☑ Bruno Costa — História             │    ║
║  │ ☐ Carla Mendes — Matemática          │    ║
║  │ ☑ Diego Ferraz — Ciências            │    ║
║  │ ...                                  │    ║
║  └──────────────────────────────────────┘    ║
║  9 professores selecionados                  ║
║                                              ║
║  [← Voltar]                [Próximo →]       ║
╚══════════════════════════════════════════════╝

╔══════════════════════════════════════════════╗
║  📤 DISTRIBUIR TEMPLATE                    ✕ ║
╠══════════════════════════════════════════════╣
║                                              ║
║  PASSO 3 de 3: CONFIRMAR E ENVIAR            ║
║  ────────────●                               ║
║                                              ║
║  Resumo da Distribuição:                     ║
║  • Template: Redação Dissertativa            ║
║  • Destinatários: 9 professores              ║
║  • Ação: Copiar no Drive de cada professor   ║
║                                              ║
║  Mensagem Personalizada (opcional):          ║
║  ┌──────────────────────────────────────┐    ║
║  │ Olá! Seguem as orientações para...   │    ║
║  └──────────────────────────────────────┘    ║
║                                              ║
║  ☑ Notificar por e-mail                      ║
║  ☑ Registrar no histórico                    ║
║                                              ║
║  [← Voltar]    [🔵 Confirmar Distribuição]   ║
╚══════════════════════════════════════════════╝
```

### 2.5 Wireframe — Resultado da Distribuição

```
╔══════════════════════════════════════════════╗
║  ✅ DISTRIBUIÇÃO CONCLUÍDA                 ✕ ║
╠══════════════════════════════════════════════╣
║                                              ║
║  Template "Redação Dissertativa" distribuído ║
║                                              ║
║  ✅ 8 professores receberam com sucesso      ║
║  ⚠  1 professor com falha (sem Drive ativo) ║
║                                              ║
║  ┌──────────────────────────────────────┐    ║
║  │ ✅ Ana Silva — Link criado            │    ║
║  │ ✅ Bruno Costa — Link criado          │    ║
║  │ ⚠  Carla Mendes — Drive inacessível  │    ║
║  │    [🔁 Tentar novamente]              │    ║
║  └──────────────────────────────────────┘    ║
║                                              ║
║  [📋 Copiar Relatório]   [Fechar]            ║
╚══════════════════════════════════════════════╝
```

### 2.6 Lógica de Backend — Rotas Necessárias

| Rota | Método | Descrição |
|------|--------|-----------|
| `listar_templates` | GET | Retorna templates disponíveis no Drive Admin |
| `distribuir_template` | POST | Copia template no Drive de cada professor |
| `historico_distribuicao` | GET | Log de distribuições anteriores |

**Payload de distribuição:**
```json
{
  "templateId": "1abc...xyz",
  "destinatarios": ["prof1@escola.edu", "prof2@escola.edu"],
  "mensagem": "Olá! Segue o template...",
  "notificarEmail": true
}
```

**Ação no Drive:**
1. Para cada professor: `DriveApp.getFileById(templateId).makeCopy(nomePasta, pastaDestino)`
2. Compartilhar o arquivo com o professor (editor ou leitor, conforme configuração)
3. Registrar na aba `HistoricoTemplates` da planilha Admin

---

## 3. INTERFACE 2 — PROFESSOR: DISTRIBUIÇÃO DE TEMPLATE PARA TURMAS/ALUNOS

### 3.1 Onde Vive

**Localização**: Sidebar do Add-on Whitebox no Google Docs (novo ícone/aba "📤 Distribuir").  
**Contexto**: Professor tem aberto o Doc Template (recebido do Admin ou próprio). Quer criar cópias para alunos.

### 3.2 Fluxo de Usuário (User Journey)

```
Professor abre Template no Google Docs
        ↓
Abre Sidebar Whitebox
        ↓
Vê aba "📤 Distribuir" (visível apenas para professores)
        ↓
┌───────────────────────────────────┐
│ Este documento é um template      │
│ [📤 Criar Levas para Turmas]      │
└───────────────────────────────────┘
        ↓
Seleciona Turma(s) do Classroom
        ↓
Configura opções (prazo, instruções)
        ↓
[Distribuir]
        ↓
Cópias criadas via Google Classroom
        ↓
Confirmação com links individuais
```

### 3.3 Wireframe — Sidebar do Professor (Aba Distribuir)

```
╔══════════════════════════╗
║  🧠 Whitebox             ║
╠══════════════════════════╣
║ [📊 Painel] [📤 Distribuir] [⚙️]║
╠══════════════════════════╣
║                          ║
║  📄 DOC ATUAL            ║
║  ─────────────────────── ║
║  "Modelo Redação 2026"   ║
║  Tipo: Template          ║
║  Criado por: Admin       ║
║                          ║
║  ─────────────────────── ║
║  📤 CRIAR LEVAS          ║
║                          ║
║  Turma:                  ║
║  [🔽 Selecionar turma  ] ║
║                          ║
║  Título da Atividade:    ║
║  [Redação Dissertativa ] ║
║                          ║
║  Prazo:                  ║
║  [📅 30/05/2026        ] ║
║                          ║
║  Instruções (opcional):  ║
║  [                     ] ║
║  [                     ] ║
║                          ║
║  ─────────────────────── ║
║  [+ Adicionar turma]     ║
║                          ║
║  TURMAS SELECIONADAS:    ║
║  • 9º Ano A (28 alunos) ║
║  • 9º Ano B (25 alunos) ║
║  Total: 53 alunos        ║
║                          ║
║  ─────────────────────── ║
║  [🔵 DISTRIBUIR LEVAS]   ║
╚══════════════════════════╝
```

### 3.4 Wireframe — Estado Durante Distribuição

```
╔══════════════════════════╗
║  🧠 Whitebox             ║
╠══════════════════════════╣
║                          ║
║  ⏳ DISTRIBUINDO...      ║
║                          ║
║  ████████░░░░  60%       ║
║                          ║
║  ✅ 9º Ano A: 28/28      ║
║  🔄 9º Ano B: 15/25...   ║
║                          ║
║  Não feche esta janela.  ║
║                          ║
╚══════════════════════════╝
```

### 3.5 Wireframe — Confirmação Pós-Distribuição

```
╔══════════════════════════╗
║  🧠 Whitebox             ║
╠══════════════════════════╣
║                          ║
║  ✅ LEVAS CRIADAS!       ║
║                          ║
║  53 documentos criados   ║
║  2 turmas atendidas      ║
║                          ║
║  ─────────────────────── ║
║  ACESSO RÁPIDO:          ║
║  [📊 Ver no Classroom]   ║
║  [📋 Planilha de Logs]   ║
║                          ║
║  ─────────────────────── ║
║  RESUMO:                 ║
║  • 9º Ano A: ✅ 28 docs  ║
║  • 9º Ano B: ✅ 25 docs  ║
║                          ║
║  [🔁 Nova Distribuição]  ║
╚══════════════════════════╝
```

### 3.6 Wireframe — Seletor de Turmas (Dropdown Expandido)

```
╔══════════════════════════╗
║  SELECIONAR TURMAS       ║
╠══════════════════════════╣
║  [🔍 Buscar turma...]    ║
║  ─────────────────────── ║
║  ☑ 9º Ano A — 28 alunos ║
║  ☑ 9º Ano B — 25 alunos ║
║  ☐ 8º Ano A — 30 alunos ║
║  ☐ 8º Ano B — 27 alunos ║
║  ☐ 7º Ano A — 31 alunos ║
║  ─────────────────────── ║
║  [Confirmar (2 turmas)]  ║
╚══════════════════════════╝
```

### 3.7 Lógica de Backend — Rotas Necessárias

| Rota | Método | Descrição |
|------|--------|-----------|
| `listar_turmas_professor` | GET | Retorna turmas do professor via Classroom API |
| `criar_leva_template` | POST | Cria cópias do doc para alunos via Classroom |
| `status_distribuicao` | GET | Polling do progresso (para barra de loading) |

**Payload de criação de leva:**
```json
{
  "professorEmail": "prof@escola.edu",
  "templateDocId": "1abc...xyz",
  "turmas": ["courseId_9A", "courseId_9B"],
  "titulo": "Redação Dissertativa — Maio 2026",
  "instrucoes": "Leia as orientações na primeira página...",
  "prazo": "2026-05-30T23:59:00-03:00"
}
```

**Ação no Classroom:**
1. `Classroom.Courses.CourseWork.create()` — cria a atividade
2. Tipo `ASSIGNMENT` com `submissionModificationMode: MODIFIABLE_UNTIL_TURNED_IN`
3. Material: cópia do template por aluno (`driveFile.shareMode: STUDENT_COPY`)
4. Registrar IDs dos docs criados na planilha do professor (aba `Levas`)

---

## 4. DESIGN SYSTEM APLICADO

### 4.1 Tokens Visuais (Consistência com Sidebar Existente)

```css
/* Cores Primárias */
--wb-primary:     #6366f1;  /* Índigo — ação principal */
--wb-primary-dark:#4f46e5;  /* Hover/active */
--wb-success:     #10b981;  /* Verde — sucesso */
--wb-warning:     #f59e0b;  /* Âmbar — atenção */
--wb-danger:      #ef4444;  /* Vermelho — erro */
--wb-bg-dark:     #0f0f1a;  /* Fundo principal */
--wb-surface:     #1a1a2e;  /* Cards/painéis */
--wb-text:        #e2e8f0;  /* Texto principal */
--wb-text-muted:  #94a3b8;  /* Texto secundário */

/* Tipografia */
--wb-font: 'Inter', 'Google Sans', sans-serif;
--wb-font-size-base: 13px;  /* Sidebar tem espaço limitado */

/* Espaçamento */
--wb-space-sm: 8px;
--wb-space-md: 16px;
--wb-space-lg: 24px;

/* Bordas */
--wb-radius: 8px;
--wb-border: 1px solid rgba(255,255,255,0.08);
```

### 4.2 Componentes Reutilizáveis

| Componente | Uso |
|-----------|-----|
| `StepIndicator` | Progresso em 3 passos (Admin modal) |
| `TeacherCheckList` | Lista selecionável de professores |
| `ClassroomSelector` | Dropdown multi-select de turmas |
| `ProgressBar` | Distribuição em andamento |
| `StatusBadge` | ✅ Sucesso / ⚠ Atenção / ❌ Erro |
| `DistributionReport` | Relatório pós-distribuição |

### 4.3 Microinterações

- **Seleção de professor**: Checkbox com animação suave + contador atualizado em tempo real
- **Progresso de distribuição**: Barra de progresso por turma com contador de docs criados
- **Confirmação modal**: Shake suave ao tentar fechar sem salvar
- **Success state**: Animação de confetti ou pulso verde ao concluir

---

## 5. CASOS DE BORDA E TRATAMENTO DE ERROS

### Interface 1 (Admin)

| Situação | Comportamento |
|----------|--------------|
| Professor sem Drive configurado | ⚠ Badge "Drive inacessível" + botão "Tentar novamente" |
| Template muito grande (>50MB) | Bloquear upload, sugerir compactar |
| Zero professores selecionados | Botão "Distribuir" desabilitado + tooltip |
| Falha parcial (alguns professores) | Relatório com detalhamento + retry seletivo |
| Template já distribuído antes | Banner "Já distribuído em DD/MM" + confirmação de redistribuição |

### Interface 2 (Professor)

| Situação | Comportamento |
|----------|--------------|
| Professor sem turmas no Classroom | Mensagem "Nenhuma turma encontrada. Configure no Google Classroom." |
| Doc atual não é um template | Mensagem "Este documento já foi distribuído. Criar nova leva?" |
| Turma sem alunos | ⚠ Aviso "9º Ano C não tem alunos cadastrados" |
| Falha durante criação de cópia | Retomar da última posição + log de erro |
| Prazo no passado | Validação inline + destaque em vermelho |

---

## 6. CONSIDERAÇÕES DE SEGURANÇA

| Aspecto | Implementação |
|---------|--------------|
| **Autorização Admin** | Verificar `userEmail` na lista de Admins da planilha global antes de qualquer ação de distribuição |
| **Autorização Professor** | `getContext().initialRole === 'teacher'` — Aba "Distribuir" invisível para alunos |
| **Rate Limiting** | Máximo de 50 docs criados por execução (limite do Apps Script) — distribuições maiores rodam em batches |
| **Idempotência** | Hash do `templateId + turmaId + data` para evitar duplicação de levas |
| **Compartilhamento mínimo** | Alunos recebem cópia `STUDENT_COPY` — sem acesso ao template original |

---

## 7. ROADMAP DE IMPLEMENTAÇÃO

### Sprint 1 — Fundação
- [ ] Criar rota `listar_templates` no BrainProxy
- [ ] Criar rota `distribuir_template` (Admin → Professor)  
- [ ] Aba "Templates" no Admin Dashboard HTML
- [ ] Modal de 3 passos para distribuição Admin

### Sprint 2 — Interface Professor
- [ ] Nova aba "📤 Distribuir" na Sidebar (visível só para professor)
- [ ] Integrar `listar_turmas_professor` via Classroom API
- [ ] Criar rota `criar_leva_template` no BrainProxy
- [ ] Barra de progresso de distribuição

### Sprint 3 — Polimento
- [ ] Relatórios de distribuição (Admin e Professor)
- [ ] Tratamento de erros e retry
- [ ] Histórico de levas na planilha do professor
- [ ] Notificações por e-mail ao professor quando recebe template

---

## 8. GLOSSÁRIO

| Termo | Definição |
|-------|-----------|
| **Template** | Documento Google Docs modelo, criado pelo Admin, que serve de base para as atividades |
| **Leva** | Conjunto de cópias do template criadas para os alunos de uma turma |
| **Distribuição** | Ato de enviar o template do Admin para os Professores |
| **Provisionamento** | Processo automático de criar cópias individuais por aluno |
| **STUDENT_COPY** | Modo do Classroom onde cada aluno recebe sua própria cópia editável |
