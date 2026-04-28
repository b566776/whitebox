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
- [Guia de Operação (Admin, Professor, Aluno)](./user-guides.md)
- [Classroom API Patches e Code Review Log](./project-scan-report.json) _(Reflete correções de paginação feitas na versão recente)_

### Componentes Principais Encontrados

#### 1. whitebox-client (Add-on Google Docs)
- **`Sidebar.html`**: UI em Vanilla JS, agora contendo `.withFailureHandler` no Radar de Esforço para robustez.
- **`Código.gs`**: Lógica de container-bound. Extrai telemetria, gerencia Propriedades e envia dados (POST) protegidos com `SHARED_TOKEN` para o Brain Proxy.

#### 2. whitebox-server (Brain Proxy e Admin App)
- **`BrainProxy.gs`**: Rotas `doGet` e `doPost`. Agora implementa a lógica de **Cofre no Drive** (Alternativa 2) para resolução segura de chaves API sem armazenamento em texto plano.
- **`AdminSetup.gs`**: Auto-provisionador de planilhas. Gerencia a Planilha Global de Assinaturas e provisiona lógicas B2B isoladas por professor.
- **`ClassroomService.gs`**: Integração com a Google Classroom API (com suporte à repaginação robusta).
- **`FormOnboarding.gs`**: NOVO! Gerenciador de formulários por levas (cohorts) com automação de cadastros e validação de chaves.
- **`Dashboard.html`**: Painel visual de controle, monitoramento de *heatmaps* e agora **Gerador de Levas de Onboarding**.

### Próximos Passos (Recomendações da Análise de Negócios)
1. **Monitorar o Limite do PropertiesService:** Atualmente há limite de cotas do Google (9KB) para persistir o `PENDING_QUIZ`. Para crescimento em B2C e grandes textos, é recomendado planejar a offload dessas sessões para Firebase ou Cache interno.
2. **Expandir Analytics:** As variáveis gravadas via `ClassroomService.gs` e os Heatmaps já oferecem base excelente. A adoção de Data Studio/Looker Studio em cima do `Admin_Spreadsheet_ID` geraria alto valor comercial.
