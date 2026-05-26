# Whitebox Client - Guia Administrativo

Este documento é destinado a administradores de TI e desenvolvedores que gerenciam a implantação do Add-on Whitebox Client.

## ⚙️ Propriedades de Configuração
O comportamento do ecossistema é governado por uma hierarquia de configurações:

### 1. Auto-Configuração (DeveloperMetadata) [NOVO]
O servidor agora injeta automaticamente a configuração no documento durante a distribuição. O Add-on tenta ler estes dados primeiro:
- `WHITEBOX_CONFIG`: JSON contendo `proxyUrl` e `sharedToken`.

### 2. Script Properties (Globais do Cliente)
Usadas como fallback se os metadados estiverem ausentes:
- `BRAIN_PROXY_URL`: A URL do Web App `whitebox-server` implantado.
- `SHARED_TOKEN`: O segredo de autenticação compartilhado.

### 3. Vínculo de Biblioteca (whitebox-lib)
O cliente (`whitebox-client`) deve estar vinculado à biblioteca central:
- **Script ID**: O identificador único da `WhiteboxLib` (extraído da URL de implantação).
- **Identificador**: Deve ser obrigatoriamente **`WhiteboxLib`**.

## 🚀 Checklist de Implantação
1.  **Deploy da Lib**: Realize o push da `whitebox-lib` e crie uma versão de implantação.
2.  **Vínculo do Cliente**: No `whitebox-client`, adicione a biblioteca usando o Script ID e o identificador correto.
3.  **Configuração do Servidor**: Garanta que a `BRAIN_PROXY_URL` está configurada nas Script Properties do servidor para permitir a injeção correta de metadados.

## 🔍 Solução de Problemas
- **Erros de Rede**: Use o console do desenvolvedor do navegador para verificar chamadas `UrlFetch` que falharam para o proxy.
- **Permissão Negada**: Certifique-se de que os alunos autorizaram o Add-on a rodar em seu domínio.
- **Falhas de Sincronização**: Verifique os logs do servidor (Brain Proxy) para erros `UNAUTHORIZED`, que indicam uma incompatibilidade de `SHARED_TOKEN`.
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
