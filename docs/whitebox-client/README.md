# Whitebox Client - Visão Geral Técnica

O Whitebox Client é um Add-on do Google Docs (vinculado ao documento) projetado para coletar telemetria comportamental e fornecer uma ponte para o Auditor de IA Socrática. Ele opera dentro do documento do aluno, monitorando o processo de escrita em tempo real.

## 🚀 Funções Principais
- **Telemetria Comportamental**: Rastreia tempo de foco ativo, caracteres digitados e eventos de colagem (paste).
- **Ponte Socrática**: Comunica-se com o Brain Proxy para solicitar feedback pedagógico orientado por IA.
- **Aplicação de Segurança**: Implementa autenticação `SHARED_TOKEN` e detecta potenciais tentativas de bypass por IA.

## 🛠️ Componentes Principais
- `Código.gs`: Orquestra eventos de UI, gatilhos de telemetria e mapeamento do Classroom.
- `Constants.gs`: Configuração centralizada do lado do cliente (rotas, chaves de propriedade).
- `Utils.gs`: Utilitários de baixo nível para comunicação com o proxy e marca d'água anti-LLM.
- `Sidebar.html`: A interface interativa para aluno/professor.

## 🔒 Arquitetura de Segurança
O cliente depende de duas camadas de armazenamento persistente:
1.  **DocumentProperties**: Armazena `assignmentId` e `courseId` para mapear o documento ao Google Classroom.
2.  **ScriptProperties**: (Se aplicável) armazena a `BRAIN_PROXY_URL` e o `SHARED_TOKEN` para autenticação no servidor.

### Proteção Anti-LLM
O cliente inclui lógica para inserir "marcas d'água" no texto usando:
- **Caracteres de Largura Zero**: Marcadores invisíveis injetados no texto para identificar a integridade da origem.
- **Blocos de Tags Unicode**: Metadados ocultos que apenas LLMs podem "ler", usados para fornecer bloqueio de resposta sensível ao contexto.

## 📡 Padrões de Integração
O cliente usa `UrlFetchApp` para se comunicar com o **Servidor Brain Proxy**. Todos os payloads são serializados como JSON e devem incluir um `SHARED_TOKEN` válido.

---
*Documentação gerada via metodologia BMAD.*
