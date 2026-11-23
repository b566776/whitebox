# Whitebox — Add-on do Documentos Google (modo `addon`)

O add-on é o mesmo painel do script vinculado (`whitebox-client`), mas num projeto só,
publicado. O aluno não copia nem edita esse código, e o servidor só aceita medições do
Radar vindas dele nas escolas em modo `addon`.

> **Regra do projeto:** nenhum escopo restrito do Google (lista em
> https://support.google.com/cloud/answer/13464325). O manifesto usa os mesmos escopos do
> cliente; o teste `whitebox-lib/tests/escopos.test.js` falha se aparecer um restrito.

## Ordem de lançamento

1. **Escolas com Google Workspace for Education primeiro.**
2. **Contas @gmail só depois de liberar** a Script Property `GMAIL_ADDON_LIBERADO = sim` no
   servidor. Ligar apenas quando, nesta ordem:
   - a verificação OAuth do Google estiver concluída (escopos sensíveis; sem auditoria CASA,
     que só vale para escopos restritos);
   - a etapa 3 do Radar (servidor confere medições com as revisões do Drive) estiver no ar;
   - houver termo de consentimento dos responsáveis para alunos menores;
   - o servidor estiver numa conta da organização, fora da conta pessoal.

   Enquanto travado, uma escola `gmail` + `addon` continua funcionando no modo
   `script_vinculado` (ver `whitebox-server/Escolas.gs`).

## Publicar (escola com Workspace)

1. Criar um projeto Apps Script **standalone** e copiar `whitebox-addon/.clasp.json.exemplo`
   para `.clasp.json` com o ID dele. `clasp push` a partir de `whitebox-addon/`.
2. Em `appsscript.json`, trocar `"version"` da biblioteca `WhiteboxLib` pelo número da
   versão publicada da biblioteca (`developmentMode` fica `false`: o add-on não pode rodar
   o código em edição).
3. Vincular o projeto a um projeto do Google Cloud padrão (Configurações do projeto >
   Projeto do Google Cloud) e ativar a **Google Workspace Marketplace SDK**.
4. Tela de consentimento OAuth:
   - **Interno**, se o projeto do Cloud pertencer à organização da escola: sem verificação
     do Google e sem limite de usuários. É o caminho mais curto para a primeira escola.
   - **Externo**, se o mesmo add-on atender várias escolas: exige a verificação de escopos
     sensíveis (marca + escopos; dias úteis, não semanas). Sem ela, o limite é de 100
     usuários no total.
5. Implantar uma versão (Implantar > Nova implantação > Complemento do Editor) e, no
   Marketplace SDK, configurar o app como complemento do Documentos com o ID do script e o
   número da implantação. Visibilidade **Privada** (só o domínio) no caminho Interno.
6. O administrador da escola instala o add-on para o domínio (ou para as unidades
   organizacionais dos alunos e professores) no Admin Console.
7. **ID de cliente OAuth:** na página Credenciais do projeto do Cloud, copiar o ID do
   cliente OAuth do add-on (termina em `.apps.googleusercontent.com`) e colocar na Script
   Property `ADDON_CLIENT_IDS` do servidor (vários separados por vírgula).
   **Conferência em um clique:** num documento qualquer, Extensões > Whitebox > **Conferir
   conexão**. O alerta mostra o ID de cliente que o servidor recebeu do add-on e se ele já
   está em `ADDON_CLIENT_IDS` (o servidor também registra no log, com a etiqueta `[ping]`).
   Se o ID mostrado for diferente do copiado do Cloud, use o mostrado: é o que vem no token.
8. Na Planilha Global, aba **Escolas**: `Tipo_Conta = workspace`, `Modo_Painel = addon`.
9. Na aba **Config**, preencher `seed_document_id_addon` com um documento semente **sem
   script vinculado** (cópia do semente atual com o projeto vinculado apagado). Os novos
   mestres dos professores dessa escola saem dele.

## O que muda para cada um

- **Aluno:** abre a cópia da atividade; na primeira vez, Extensões > Whitebox > Abrir
  painel e autoriza. Depois o painel abre sozinho naquele documento (gatilho "ao abrir").
  Em documentos que não são atividades do Whitebox o painel só mostra um aviso e não mede
  nada (papel `fora`).
- **Professor:** igual ao script vinculado. O radar diz de onde vieram as medições (add-on
  ou script da cópia) e quanto do texto não foi observado.
- **Cópias antigas com script vinculado:** numa escola em modo `addon`, o servidor recusa
  as medições delas (`ORIGEM_NAO_AUTORIZADA`) e o painel pede ao aluno para abrir pelo menu
  Extensões. Trocar o modo de uma escola no meio de uma atividade faz isso com todos os
  alunos dela: prefira trocar entre atividades.

## A confirmar antes de escalar

- `azp` do token do add-on (passo 7).
- Gatilho "ao abrir" criado pelo add-on abre o painel como no script vinculado.
- Várias contas Google no mesmo navegador: o painel mostra o aviso, mas o Apps Script pode
  rodar com a conta padrão. Orientar o uso de um perfil do navegador só com a conta da escola.
