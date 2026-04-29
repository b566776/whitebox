# Visão Geral do Projeto: Whitebox

## Resumo Executivo
O **Whitebox** (anteriormente WhiteBox) é uma solução de auditoria pedagógica baseada em Inteligência Artificial, construída nativamente no ecossistema do Google Workspace. Ele permite que professores apliquem atividades de redação e documentação no Google Docs com um nível avançado de transparência, rastreando o comportamento de digitação dos alunos, eventos de cópia e cola, tempo de foco e emitindo um relatório automatizado ("Radar de Esforço" / "Mapa de Calor") via Gemini 1.5 Flash.

## Estrutura do Repositório (Multi-part)
A aplicação é dividida em dois grandes módulos interconectados via APIs seguras:

1. **whitebox-client** (Add-on do Google Docs)
   - Contém a interface do aluno e do professor (`Sidebar.html`).
   - Coleta métricas nativamente pelo Apps Script (`Código.gs`).
   - Requer autenticação com o servidor usando um `SHARED_TOKEN`.

2. **whitebox-server** (Brain Proxy & Admin)
   - Atua como um proxy de segurança isolando as chaves de API da IA através da estratégia de **Cofre no Drive**.
   - Fornece um painel administrativo (`Dashboard.html`) para gerenciamento de professores, turmas, integração com Google Classroom e geração de **Levas de Onboarding**.
   - Gerencia o **Onboarding Autônomo** via Google Forms com validação em tempo real de permissões de arquivo.
   - Registra todos os logs em uma Planilha Global (Google Sheets) via `AdminSetup.gs`.

## Arquitetura e Segurança
- **Plataforma:** Google Apps Script (GAS)
- **Segurança de Dados (Cofre no Drive):** Professores não fornecem chaves de API diretamente ao sistema; eles compartilham um arquivo de texto no seu próprio Drive. O sistema acessa a chave apenas em tempo de execução, garantindo soberania total ao docente.
- **Onboarding:** Fluxo automatizado via Google Forms que valida chaves, provisiona bancos de dados e notifica usuários sem intervenção humana.
- **Modo Offline:** Suporte nativo para operação sem IA caso chaves não sejam fornecidas ou autorizadas.
- **Frontend:** HTML/JS/CSS puros (Vanilla), com Tailwind/Google Fonts e interface estilo Glassmorphism.
- **Backend:** Roteamento via `doGet` e `doPost` no `BrainProxy.gs` (Standalone Script).
- **Banco de Dados:** Google Sheets (gerenciado via SpreadsheetApp).
- **Integrações:** Google Classroom API, Google Drive API, Gemini API (Generative Language API), Google Forms API.

## Stack Tecnológico
| Categoria | Tecnologia | Justificativa |
|---|---|---|
| Linguagem | JavaScript / Google Apps Script (V8) | Integração nativa com o ecossistema Google Workspace |
| Frontend | HTML5 / CSS3 / JS Vanilla | Leveza para rodar dentro do Sidebar do Google Docs |
| IA / LLM | Gemini 1.5 Flash | Análise socrática e auditoria comportamental de baixo custo e alta velocidade |
| Persistência | Google Sheets | Fácil acesso para professores e auditoria em tempo real |
| Auth | SHARED_TOKEN | Mecanismo de pre-shared key (PSK) para comunicação Server-to-Client |
