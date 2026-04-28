# Esquema de Dados - Camada de Persistência Whitebox

O Whitebox usa o Google Sheets como seu banco de dados relacional primário. Os dados são particionados em uma única **Planilha Admin Global** e múltiplas **Planilhas de Log de Professores Individuais**.

## 1. Planilha Admin Global
Gerencia todo o ecossistema, licenciamento e registro global de tarefas.

### 1.1. Aba: `Assinaturas` (Professores)
| Coluna | Descrição |
| :--- | :--- |
| **Email** | Identificador único (PK) para o professor. |
| **Instituicao** | Nome da escola ou organização. |
| **Status** | `Ativo` ou `Inativo`. |
| **UsaChaveGlobal** | `Sim` se autorizado a usar a chave Gemini global do servidor. |
| **ChaveIndividual** | Link/ID do "Cofre" no Google Drive. |
| **SpreadsheetId** | ID da planilha de log dedicada para este professor. |
| **DataCadastro** | Timestamp ISO 8601 do registro. |

### 1.2. Aba: `Tarefas_Globais` (Auditoria Classroom)
| Coluna | Descrição |
| :--- | :--- |
| **ID_Tarefa** | ID da tarefa no Classroom. |
| **Professor** | Email do proprietário. |
| **Instituicao** | Nome da escola. |
| **Titulo** | Nome da atividade. |
| **Course_ID** | ID do curso no Classroom. |
| **Data_Criacao** | Timestamp. |

---

## 2. Planilha Individual do Professor
Armazena dados sensíveis dos alunos e configurações locais.

### 2.1. Aba: `Logs` (Telemetria)
| Coluna | Descrição |
| :--- | :--- |
| **Timestamp** | Hora do evento. |
| **Turma** | ID do curso no Classroom. |
| **DocId** | ID do Google Doc do aluno. |
| **Email_Aluno** | Identificador do aluno. |
| **Palavras** | Contagem total de palavras. |
| **Tempo_Ativo_Min** | Minutos gastos editando ativamente. |
| **Colar_Eventos** | Contagem de acionadores de colagem (paste). |
| **RiscoScore** | Risco calculado de 0-100. |
| **Entrega_Final** | `Sim` se o log corresponde à entrega final. |

### 2.2. Aba: `Config_Pedagogica`
| Coluna | Descrição |
| :--- | :--- |
| **Course_ID** | Link para classe específica do Classroom. |
| **Assignment_ID** | Link para atividade específica. |
| **Instrucoes_IA** | Instruções de prompt personalizadas (ex: "Foco em fatos históricos"). |
| **Nivel_Rigor_IA** | `Baixo`, `Médio` ou `Alto`. |

---

## 3. Gestão de Esquema
O módulo `SchemaManager.gs` garante a consistência:
- **Versionamento**: A aba `Config` na Planilha Global rastreia a `VersaoSchema`.
- **Migrações**: Lógica automatizada para adicionar colunas ausentes sem perder dados existentes.
- **Validação**: Os cabeçalhos são resolvidos por nome (`indexOf`) em vez de índices fixos para evitar a corrupção de dados quando as colunas são reordenadas.
