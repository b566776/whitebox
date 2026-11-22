# Manual do desenvolvedor do Whitebox

Este manual é para quem mantém o Whitebox: a conta dona dos scripts (hoje `j.marcelo.miranda@gmail.com`). Essa conta usa o editor do Apps Script, o `clasp` e a página **WHITEBOX ADMIN**. Ela **nunca** faz o papel de professor ou de aluno. Os manuais dos outros papéis estão em [manual-professor.md](manual-professor.md) e [manual-aluno.md](manual-aluno.md).

Os nomes em **negrito** são os rótulos exatos da tela (títulos, cards, abas, botões e campos).

Use **um perfil de navegador para cada conta** (desenvolvedor, professor de teste `b566776@gmail.com`, aluno de teste `a566776@gmail.com`). Com duas contas logadas no mesmo perfil, o Google Forms e o Apps Script usam a primeira, e o cadastro sai com o e-mail errado.

---

## 1. As três peças

| Peça | Pasta no repositório | Script ID | O que faz |
| :--- | :--- | :--- | :--- |
| Servidor | `whitebox-server` | `1UzE7vx3UH3MQjvsVcKuIQajLBGYC-kbzTp4is14DLSQ-ff-J6rqQF5cR` | Web App que recebe as chamadas do painel, chama a IA, grava os logs e serve a página **WHITEBOX ADMIN**. |
| Biblioteca | `whitebox-lib` | `1I-W1uY1EjP6i0cyKF-nfXcLC989yUIKirmmAb44aPbVFLkwMR8uz5Yt8` | `WhiteboxLib`: o painel lateral do documento e a lógica do cliente. |
| Cliente | `whitebox-client` | `1bH0c1Qb6rtfGGhMGqWlB1iJXIN9OKQaLLh17VgR58XQyz5B7Dy0bOYKW` | Script vinculado ao documento modelo; só repassa para a biblioteca. |

O documento modelo (Doc Semente) é `1tkjZZ7B3dWsLjgxUBuBF5Y--K9w0T4MkqWQ88naiEDs`.

## 2. Onde as coisas ficam no Drive

Tudo que o Whitebox cria fica no Drive do desenvolvedor, dentro da pasta **WhiteBox** na raiz do **Meu Drive**:

```
Meu Drive/
└── WhiteBox/
    ├── Whitebox - Painel Global Admin        (planilha global, ADMIN_SPREADSHEET_ID)
    ├── Whitebox - <email do professor>       (planilha de logs de cada professor)
    ├── Whitebox - Onboarding: <leva>         (formulários de cadastro)
    ├── Whitebox - Modelo Mestre (<email>)    (documento mestre de cada professor)
    ├── Whitebox - Documento Modelo           (Doc Semente)
    ├── templates/                            (modelos que o admin oferece aos professores)
    ├── Distribucoes/<email>/                 (cópias de templates enviadas a cada professor)
    └── Scripts/
        ├── whitebox-server
        └── whitebox-lib
```

- O cliente não aparece em `Scripts`: ele é vinculado ao documento modelo e não é um arquivo à parte.
- O Whitebox não cria nada no Drive do professor nem no do aluno. O que o professor recebe (documento mestre, templates) nasce aqui e é compartilhado com ele. As cópias dos alunos são criadas pelo Google Classroom, na pasta do Classroom de cada turma.
- A planilha de logs do professor **não** é compartilhada com ele. Ele vê os dados pelo painel.

**Migração (uma vez).** Arquivos criados antes dessa organização ficavam em `GDrive Meus Documentos/Projetos/whitebox` e soltos pelo Drive. Para movê-los:

