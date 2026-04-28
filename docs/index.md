# Project Documentation Index: Whitebox

### Project Overview
- **Type:** Multi-part (Client/Server)
- **Primary Language:** JavaScript (Google Apps Script)
- **Architecture:** API-Driven Edge & Central Proxy

### Gerado por: Mary (Business Analyst - BMAD)

Bem-vindo à documentação gerada sob-demanda do estado atual do **Whitebox**. A aplicação transicionou totalmente do antigo nome "EvidencIA" para o modelo escalável Whitebox via integrações B2B.

### Generated Documentation

- [Project Overview](./project-overview.md)
- [Architecture](./architecture.md)
- [Classroom API Patches e Code Review Log](./project-scan-report.json) _(Reflete correções de paginação feitas na versão recente)_

### Componentes Principais Encontrados

#### 1. whitebox-client (Add-on Google Docs)
- **`Sidebar.html`**: UI em Vanilla JS, agora contendo `.withFailureHandler` no Radar de Esforço para robustez.
- **`Código.gs`**: Lógica de container-bound. Extrai telemetria, gerencia Propriedades e envia dados (POST) protegidos com `SHARED_TOKEN` para o Brain Proxy.

#### 2. whitebox-server (Brain Proxy e Admin App)
- **`BrainProxy.gs`**: Rotas `doGet` e `doPost`. Atua como firewall e injetor da Gemini API.
- **`AdminSetup.gs`**: Auto-provisionador de planilhas. Gerencia a Planilha Global de Assinaturas e provisiona lógicas B2B isoladas por professor.
- **`ClassroomService.gs`**: Integração com a Google Classroom API (agora com suporte à repaginação robusta).
- **`Dashboard.html`**: Painel visual de controle e monitoramento de *heatmaps* (com botões protegidos contra "duplo clique").

### Próximos Passos (Recomendações da Análise de Negócios)
1. **Monitorar o Limite do PropertiesService:** Atualmente há limite de cotas do Google (9KB) para persistir o `PENDING_QUIZ`. Para crescimento em B2C e grandes textos, é recomendado planejar a offload dessas sessões para Firebase ou Cache interno.
2. **Expandir Analytics:** As variáveis gravadas via `ClassroomService.gs` e os Heatmaps já oferecem base excelente. A adoção de Data Studio/Looker Studio em cima do `Admin_Spreadsheet_ID` geraria alto valor comercial.
