# Whitebox Server - Brain Proxy & Administração

O Whitebox Server é um Web App autônomo do Google Apps Script que serve como o "cérebro" e o gateway seguro para todo o ecossistema Whitebox. Ele gerencia a telemetria dos alunos, as requisições de IA pedagógica e as operações administrativas.

## 🏗️ Papel Arquitetural
O servidor atua como uma camada intermediária entre o **Whitebox Client** e os serviços externos (provedor de IA configurável — Gemini, Claude ou Ollama — e Google Classroom).
- **Proxy Seguro**: Protege as chaves de API e os prompts sensíveis de serem expostos no lado do cliente.
- **Persistência de Dados**: Gerencia a partição dos logs dos alunos em planilhas específicas dos professores.
- **Designação do Professor [ARCH-LIB]**: Durante a distribuição de templates e criação de tarefas, o servidor grava o professor designado no documento (NamedRange **`WHITEBOX_CONFIG`**), para que o cliente o reconheça nas cópias dos alunos. Requer o escopo `documents` no manifesto do servidor.
- **Hub de Integração**: Orquestra a gestão de cursos do Classroom e a distribuição automatizada de recursos.

## 📡 Rotas Principais de API (`doPost`)
- `/analisar`: Lida com a análise socrática de IA de fragmentos de escrita.
- `/logar_metricas`: Persiste a telemetria comportamental no sistema de logs descentralizado.
- `/status_licenca`: Valida o status ativo do professor e a disponibilidade do modo IA.
- `/registrar_chave`: Permite que professores já cadastrados registrem suas chaves de API privadas, do Gemini ou do Claude (não cria cadastro).

## 🔑 Segurança & Proteção
- **OAuth do usuário**: Cada requisição do cliente traz o OAuth token de quem chama; o servidor o valida junto ao Google e usa o e-mail verificado.
- **Papéis validados no servidor**: Rotas de professor exigem cadastro `Ativo` na aba `Assinaturas`; alunos só enviam telemetria.
- **SHARED_TOKEN**: Credencial exclusiva do Admin (Dashboard e rotas administrativas). Nunca vai para o cliente.
- **Rate Limiting**: Evita o abuso das cotas de API limitando as requisições de análise por aluno/hora.
- **Concurrency Locks**: Usa o `LockService` para evitar condições de corrida durante o auto-provisionamento.
- **Chaves Hierárquicas**: Resolve as chaves de API com preferência para o "Cofre do Drive" do professor antes de recorrer às chaves globais.

## 📊 Painel Administrativo
O servidor fornece um painel HTML integrado para:
- Gestão de licenciamento e status dos professores.
- Visualização de mapas de calor (heatmaps) de esforço e integridade dos alunos.
- Criação automatizada de "Formulários de Onboarding" para novas turmas de professores.

---
*Documentação gerada via metodologia BMAD.*
