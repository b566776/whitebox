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
| Cliente | `whitebox-client` | `16k8PGCi2FqMLYJw4o1dfOclAZTOO_MkT9uqwrps7VE7mMfoMw_SJ5Oel` | Script vinculado ao documento modelo; repassa para a biblioteca e cuida da abertura automática do painel. |

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
- As planilhas de logs dos professores ficam em `WhiteBox/planilhas_dos_professores/<Instituição>` (o nome que o professor escreveu no onboarding; vazio vira `Sem instituição`) e são compartilhadas automaticamente com o professor como **Leitor** (constante `COMPARTILHAMENTO_PLANILHA_PROFESSOR` no `Constants.gs` do servidor; troque para `'editor'` se quiser). Planilhas antigas: rode `organizarPastasWhitebox()`, que move cada uma para a pasta da instituição e a compartilha.

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
- **Professores & Licenças B2B**: a lista de professores, agrupada por instituição e, dentro dela, em ordem de e-mail (a planilha global não guarda o nome do professor). O botão **Distribuir Template** cria o documento mestre do professor (seção 6).
- **Inteligência & Mapas de Calor**: visões **Visão Institucional**, **Visão Total Professor**, **Por Turma** e **Por Aluno**. Em **Por Aluno**, digite o e-mail em **E-mail do aluno** e clique em **Ver aluno**.
- **Integração Google Classroom**.
- **🚨 Zona de Perigo**: regenera a planilha global. Apaga o vínculo com a atual; use só em ambiente de teste.

## 5. Cadastrar professores

Só e-mails na aba `Assinaturas` da planilha global, com `Status` = `Ativo`, têm o papel de professor. Alunos não têm cadastro: eles entram pela turma do Classroom do professor.

**Pelo formulário (recomendado)**

1. No card **🚀 Gerar Onboarding de Professores**, preencha **Nome da Leva** e **Data Limite (Expiração do Link)** e clique em **🔗 Gerar Link de Inscrição Segura**. O formulário "Whitebox - Onboarding: <leva>" é criado em `WhiteBox/` e fecha sozinho na data limite.
2. Logo abaixo do link aparece **📧 Enviar este link por e-mail ao professor?**
   - Para enviar: digite em **E-mail do professor** um ou mais e-mails (separe por vírgula, ponto e vírgula ou espaço) e clique em **📧 Sim, enviar**. A sua conta manda a cada professor o e-mail "📝 Convite para cadastro no Whitebox - <leva>", com o link, a data limite e o aviso de abrir o link na conta Google que ele vai usar no Whitebox. O card mostra **✅ Link enviado para: …** e, se algum endereço falhar, para quem falhou.
   - Para não enviar: clique em **Não, só copiar o Link**. O link vai para a área de transferência (e continua na tela) para você mandar por outro meio.

   O envio aceita até 50 e-mails por vez, só para formulários de onboarding abertos, e é recusado se a cota diária de e-mails do Apps Script não bastar. **Não abra o link no seu perfil**: o servidor registra o e-mail de quem responde.
3. Quando o professor envia, o servidor grava a linha em `Assinaturas` (`Ativo`), cria a planilha "Whitebox - <email>" em `WhiteBox/planilhas_dos_professores/<Instituição>`, compartilha a planilha com o professor como Leitor e manda a ele o e-mail "✅ Cadastro Aprovado - Whitebox".

O formulário não pede o e-mail: ele vem da conta Google com que o professor responde (coleta "Verificada", exige login). Formulários criados antes passam a funcionar assim quando você roda `organizarPastasWhitebox()` ou `atualizarAjudaFormulariosOnboarding()`.

