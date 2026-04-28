# Whitebox Server – Guia do Administrador

Objetivo
- Descrever as operações administrativas do Whitebox Server: provisionamento automático, gestão da Planilha Global, controle de acessos e observabilidade.

Pré-requisitos
- Acesso a Google Apps Script/Google Drive com permissões para criar e editar planilhas.
- Acesso ao Web App do BrainProxy publicado como App da Web, executando como você e com acesso público.
- Variáveis de configuração disponíveis via Script Properties: SHARED_TOKEN, ADMIN_SPREADSHEET_ID, GEMINI_GLOBAL_KEY (opcional).

Arquitetura (Resumo)
- Brain Proxy (Servidor) lê configurações via Script Properties.
- Admin Setup.gs cria a Planilha Global (Admin) com abas: Assinaturas, Escolas, Config.
- A Planilha Global armazena informações de professores, escolas e parâmetros globais.

Fluxo de Provisionamento
- Acessar o Brain Proxy Web App; se ADMIN_SPREADSHEET_ID não existir, o Brain Proxy aciona setupPlanilhaGlobal() do AdminSetup.gs.
- O script cria a Planilha Global e retorna URL/id para uso.
- Token de segurança (SHARED_TOKEN) é gerado se não existir e salvo nas propriedades do Script.

Operações Principais (exemplos)
- Adicionar professor: adicionarProfessor(email, escola, usaChaveGlobal)
- Alterar status de professor: alterarStatusProfessor(email, novoStatus)
- Configurar chave global do professor: configurarChaveGlobal(email, usar)
- Salvar seed de documento: salvarSeedId(id)
- Distribuir modelo mestre para professor: distribuirMestreParaProfessor(email)

Guia de Segurança
- O Brain Proxy contém lógica sensível e não deve ser compartilhado publicamente.
- Token compartilhado (SHARED_TOKEN) valida chamadas entre Client e Brain Proxy.
- A Planilha Global armazena dados sensíveis de professores; proteja o acesso.

Boas práticas
- Faça provisionamento inicial apenas em ambiente de staging antes de produção.
- Acompanhe logs do Script para detectar falhas de configuração.

Problemas comuns (faça check-list)
- ADMIN_SPREADSHEET_ID não definido: verifique as propriedades do script do Brain Proxy.
- SHARED_TOKEN ausente: valide a geração/armazenamento do token durante o first-run.
- Falha no acesso à Planilha Global: verifique permissões e IDs corretos.

Walkthrough — Whitebox Hardening Patch

Resumo das mudanças implementadas recentemente para aumentar a segurança, concorrência e robustez do Whitebox Server.

- 🛡️ Security Hardening (BrainProxy.gs & Dashboard.html)
- Admin API Protection: Implemented validateAdminAccess(token) logic. Functions like getAdminUIData, salvarSeedId, and distribuirMestreParaProfessor now require a valid SHARED_TOKEN passed from the frontend.
- Unauthorized Guard: If a user attempts to call these functions without the token (e.g., via console bypass), the server throws a 401 UNAUTHORIZED error.
- Client Handshake: The Admin Dashboard now captures the token upon the first successful call. If authentication fails, it prompts the administrator to provide the token.
- 🧵 Concurrency Protection (BrainProxy.gs)
- Provisioning Lock: Added LockService to the doGet route. This prevents "race conditions" where multiple simultaneous visits to the initial Web App URL could spawn multiple duplicate admin spreadsheets.
- 🏗️ System Robustness (AdminSetup.gs & BrainProxy.gs)
- Safe Initialization: setupPlanilhaGlobal now intelligently reuses existing sheets instead of failing if they already exist.
- Input Validation: Added checks for spreadsheet header integrity in getAdminUIData.
- Error Transparency: Distribution failures (e.g., missing Seed Doc or Mail quota issues) are now caught and reported with specific error messages instead of failing silently or providing false success indicators.

- Next Steps for the User
- Verificar funcionamento dos novos mecanismos: token, concorrência e robustez.
- Testar chamadas com/sem token para confirmar 401 quando token ausente.
- Testar a concorrência ao acessar a URL do Web App simultaneamente.
- Verificar reutilização de planilhas existentes ao inicializar.
- Testar cenários de falha de distribuição e mensagens de erro detalhadas.
- Adaptar a integração frontend (Dashboard) para inserir/retirar tokens apropriadamente.

- Observações
- Este patch foca em hardening do servidor; o Client continua dependendo do handshake com o Brain Proxy e do token de autorização.
