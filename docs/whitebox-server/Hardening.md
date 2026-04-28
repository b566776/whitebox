# Whitebox Server - Auditoria de Hardening & Segurança

Este documento detalha as camadas de segurança e os patches de robustez implementados para proteger a infraestrutura Whitebox.

## 🛡️ Hardening de API & Autenticação
- **`validateAdminAccess`**: Todas as funções administrativas (licenciamento, seeding, distribuição) são protegidas por uma verificação obrigatória de `SHARED_TOKEN`. Tentativas não autorizadas disparam um erro 401.
- **Handshake do Cliente**: O Painel Admin captura o token na primeira sessão bem-sucedida e impõe seu uso para todas as operações subsequentes que alteram o estado do sistema.

## 🧵 Proteção de Concorrência & Condição de Corrida
- **`LockService`**: Implementação de travas (locks) em nível de script nas rotas `doGet` (provisionamento) e `onProfessorFormSubmit` (onboarding). Isso evita a corrupção de dados ou a criação de recursos duplicados durante requisições simultâneas.
- **Operações Atômicas**: Garantia de que o registro do professor e a criação da planilha sejam tratados como blocos atômicos para manter a integridade do banco de dados.

## 🏗️ Robustez & Integridade do Sistema
- **Gestão de Esquema**: O módulo `SchemaManager.gs` realiza a validação de cabeçalhos antes de cada leitura/escrita, garantindo que edições manuais nas planilhas não quebrem o sistema.
- **Inicialização Segura**: A lógica de provisionamento agora reutiliza planilhas e estruturas existentes, permitindo re-implantações seguras ou reinicializações do servidor.
- **Parsing de JSON Robusto**: Implementação de multi-estratégia para extração de JSON para lidar com respostas do Gemini que podem conter formatação Markdown ou texto adicional.

## 📡 Limite de Taxa (Rate Limiting) & Gestão de Cotas
- **Emulação de Token Bucket**: O sistema limita as requisições de análise por aluno/hora usando `CacheService` para evitar o esgotamento da cota da API Gemini.
- **Validação de E-mail**: Validação estrita baseada em regex para todas as entradas de e-mail para evitar injeção ou corrupção de planilhas.

---
*Documentação gerada via metodologia BMAD.*
