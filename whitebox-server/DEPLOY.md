# Whitebox — Guia de Implantação

## Visão Geral da Arquitetura

```
[Documento Google do Aluno]
        |
        | UrlFetchApp (HTTPS + OAuth do usuário)
        v
[Brain Proxy — Script Standalone]  <-- código proprietário, só você tem acesso
        |
        |---> Planilha Global (Admin/Dev)  — Assinaturas de professores por escola
        |---> Planilha do Professor        — Logs das turmas
        |---> Provedor de IA configurável  — Análise socrática (Gemini, Claude ou Ollama)
```

---

## PASSO 1: Criar o Brain Proxy

1. Acesse [script.google.com](https://script.google.com) e crie um **Novo Projeto** em branco.
2. Nomeie-o como **"Whitebox BrainProxy"**.
3. Copie o conteúdo de `BrainProxy.gs` e `AdminSetup.gs` para o editor.
4. Salve o projeto.

---


## PASSO 3: Publicar o Brain Proxy como Web App

1. No editor do BrainProxy, clique em **Implantar → Nova Implantação**.
2. Tipo: **Aplicativo da Web**.
3. Configuração:
   - **Executar como**: Eu (seu email de administrador)
   - **Quem tem acesso**: Qualquer pessoa
4. Clique em **Implantar** e copie a **URL do Web App gerada**.

---

## PASSO 4: Configurar o Add-on (Script do Google Docs)

1. Abra o Script Editor do Documento Modelo (ou crie um novo projeto vinculado).
2. Copie os arquivos de `addonAutonomo-apps-script/` para o editor.
3. Cole a URL copiada no Passo 3 na constante `BRAIN_PROXY_URL` de `whitebox-lib/Constants.gs` e
   publique uma nova versão da biblioteca. A URL não é mais lida de Propriedades do Script: fica
   fixa no código para que nenhum usuário possa redirecionar o Add-on para outro servidor.

O Add-on não recebe token: ele se autentica com a conta Google do usuário. O `SHARED_TOKEN`
fica só nas Script Properties do Brain Proxy, para o Dashboard Admin.

---

## PASSO 5: Cadastrar Professores

Só e-mails cadastrados aqui, com `Status: Ativo`, têm o papel de professor. Não há auto-cadastro
pelo Add-on. Existem três formas de adicionar professores à base do Whitebox:

**Opção A — Onboarding Automático (Recomendado)**
1. No `Dashboard.html`, clique em **"Gerar Link de Inscrição Segura"**.
2. Defina o nome da leva e a data limite. O sistema criará um Google Form.
3. Na confirmação que aparece abaixo do link, digite o e-mail do professor e clique em **📧 Sim, enviar** para o servidor mandar o convite, ou clique em **Não, só mostrar o link** e envie você mesmo. O robô validará a permissão do Drive deles em background e fará o cadastro automático!

**Opção B — Via Função (Programático)**
```javascript
// Execute no editor do BrainProxy:
// (email, escola, usaChaveGlobal, idArquivoDrive)
adicionarProfessor("professor@escola.com.br", "Escola XYZ", false, "1BxiMVs0XRY5..."); // Cofre Individual
adicionarProfessor("vip@escola.com.br", "Escola XYZ", true, ""); // Chave Global
```

**Opção C — Via Planilha (Manual)**
1. Abra a planilha Whitebox Admin.
2. Na aba "Assinaturas", adicione uma linha com:
   - `Email` | `Escola` | `Status: Ativo` | `UsaChaveGlobal: Sim/Não` | `ChaveIndividual: ID_DO_ARQUIVO_DRIVE`

---

## Modo do painel por escola (aba Escolas)

Cada escola tem uma linha na aba **Escolas** da Planilha Global (criada pela migração v4;
depois de publicar o servidor, abra o editor do Apps Script do servidor e rode `migrarSchemaAgora`. Sem a aba, toda escola fica no modo de sempre, então isso só é preciso antes de configurar uma escola):

| Coluna | Valores | Efeito |
|---|---|---|
| `Instituicao` | igual à coluna Instituicao da aba Assinaturas | liga professores à escola (nunca pelo domínio do e-mail) |
| `Tipo_Conta` | `workspace` ou `gmail` | contas da escola ou contas pessoais |
| `Modo_Painel` | `script_vinculado` ou `addon` | de onde vem o painel do aluno |

Sem linha, a escola fica em `workspace` + `script_vinculado` (o modo de sempre).

Script Properties do servidor ligadas a isso:

- `ADDON_CLIENT_IDS`: IDs de cliente OAuth do add-on publicado, separados por vírgula.
  Numa escola em modo `addon`, o servidor só aceita medições do Radar com um desses IDs no
  token; sem a propriedade, recusa todas (`ADDON_NAO_CONFIGURADO`).
- `GMAIL_ADDON_LIBERADO`: `sim` libera `gmail` + `addon`. Até lá essas escolas seguem no
  modo `script_vinculado`. Ver as condições em `whitebox-addon/PUBLICACAO.md`.

Na aba Config, `seed_document_id_addon` é o semente sem script vinculado usado nos mestres
das escolas em modo `addon`.

## Radar: conferência pelas revisões do Drive (etapa 3)

O servidor confere as medições que o painel do aluno manda com o histórico de revisões do
Drive da cópia, lido com a **conta do servidor** (a dona do Web App). Resultado: colunas
`Revisoes_Conferidas_Em`, `Revisoes_Lidas`, `Divergencias` e `Acesso_Revisoes` da aba
`Radar_Estado`; eventos com a coluna `Fonte` em `Radar_Eventos`; e um aviso no radar do
professor. Três sinais:

- **Colagem entre revisões** (`C`, fonte `revisao_servidor`): crescimento acima de 8
  caracteres/s, parágrafo a parágrafo (um parágrafo só editado não é marcado; texto
  restaurado não conta).
- **Divergência** (`DIVERGENCIA`): o tamanho do texto de uma revisão fica fora da faixa das
  medições feitas até 3 min antes **e** depois dela. Com o painel fechado logo depois, não
  compara. Comentários do professor não entram na conta.
- **Medição suprimida** (`N`, fonte `revisao_nao_medido`): um parágrafo igual em duas
  revisões, nunca medido, e as medições do intervalo (com 2 min de folga para o relógio do
  aluno) menores que a revisão em pelo menos 80% do tamanho dele. Lista numerada, tabela e
  Shift+Enter não disparam, porque nesses casos os tamanhos batem.
- `ACESSO_PERDIDO`: o servidor tinha acesso à cópia e perdeu (alguém tirou a conta dele do
  compartilhamento).

**Ligar:** Script Property `RADAR_REVISOES_ATIVO = sim`. Desligada (padrão), o servidor não
confere, não pede compartilhamento e o painel não compartilha nada. Com acesso, o servidor
lê o **texto** das revisões (não só hashes e tamanhos): ligue só com o servidor numa conta da
organização e os termos de uso do aluno atualizados (`docs/Termos de Uso - Aluno.md`).

- **Quando roda:** a cada 30 min por cópia, no envio de medições do aluno, e a cada 10 min
  quando o professor abre o radar (só para o aluno que o radar mostra). Lê no máximo as 20
  revisões mais novas por vez; se a exportação de uma falhar, as seguintes ficam para a
  próxima conferência.
- **Acesso:** o servidor precisa ser leitor da cópia. O painel do aluno pergunta a conta ao
  servidor (rota `ping`) e compartilha a cópia com ela (`Document.addViewer`, escopo
  `documents.currentonly`, que o painel já tem), avisando o aluno na primeira vez. O painel do
  professor não compartilha nada. Nenhum escopo novo nem restrito para os usuários.
- **Escolas com Workspace:** se o domínio bloquear compartilhar com contas de fora, a
  conferência fica em `sem_acesso` e o professor vê o aviso com a conta a liberar.
- *A confirmar no primeiro teste real:* que `addViewer` funciona com `documents.currentonly`
  nas cópias do Classroom e não manda e-mail de aviso à conta do servidor; e o formato do
  texto exportado (marcadores de lista, tabelas, comentários).

## Configurar a IA (Script Properties do Brain Proxy)

A IA global atende os professores com `UsaChaveGlobal: Sim`. Configure em
**Configurações do Projeto → Propriedades do Script**:

| Propriedade     | Valor                                                                 |
|-----------------|-----------------------------------------------------------------------|
| `IA_PROVIDER`   | `gemini` (padrão se ausente), `claude` ou `ollama`                    |
| `IA_MODEL`      | Opcional. Sem ela vale o padrão do provedor. Obrigatória para `ollama` |
| `IA_BASE_URL`   | Só `ollama`: URL pública do servidor (ex.: `https://ollama.com`)      |
| `IA_GLOBAL_KEY` | Chave do provedor. Opcional para `ollama`                             |

Exemplos:

| Cenário | `IA_PROVIDER` | `IA_MODEL` | `IA_BASE_URL` | `IA_GLOBAL_KEY` |
|---|---|---|---|---|
| Gemini (padrão: `gemini-3.8-flash`) | — | — | — | `AIza...` |
| Gemini sempre no Flash mais recente | — | `gemini-flash-latest` | — | `AIza...` |
| Claude (padrão: `claude-opus-5-5`) | `claude` | — | — | `sk-ant-...` |
| Claude com outro modelo | `claude` | `claude-haiku-4-5` | — | `sk-ant-...` |
| Ollama da instituição | `ollama` | `gemma4:31b` | `https://ollama.escola.br` | — |
| Ollama Cloud | `ollama` | `gemma4:31b` | `https://ollama.com` | chave do Ollama |

Observações:
- Instalações antigas continuam funcionando: sem `IA_PROVIDER`, o servidor usa Gemini com a
  `GEMINI_GLOBAL_KEY` existente. Essa chave legada nunca é enviada a outro provedor.
- O Brain Proxy roda na nuvem do Google. Um Ollama em `localhost` ou em rede interna **não** é
  alcançável; a URL precisa ser pública (HTTPS), de preferência atrás de um proxy com autenticação.
- Com Claude nos modelos atuais, o servidor habilita `fallbacks: "default"`: se um classificador de
  segurança recusar o trecho, a API da Anthropic o reexecuta em outro modelo, cobrado pela tarifa dele.
- O modelo fica em uma propriedade justamente porque modelos são descontinuados: para trocar,
  edite `IA_MODEL`, sem alterar código. Para um novo provedor, adicione uma entrada em `IAProviders.gs`.

---

## Hierarquia de IA & Segurança de Dados

Para garantir que as chaves da API não fiquem vulneráveis no banco de dados, utilizamos a estratégia de **Cofre no Drive (Delegação de Acesso)**.

```
Para cada requisição de análise:

1. O professor está na lista? Se não → requisição recusada (PROFESSOR_NAO_CADASTRADO).
2. Status != "Ativo"? → requisição recusada (PROFESSOR_INATIVO).
3. UsaChaveGlobal == "Sim" E a IA global está configurada? → usa a IA da instituição ✅
4. ChaveIndividual preenchida (chave salva pela barra lateral ou ID de um arquivo no Drive)?
   ↳ O Proxy lê a chave (do cofre interno ou do arquivo no Drive do professor).
   ↳ O formato da chave define o provedor: AIza... → Gemini; sk-ant-... → Claude ✅
5. Nenhuma das anteriores → entra no MODO OFFLINE nativo.
   ↳ (As métricas pedagógicas são salvas na planilha do professor, mas o texto não é enviado a nenhuma IA).
```

---

## Distribuição via Link

1. Abra o Documento Modelo no Google Drive.
2. Clique com o botão direito → **Fazer uma cópia** para testar.
3. Para distribuir: **Compartilhar → Qualquer pessoa com o link pode visualizar**.
4. Oriente os professores a fazer uma cópia do documento template para sua turma.
   - O Add-on viaja junto com o script container-bound.
   - O Brain Proxy permanece separado e oculto.

---

## Segurança

- O código do Brain Proxy **nunca é copiado** junto com o documento.
- Mesmo que alguém inspecione o código do Add-on, só verá chamadas para uma URL: não há segredo no cliente.
- O Proxy identifica quem chama pelo OAuth token do Google e decide o que cada um pode fazer:
  alunos só enviam telemetria; rotas de professor exigem cadastro Ativo; rotas de Admin exigem o `SHARED_TOKEN`.
- Cada professor tem sua própria planilha criada automaticamente no primeiro uso.
