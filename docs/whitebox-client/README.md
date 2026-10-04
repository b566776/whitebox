# Whitebox Client - Visão Geral Técnica

O Whitebox Client é um Add-on do Google Docs (vinculado ao documento) projetado para coletar telemetria comportamental e fornecer uma ponte para o Auditor de IA Socrática. Ele opera dentro do documento do aluno, monitorando o processo de escrita em tempo real.

## 🚀 Funções Principais
- **Wrapper Imortal**: Atua como um ponto de entrada persistente nos documentos que consome a lógica central de uma **Biblioteca**. A versão da biblioteca fica fixada no manifesto de cada cópia; documentos já distribuídos não recebem versões novas.
- **Dynamic Dispatcher**: Encaminha chamadas de UI e telemetria para a `WhiteboxLib` sem expor a lógica de negócio localmente.
- **Auto-Configuração**: Descobre o professor designado pelo NamedRange `WHITEBOX_CONFIG` gravado pelo servidor no documento, e usa a URL do servidor fixa no código da biblioteca (`BRAIN_PROXY_URL`).

## 🛠️ Componentes Principais
- `Código.gs`: Implementa o roteamento dinâmico para a biblioteca central.
- `appsscript.json`: Define a dependência da `WhiteboxLib` e as permissões necessárias. Seus `oauthScopes` valem também para o código da biblioteca e devem ser idênticos aos de `whitebox-lib/appsscript.json`.
- `WhiteboxLib` (Externo): Contém todo o motor de telemetria, UI (Sidebar) e utilitários.

## 🔒 Arquitetura de Segurança
O cliente depende de duas camadas de armazenamento persistente:
1.  **DocumentProperties**: Armazena `assignmentId` e `courseId` para mapear o documento ao Google Classroom.
2.  **Constante `BRAIN_PROXY_URL`** (na biblioteca): endereço do servidor. Não vem de propriedades, que qualquer usuário poderia alterar. Nenhum segredo é guardado no cliente.

O papel exibido (`teacher`/`student`) é calculado em `getContext` e serve apenas para escolher a interface. Como o aluno é dono da cópia e do script vinculado, a autorização real é feita no servidor (ver [architecture.md](../architecture.md), seção 5.4).

### Proteção Anti-LLM
O cliente inclui lógica para inserir "marcas d'água" no texto usando:
- **Caracteres de Largura Zero**: Marcadores invisíveis injetados no texto para identificar a integridade da origem.
- **Blocos de Tags Unicode**: Metadados ocultos que apenas LLMs podem "ler", usados para fornecer bloqueio de resposta sensível ao contexto.

## 📡 Padrões de Integração
O cliente usa `UrlFetchApp` para se comunicar com o **Servidor Brain Proxy**. Todos os payloads são serializados como JSON e incluem o `oauthToken` do usuário, que o servidor valida junto ao Google.

---
*Documentação gerada via metodologia BMAD.*
