# Manual do Desenvolvedor - Operações Whitebox

## 1. Ambiente de Desenvolvimento Local

O Whitebox é gerenciado usando `clasp` (Command Line Apps Script Projects) para permitir controle de versão e edição local.

### 1.1. Instalação
```bash
npm install -g @google/clasp
clasp login
```

### 1.2. Estrutura do Projeto
- `/whitebox-lib`: Motor central (Biblioteca). **Lógica principal aqui.**
- `/whitebox-client`: Wrapper imortal para os documentos.
- `/whitebox-server`: Web App Proxy e Gateway de IA.

---

## 2. Fluxo de Deploy

### 2.1. Server Proxy
1.  Navegue até `whitebox-server/`.
2.  `clasp push` para sincronizar o código.
3.  Implantar como **Web App**.

### 2.2. Whitebox Lib (Central)
1.  Navegue até `whitebox-lib/`.
2.  `clasp push`.
3.  No console do Apps Script, clique em **Implantar > Nova Implantação > Biblioteca**.
4.  Anote o **Script ID** para o cliente.

### 2.3. Client Wrapper
1.  Navegue até `whitebox-client/`.
2.  No `appsscript.json`, verifique se o ID da biblioteca está correto e se `version` aponta para a versão que você acabou de criar (ver 2.4).
3.  `clasp push`.
4.  **Auto-Config**: o professor designado vem do NamedRange `WHITEBOX_CONFIG` gravado pelo servidor no documento; a URL do proxy é a constante `BRAIN_PROXY_URL` em `whitebox-lib/Constants.gs` (se criar uma nova implantação do Web App, atualize-a e publique uma nova versão da biblioteca).

### 2.4. Versão da Biblioteca (o que chega aos usuários)
O manifesto do cliente fixa a versão da biblioteca, e ele é copiado junto com cada documento.
- `developmentMode: true` entrega o código mais recente (HEAD) **somente** a quem tem acesso de edição à biblioteca. Professores e alunos recebem a versão do campo `version`.
- Para publicar uma mudança: `clasp push` na lib → criar uma versão (`clasp version "descrição"` ou **Implantar > Gerenciar implantações**) → atualizar `version` no manifesto do cliente → `clasp push` no cliente → redistribuir o documento modelo.
- Documentos já distribuídos **não** mudam de versão. Mantenha o servidor compatível com as versões da biblioteca ainda em uso.
- Recomendado para o documento modelo: `developmentMode: false`, para que você teste exatamente o que os alunos vão executar.

### 2.5. Manifestos e Escopos
| Projeto | Regra |
| :--- | :--- |
| **Cliente** | O `oauthScopes` daqui é o que o usuário autoriza e o que entra no OAuth token enviado ao servidor. Com escopos explícitos, os da biblioteca **não** são somados automaticamente. |
| **Biblioteca** | Mantenha a lista **idêntica** à do cliente. Ao usar um serviço novo no código da lib, adicione o escopo nos dois manifestos. |
| **Servidor** | Lista própria; roda como o Admin. Inclui `documents` para `DocumentApp.openById`. |

