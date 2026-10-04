# Whitebox Client - Guia Administrativo

Este documento é destinado a administradores de TI e desenvolvedores que gerenciam a implantação do Add-on Whitebox Client.

## ⚙️ Propriedades de Configuração
O comportamento do ecossistema é governado por uma hierarquia de configurações:

### 1. Auto-Configuração (NamedRange `WHITEBOX_CONFIG`)
Durante a distribuição, o servidor grava no documento o professor designado:
- `WHITEBOX_CONFIG:{"professorEmail":"..."}` — nome de um NamedRange preso ao primeiro elemento do corpo. Faz parte do conteúdo, então acompanha as cópias feitas pelo Classroom. Não é segredo: qualquer script com acesso ao documento consegue ler.
- Nem a URL do proxy nem qualquer token são gravados no documento.
- Para conferir no ambiente real (gravação e sobrevivência à cópia), execute `testarInjecaoMetadados()` no editor do `whitebox-server`.

### 2. URL do Servidor (fixa na biblioteca)
A URL do proxy é a constante `BRAIN_PROXY_URL` em `whitebox-lib/Constants.gs`. Não é lida de propriedades nem do documento, e não existe mais assistente para alterá-la: como o Add-on envia o OAuth token do usuário para essa URL, ela não pode ser configurável por quem usa o documento. Para trocá-la, veja [Conexão com o Servidor](setup-conexao.md).

O cliente se autentica com o OAuth token do usuário. O `SHARED_TOKEN` fica apenas nas Script Properties do **servidor** e serve só ao Dashboard Admin; para trocá-lo, execute `rotacionarSharedToken()` no editor do `whitebox-server`.

### Provedor de IA
A IA da análise socrática é configurável nas Script Properties do **servidor**: `IA_PROVIDER` (`gemini`, `claude` ou `ollama`), `IA_MODEL`, `IA_BASE_URL` e `IA_GLOBAL_KEY`. Vale para os professores com `UsaChaveGlobal = Sim`; os demais usam a própria chave, e o formato dela define o provedor. Tabela de valores e exemplos em [DEPLOY.md](../whitebox-server/DEPLOY.md), seção "Configurar a IA".

### Papéis e Licenças
- **Professor** = e-mail na aba `Assinaturas` com `Status` = `Ativo`. O servidor confere isso a cada chamada de `analisar`, `registrar_chave`, `listar_turmas_professor` e `criar_leva_template`.
- **Não há auto-cadastro**: salvar uma chave de API na barra lateral não cria mais um professor. Cadastre pelo formulário de onboarding, por `adicionarProfessor()` ou direto na aba `Assinaturas`.
- **Revogar acesso**: mude o `Status` para `Inativo` (ou use `alterarStatusProfessor()`); as rotas de professor passam a responder `PROFESSOR_INATIVO`.
- **Alunos** só conseguem enviar telemetria (`logar_metricas`).

### 3. Vínculo de Biblioteca (whitebox-lib)
O cliente (`whitebox-client`) deve estar vinculado à biblioteca central:
- **Script ID**: O identificador único da `WhiteboxLib` (extraído da URL de implantação).
- **Identificador**: Deve ser obrigatoriamente **`WhiteboxLib`**.
- **Versão**: o manifesto do cliente fixa a versão e é copiado com cada documento. Cópias já distribuídas não recebem versões novas (ver [Manual do Desenvolvedor](development-guide.md), seção 2.4).
- **Acesso**: todos os usuários precisam de acesso de **leitura** à biblioteca; nunca de edição.

## 🚀 Checklist de Implantação
1.  **Deploy da Lib**: Realize o push da `whitebox-lib` e crie uma versão de implantação.
2.  **Vínculo do Cliente**: No `whitebox-client`, adicione a biblioteca usando o Script ID e o identificador correto, e atualize `version` para a versão criada no passo 1.
3.  **Escopos**: Confira que `oauthScopes` é idêntico em `whitebox-client` e `whitebox-lib`.

## 🔍 Solução de Problemas
- **Erros de Rede**: Use o console do desenvolvedor do navegador para verificar chamadas `UrlFetch` que falharam para o proxy.
- **Permissão Negada**: Certifique-se de que os alunos autorizaram o Add-on a rodar em seu domínio. Depois de qualquer mudança de escopos, todos precisam autorizar de novo.
- **`Classroom API retornou 403` na aba Distribuir**: o token do professor não tem os escopos `classroom.*` (documento com manifesto antigo ou autorização não refeita), ou a Classroom API não está ativa no projeto do script do documento.
- **Falhas de Sincronização**: Verifique os logs do servidor (Brain Proxy) para erros `UNAUTHORIZED` (OAuth token inválido/expirado, ou e-mail do chamador diferente do `professorEmail`).
- **Professor vê o painel de aluno ou recebe `PROFESSOR_NAO_CADASTRADO` / `PROFESSOR_INATIVO`**: confira o e-mail e o `Status` dele na aba `Assinaturas`.
- **Erro: ID do Documento Semente não configurado**: Ocorre ao tentar distribuir tarefas ou templates sem ter definido o Doc Semente no Dashboard Admin (Seção Configurações Globais).

## 📄 Distribuição de Templates para Professores
Administradores podem provisionar documentos modelo para os professores:
1.  **Pasta Central**: Coloque os arquivos Google Docs na pasta `GDrive Meus Documentos/Projetos/whitebox/templates` no Drive do Admin.
**Abrir o Dashboard Admin**: abra o app script `GDrive Meus Documentos/Projetos/whitebox/whitebox-server`, vá em 'Gerenciar Implatações' e copie a URL 'App da Web'.  
2. 🔗 Gerar Link de Inscrição Segura para que os professores preencham formulario de inscrição e sejam adicionados como usuários do sistema. **Abra a URL no navegador** para acessar o dashboard. Gere o link de 'onboarding de professores' e inscreva os professores no sistema.



3.  **Distribuição**: **Depois de inscritos** volte ate  o Dashboard Admin e em 'Professores & Licenças B2B'  distribua o template para cada professor. para enviar cópias para as pastas `whitebox/Distribucoes/[Email]` de cada professor.
4.  **Auditoria**: Todas as distribuições são registradas na aba `Assinaturas` da Planilha Global para fins de governança.

---
*Documentação gerada via metodologia BMAD.*