1. Abra o [editor do servidor](https://script.google.com/d/1UzE7vx3UH3MQjvsVcKuIQajLBGYC-kbzTp4is14DLSQ-ff-J6rqQF5cR/edit).
2. Em `AdminSetup.gs`, escolha **organizarPastasWhitebox** na lista de funções e clique em **Executar**.
3. Confira em **Execuções** o log "Migração concluída. Movidos (…)".

A função não apaga nada (pastas antigas vazias ficam onde estão), pode ser repetida sem efeito e também atualiza o texto de ajuda dos formulários de onboarding já criados.

## 3. Provisionar o servidor (uma vez por servidor)

Se a URL do Web App responder "❌ Acesso Negado: Whitebox não provisionado", o servidor ainda não tem planilha global vinculada.

1. No editor do servidor, em `AdminSetup.gs`, execute **resetPlanilhaGlobal** e aceite as permissões. Ela cria "Whitebox - Painel Global Admin" em `WhiteBox/`, grava `ADMIN_SPREADSHEET_ID` e aplica o schema. Não use só `setupPlanilhaGlobal()`: ela cria a planilha mas não a vincula.
2. Execute **rotacionarSharedToken**. Ela gera o token que a página **WHITEBOX ADMIN** pede.
3. Em **Configurações do projeto** (engrenagem) > **Propriedades do script**, copie o valor de `SHARED_TOKEN`.
4. Para IA global (opcional), configure as propriedades descritas em "Configurar a IA" de [whitebox-server/DEPLOY.md](../whitebox-server/DEPLOY.md).

## 4. A página WHITEBOX ADMIN

1. Abra a URL do Web App: https://script.google.com/macros/s/AKfycbzRiSQpiKHH4DG1Ts5Jyx7DdbX7rLJmyPRPQEmqg4JGVFOVwpn_WaAIsE0kqvhie1GJiA/exec. O título da página é **WHITEBOX ADMIN**.
2. Na janela **"Por favor, insira o SHARED_TOKEN:"**, cole o token. O topo passa a mostrar **Servidor Autenticado | Token: …**. O navegador guarda o token neste perfil.

Cards da página:

- **⚙️ Configurações Globais**: campo **Google Doc ID (Semente)**. Cole o ID do documento modelo e clique em **💾 Salvar** ("ID do Semente salvo com sucesso!").
- **🚀 Gerar Onboarding de Professores**: cria o formulário de cadastro de uma leva (veja a seção 5).
- **Professores & Licenças B2B**: a lista de professores. O botão **Distribuir Template** cria o documento mestre do professor (seção 6).
- **Inteligência & Mapas de Calor**: visões **Visão Institucional**, **Visão Total Professor**, **Por Turma** e **Por Aluno**. Em **Por Aluno**, digite o e-mail em **E-mail do aluno** e clique em **Ver aluno**.
- **Integração Google Classroom**.
- **🚨 Zona de Perigo**: regenera a planilha global. Apaga o vínculo com a atual; use só em ambiente de teste.

## 5. Cadastrar professores

Só e-mails na aba `Assinaturas` da planilha global, com `Status` = `Ativo`, têm o papel de professor. Alunos não têm cadastro: eles entram pela turma do Classroom do professor.

**Pelo formulário (recomendado)**

1. No card **🚀 Gerar Onboarding de Professores**, preencha **Nome da Leva** e **Data Limite (Expiração do Link)** e clique em **🔗 Gerar Link de Inscrição Segura**. O formulário "Whitebox - Onboarding: <leva>" é criado em `WhiteBox/` e fecha sozinho na data limite.
2. Envie o link ao professor. **Não abra o link no seu perfil**: o servidor registra o e-mail de quem responde.
3. Quando o professor envia, o servidor grava a linha em `Assinaturas` (`Ativo`), cria a planilha "Whitebox - <email>" em `WhiteBox/` e manda ao professor o e-mail "✅ Cadastro Aprovado - Whitebox".

A pergunta **Link do arquivo de Cofre (Google Drive)** é opcional e explica ao professor como enviar a chave de IA dele: um arquivo **.txt** com a chave (Gemini `AIza…` ou Claude `sk-ant-…`), compartilhado como Leitor com a sua conta ou com "Qualquer pessoa com o link". Se ficar em branco, o cadastro entra **sem IA** (`UsaChaveGlobal` = `Não`) e o professor pode colar a chave depois no painel. Se o link não puder ser lido, o professor recebe "❌ Erro de Cadastro - Permissão do Cofre Drive (Whitebox)" e o cadastro não é feito.

Se você mudar o texto dessa ajuda em `Constants.gs` (`FORM_HELP_LINK_COFRE`), os formulários já criados não mudam sozinhos: execute **atualizarAjudaFormulariosOnboarding** no editor do servidor.

**Pelo editor**

Execute `adicionarProfessor('email', 'Escola', false)`. A planilha de logs só é criada quando o professor clicar em **💾 Salvar Chave API** no painel. Até lá, a telemetria dos alunos dele é recusada.

**Pela planilha**

Na aba `Assinaturas`, uma linha com `Email`, `Instituicao`, `Status` = `Ativo`, `UsaChaveGlobal` (`Sim`/`Não`) e `ChaveIndividual`.

**Revogar**: mude o `Status` para `Inativo`. O professor perde o relatório da turma e a análise de IA; os alunos continuam vendo os próprios dados.

**Liberar a IA global para um professor**: `UsaChaveGlobal` = `Sim`, se o servidor tiver `IA_GLOBAL_KEY` configurada.

## 6. Documento mestre do professor

No card **Professores & Licenças B2B**, clique em **Distribuir Template** na linha do professor. O servidor copia o Doc Semente para "Whitebox - Modelo Mestre (<email>)" em `WhiteBox/`, grava nele a designação do professor e o compartilha com ele (tenta passar a propriedade; entre contas Gmail isso falha e ele vira editor). O professor recebe "📦 Seu Sistema Whitebox está pronto!".

## 7. Publicar mudanças

Antes de publicar, rode os testes locais:

```powershell
node --test whitebox-server/tests/*.test.js whitebox-lib/tests/*.test.js
```

No editor do servidor, `runAllTests()` (em `TestRunner.gs`) deve terminar sem falhas.

**Servidor.** Atualize a implantação existente, para a URL não mudar:

```powershell
cd whitebox-server; clasp push -f; clasp create-deployment -i AKfycbzRiSQpiKHH4DG1Ts5Jyx7DdbX7rLJmyPRPQEmqg4JGVFOVwpn_WaAIsE0kqvhie1GJiA -d "descrição"
```

O Web App executa **como o proprietário**, com acesso **"Qualquer pessoa"**. A URL precisa ser a mesma da constante `BRAIN_PROXY_URL` em `whitebox-lib/Constants.gs`.

**Biblioteca.** `clasp push -f` em `whitebox-lib` e crie uma nova versão (**Implantar** > **Gerenciar versões** no editor, ou `clasp create-version`). A biblioteca precisa estar compartilhada como **Leitor** ("Qualquer pessoa com o link: Leitor"), nunca como Editor; sem isso o painel não abre para ninguém.

**Cliente.** Só muda quando a biblioteca muda de versão: no editor do documento modelo, em **Bibliotecas**, aponte `WhiteboxLib` para a nova versão. Documentos já distribuídos levam o cliente da época em que foram copiados.

## 8. Onde olhar quando algo falha

- **Painel não abre para professor ou aluno**: a biblioteca não está compartilhada como Leitor, ou o cliente aponta para uma versão que não existe.
- **`UNAUTHORIZED` / `PROXY_INVALID_RESPONSE`**: abra a página **WHITEBOX ADMIN** e autorize de novo; confira o acesso "Qualquer pessoa" do Web App.
- **Professor cai na visão de aluno, ou `PROFESSOR_NAO_CADASTRADO` / `PROFESSOR_INATIVO`**: confira o e-mail e o `Status` em `Assinaturas`.
- **`SpreadsheetId` vazio depois do formulário**: confira se está olhando a planilha certa (ID igual a `ADMIN_SPREADSHEET_ID` em **Propriedades do script**). Se sim, procure o erro de `onProfessorFormSubmit` em **Execuções**; o professor pode clicar em **💾 Salvar Chave API** para criar a planilha.
- **Seu próprio e-mail aparece como professor**: o formulário foi respondido no seu perfil. Apague a linha de `Assinaturas` e a planilha "Whitebox - <seu email>" e peça ao professor que responda de novo no perfil dele.
- **Turma `SEM_TURMA` na telemetria**: esperado quando o escopo `drive.file` não cobre o documento (`item3.driveAccess: false` no log de `getContext`).
- **Erro "ID do Documento Semente não configurado"**: preencha **Google Doc ID (Semente)** em **⚙️ Configurações Globais**.
- **Logs**: em **Execuções**, no editor do servidor e no da biblioteca.