- Os escopos `classroom.*` estão no cliente porque o servidor chama a Classroom API **como o professor**, usando o token que o add-on envia. O serviço avançado `Classroom` fica habilitado no cliente para que a API esteja ativa no projeto Cloud que emite esse token.
- O manifesto é o mesmo para todos: o aluno também vê as permissões do Classroom na tela de autorização.
- `MailApp` exige `script.send_mail` (não `gmail.send`).
- O serviço avançado `Drive` usa a mesma versão (v3) no cliente e na biblioteca.
- Drive: o escopo é `drive.file` (não sensível). **Nunca** use um escopo restrito do Drive (leitura ou acesso total a todo o Drive) nos manifestos do cliente e da biblioteca: eles exigem a avaliação de segurança CASA para publicar no Marketplace e levantam a tela de "app não verificado" em domínios Workspace gerenciados. Os escopos `classroom.*` e `script.send_mail` são *sensíveis*: não exigem CASA, mas ainda passam pela verificação OAuth do Google.
- Com `drive.file`, toda chamada ao Drive na biblioteca fica em `try/catch` e `getAdvancedItem3Data()` devolve `driveAccess` (`true` só quando arquivo, pasta e revisões foram lidos; `false` = alguma dessas chamadas falhou neste documento: pasta da turma, dono da pasta e revisões indisponíveis; a telemetria registra `SEM_TURMA`). O valor aparece no log de `getContext` (`item3.driveAccess`). O papel de professor não depende do Drive: professor cadastrado em documento **sem** `WHITEBOX_CONFIG` é tratado como professor.
- Deploy da troca de escopo: remova o escopo antigo de leitura do Drive (Drive readonly) da tela de consentimento OAuth e do Marketplace SDK no projeto Cloud, crie uma nova versão da biblioteca e atualize `version` no cliente. **Gate pós-deploy**: abra uma cópia de aluno e confirme `item3.driveAccess: true` no log do Apps Script antes de liberar para as turmas; se vier `false`, o nome da turma precisa vir da distribuição (trabalho adiado em `deferred-work.md`: gravar a turma no `WHITEBOX_CONFIG`). Reautorizar não faz `drive.file` cobrir um arquivo que ele não cobre.
- Os três manifestos usam `America/Sao_Paulo`.
- Mudou escopos? Os usuários precisam autorizar de novo ao abrir o documento.

---

## 3. Procedimentos de Teste

### 3.1. Test Runner Automatizado
O Whitebox inclui um framework de testes customizado e leve em `TestRunner.gs`.
- **Execução**: Execute a função `runAllTests()` a partir da IDE do Apps Script.
- **Cobertura**: Inclui validação de e-mail, parsing de JSON, lógica de limite de taxa (rate limit) e integridade de esquema.
- **Biblioteca fora do Apps Script** (Node 20+): `node --test whitebox-lib/tests/context.test.js` carrega `Constants.gs`, `Utils.gs` e `Logic.gs` com stubs dos serviços Google e cobre papel (`getContext`), `driveAccess`, telemetria sem Drive, o aviso da Sidebar e os manifestos. A pasta `tests/` fica fora do `clasp push` (`.claspignore`).
- **Cliente fora do Apps Script**: `node --test whitebox-client/tests/abertura-automatica.test.js` cobre a criação do gatilho de abertura automática e a checagem de quem abriu o documento.

### 3.2. Testes de Fumaça Manuais
1.  **Auto-Provisionamento**: Visite a URL do Web App do servidor pela primeira vez (*); ele deve criar a Planilha Admin Global e mostrar o token.

(*) Se for solicitado um token vá nas Configurações do Script server; No menu lateral esquerdo, clique no ícone de engrenagem (Configurações do Projeto). Desça até a seção Propriedades do Script. Localize a propriedade chamada SHARED_TOKEN. O valor ao lado dela é o token que você deve inserir na tela.

2.  **Sincronização de Telemetria**: Abra um Doc com Whitebox ativado, digite algum texto e verifique se uma nova linha aparece na planilha de log do professor.
3.  **Análise de IA**: Use o botão de análise da barra lateral e verifique a resposta socrática.
4.  **Acesso ao Drive**: o aviso "Sem acesso ao Drive deste documento" aparece no painel do professor quando `item3.driveAccess` é `false` (log de `getContext`); com `true`, não aparece e a turma vem com o nome da pasta.

---

## 4. Manutenção

### 4.1. Migrações de Esquema
Se você adicionar uma nova coluna a qualquer planilha do banco de dados:
1.  Incremente `SCHEMA_VERSION_ATUAL` em `Constants.gs`.
2.  Adicione uma função de migração em `SchemaManager.gs`.
3.  Execute `executarMigracoes(token)` a partir do Painel Admin.

### 4.2. Rotação de Log & Cache
- O sistema usa `CacheService` para tarefas do Classroom (TTL de 6h).
- `LockService` é usado durante o provisionamento para evitar condições de corrida.
