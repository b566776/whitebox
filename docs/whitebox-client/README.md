# Whitebox Client - Visão Geral Técnica

O Whitebox Client é um Add-on do Google Docs (vinculado ao documento) projetado para coletar telemetria comportamental e fornecer uma ponte para o Auditor de IA Socrática. Ele opera dentro do documento do aluno, monitorando o processo de escrita em tempo real.

## 🚀 Funções Principais
- **Wrapper Imortal**: Atua como um ponto de entrada persistente nos documentos que consome a lógica central de uma **Biblioteca**.
- **Dynamic Dispatcher**: Encaminha chamadas de UI e telemetria para a `WhiteboxLib` sem expor a lógica de negócio localmente.
- **Auto-Configuração**: Descobre a URL do servidor e o Token via `DeveloperMetadata` injetado pelo servidor.

## 🛠️ Componentes Principais
- `Código.gs`: Implementa o roteamento dinâmico para a biblioteca central.
- `appsscript.json`: Define a dependência da `WhiteboxLib` e as permissões necessárias.
- `WhiteboxLib` (Externo): Contém todo o motor de telemetria, UI (Sidebar) e utilitários.

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