A pergunta **Link do arquivo de Cofre (Google Drive)** é opcional e explica ao professor como enviar a chave de IA dele: um arquivo **.txt** com a chave (Gemini `AIza…` ou `AQ.…`, ou Claude `sk-ant-…`), compartilhado como Leitor com a sua conta ou com "Qualquer pessoa com o link". Se ficar em branco, o cadastro entra **sem IA** (`UsaChaveGlobal` = `Não`) e o professor pode colar a chave depois no painel. Se o link não puder ser lido, o professor recebe "❌ Erro de Cadastro - Permissão do Cofre Drive (Whitebox)" e o cadastro não é feito.

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
node --test whitebox-server/tests/*.test.js whitebox-lib/tests/*.test.js whitebox-client/tests/*.test.js
```

No editor do servidor, `runAllTests()` (em `TestRunner.gs`) deve terminar sem falhas.

**Servidor.** Atualize a implantação existente, para a URL não mudar:

```powershell
cd whitebox-server; clasp push -f; clasp create-deployment -i AKfycbzRiSQpiKHH4DG1Ts5Jyx7DdbX7rLJmyPRPQEmqg4JGVFOVwpn_WaAIsE0kqvhie1GJiA -d "descrição"
```

O Web App executa **como o proprietário**, com acesso **"Qualquer pessoa"**. A URL precisa ser a mesma da constante `BRAIN_PROXY_URL` em `whitebox-lib/Constants.gs`.

**Biblioteca.** `clasp push -f` em `whitebox-lib` e crie uma nova versão (**Implantar** > **Gerenciar versões** no editor, ou `clasp create-version "descrição"`). Professores e alunos usam a versão fixada no cliente, não a de desenvolvimento: depois de criar a versão, aponte `WhiteboxLib` para ela no script do Documento Modelo **e** no de cada documento mestre já distribuído (**Extensões** > **Apps Script** > **Bibliotecas**). A biblioteca precisa estar compartilhada como **Leitor** ("Qualquer pessoa com o link: Leitor"), nunca como Editor; sem isso o painel não abre para ninguém.

**Cliente.** Muda quando a biblioteca muda de versão (no editor do documento modelo, em **Bibliotecas**, aponte `WhiteboxLib` para a nova versão) ou quando o próprio `Código.gs` muda. Para enviar o código, rode `clasp push` em `whitebox-client` (sem `-f`; o `.claspignore` deixa `tests/` de fora). Se o `clasp push` pedir para confirmar o manifesto, pare e confira o `appsscript.json` remoto antes: o do repositório pode apontar para uma versão antiga da biblioteca. Documentos já distribuídos levam o cliente da época em que foram copiados.

**Abertura automática do painel.** O `onOpen` simples só cria o menu: ele roda sem autorização e não pode abrir a sidebar. Quando um aluno abre o painel numa cópia distribuída, o `getContext` do cliente cria um gatilho instalável "ao abrir" em nome dele (`garantirAberturaAutomatica`, sem duplicar). O handler `abrirPainelAutomaticamente` fica no cliente, porque é o script do documento que recebe o gatilho, e só abre o painel quando quem abriu (`Session.getActiveUser`) é quem criou o gatilho (`Session.getEffectiveUser`). Assim o professor que abre a cópia do aluno não ganha o painel nem tem a escrita registrada como do aluno. Erros são engolidos, porque falha em gatilho instalável manda e-mail para o aluno. Os gatilhos ficam em **Acionadores** do script de cada cópia, em nome do aluno.

**Modelo de IA.** Sem a propriedade `IA_MODEL`, chaves individuais do Gemini usam o modelo padrão (`gemini-3.8-flash`). Quando o modelo responde 429 ou 5xx (ex.: `HTTP 503 … high demand`), o servidor repete uma vez após 1,5 s e depois tenta os modelos de reserva (Gemini: `gemini-flash-latest`, `gemini-flash-lite-latest`; Claude: `claude-sonnet-5-5`, `claude-haiku-5-5`), em no máximo ~15 s, porque a biblioteca desiste da chamada em 30 s. Se todos falharem, o professor vê "O serviço de IA está sobrecarregado no momento". Para trocar a lista de reserva, crie `IA_FALLBACK_MODELS` (separados por vírgula) em **Propriedades do script**. `IA_MODEL` continua valendo para o modelo principal. As duas valem na hora, sem publicar.

**Não abra o painel com a sua conta.** Numa cópia com professor designado (documento mestre ou cópia de aluno), a sua conta não está em `Assinaturas` e cai na visão de aluno: o cliente cria um gatilho "ao abrir" em seu nome. Para desfazer, apague `abrirPainelAutomaticamente` em https://script.google.com/home/triggers. Se quiser revogar a autorização em https://myaccount.google.com/permissions, remova só o projeto do documento, nunca o `whitebox-server`.

**Texto do modelo e linha do marcador.** A biblioteca não conta como escrita do aluno o que está acima da linha `ESCREVA O SEU TRABALHO ABAIXO DESTA LINHA` (`MARCADOR_INICIO_ALUNO`, igual no servidor e na biblioteca): Palavras Escritas, Radar de Esforço e colagens ignoram esse trecho, e no documento mestre o Radar fica vazio. O servidor acrescenta essa linha ao fim do modelo e troca a instrução antiga "selecione e apague todo este texto" sempre que grava o `WHITEBOX_CONFIG` (novo mestre, nova distribuição). Para os documentos que já existem, rode **uma vez** `atualizarTextoDosModelos()` no editor do servidor: ajusta o Documento Semente e todos os "Whitebox - Modelo Mestre". Cópias de alunos de modelos sem a linha guardam, na primeira abertura do painel pelo aluno, os parágrafos do modelo (`WHITEBOX_BASELINE`) e os descontam do mesmo jeito.

**Ordem de publicação desta versão.** (1) Servidor: `clasp push -f` e atualizar a implantação existente (rotas novas: `copiar_modelo_atividade` e `todosDocumentos` no `resumo_processo`). (2) No editor do servidor, rodar `atualizarTextoDosModelos()`, `organizarPastasWhitebox()` (planilhas na pasta da instituição e compartilhadas; formulários passam a pegar o e-mail da conta) e conferir os logs. (3) Biblioteca: nova versão. (4) Cliente (`Código.gs` mudou: abertura automática avisa a biblioteca): `clasp push` em `whitebox-client` e apontar `WhiteboxLib` para a nova versão no Documento Modelo e nos mestres já distribuídos. Cópias de alunos já criadas ficam com o cliente e a versão da biblioteca da época.

## 8. Onde olhar quando algo falha

- **Painel não abre para professor ou aluno**: a biblioteca não está compartilhada como Leitor, ou o cliente aponta para uma versão que não existe.
- **Painel não abre sozinho para o aluno**: a cópia foi feita antes do cliente com a abertura automática, ou o aluno ainda não abriu o painel pelo menu nenhuma vez. Confira em **Execuções** do script da cópia se `abrirPainelAutomaticamente` rodou.
- **`UNAUTHORIZED` / `PROXY_INVALID_RESPONSE`**: abra a página **WHITEBOX ADMIN** e autorize de novo; confira o acesso "Qualquer pessoa" do Web App.
- **Professor cai na visão de aluno, ou `PROFESSOR_NAO_CADASTRADO` / `PROFESSOR_INATIVO`**: confira o e-mail e o `Status` em `Assinaturas`.
- **`SpreadsheetId` vazio depois do formulário**: confira se está olhando a planilha certa (ID igual a `ADMIN_SPREADSHEET_ID` em **Propriedades do script**). Se sim, procure o erro de `onProfessorFormSubmit` em **Execuções**; o professor pode clicar em **💾 Salvar Chave API** para criar a planilha.
- **Seu próprio e-mail aparece como professor**: o formulário foi respondido no seu perfil. Apague a linha de `Assinaturas` e a planilha "Whitebox - <seu email>" e peça ao professor que responda de novo no perfil dele.
- **Turma `SEM_TURMA` na telemetria**: esperado quando o escopo `drive.file` não cobre o documento (`item3.driveAccess: false` no log de `getContext`).
- **Erro "ID do Documento Semente não configurado"**: preencha **Google Doc ID (Semente)** em **⚙️ Configurações Globais**.
- **📤 Distribuir Levas mostra "⚠️ Distribuição falhou" com `Classroom API retornou 404: … NOT_FOUND`**: problema conhecido, **pendente**. A atividade é criada com o acesso do professor (`drive.file`), que não enxerga o documento mestre, cujo dono é você. A correção escolhida é o Google Picker (o professor seleciona o mestre uma vez e o `drive.file` passa a cobri-lo), mas a decisão foi adiada. Até lá, o professor cria a atividade direto no Classroom (veja o manual do professor, seção 4).
- **Professor precisa autorizar o painel em cada cópia de aluno**: cada cópia do Classroom leva um script vinculado próprio, e a autorização do Google vale por script. Mitigação atual: no documento mestre, o relatório **Ver as cópias de todos os alunos** mostra a telemetria de todas as cópias sem abri-las. Solução definitiva a avaliar: publicar o cliente como **Editor Add-on** (autorização uma vez por usuário, sem script em cada cópia), o que exige projeto Cloud próprio, tela de consentimento e publicação no Workspace Marketplace (privada ao domínio ou pública com verificação).
- **"Métricas não enviadas: O professor deste documento não está cadastrado…" com o professor Ativo**: a cópia perdeu o `WHITEBOX_CONFIG`. Esse named range fica preso ao primeiro parágrafo e some se o aluno apaga o começo do documento. Desde a versão da biblioteca com `WHITEBOX_PROFESSOR`, o painel guarda o professor em DocumentProperties na primeira abertura e recria o named range sozinho; se o aluno apagou o começo **antes** de abrir o painel, restaure pelo **Histórico de versões** da cópia.
- **"Análise de IA não disponível (modo offline)" com chave salva**: confira em `Assinaturas` se `ChaveIndividual` = `SECURE_STORAGE`. Chave em formato desconhecido é recusada com `CHAVE_FORMATO_INVALIDO`. Aceitos: `AIza…`, `AQ.…` (Gemini) e `sk-ant-…` (Claude).
- **Logs**: em **Execuções**, no editor do servidor e no da biblioteca. As chamadas ao Web App (`doPost`) aparecem sem log, porque são anônimas e o projeto não tem Registros do Cloud. Por isso o painel mostra a mensagem de erro do servidor.
