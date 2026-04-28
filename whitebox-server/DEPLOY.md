# Whitebox — Guia de Implantação

## Visão Geral da Arquitetura

```
[Documento Google do Aluno]
        |
        | UrlFetchApp (HTTPS + Token)
        v
[Brain Proxy — Script Standalone]  <-- código proprietário, só você tem acesso
        |
        |---> Planilha Global (Admin/Dev)  — Assinaturas de professores por escola
        |---> Planilha do Professor        — Logs das turmas
        |---> API do Gemini Pro            — Análise socrática
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
3. Vá em **Configurações do Projeto → Propriedades do Script** e adicione:

| Propriedade       | Valor                                          |
|-------------------|------------------------------------------------|
| `BRAIN_PROXY_URL` | URL copiada no Passo 3                         |
| `SHARED_TOKEN`    | O mesmo token configurado no BrainProxy        |

---

## PASSO 5: Cadastrar Professores

Existem três formas de adicionar professores à base do Whitebox:

**Opção A — Onboarding Automático (Recomendado)**
1. No `Dashboard.html`, clique em **"Gerar Link de Inscrição Segura"**.
2. Defina o nome da leva e a data limite. O sistema criará um Google Form.
3. Envie o formulário aos professores. O robô validará a permissão do Drive deles em background e fará o cadastro automático!

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

## Hierarquia de Chaves API & Segurança de Dados

Para garantir que as chaves da API não fiquem vulneráveis no banco de dados, utilizamos a estratégia de **Cofre no Drive (Delegação de Acesso)**.

```
Para cada requisição de análise:

1. O professor está na lista? Se não → retorna "NAO_CADASTRADO" (modo offline).
2. Status == "Inativo"? → retorna "INATIVO".
3. UsaChaveGlobal == "Sim" E GEMINI_GLOBAL_KEY configurada? → usa a chave da instituição ✅
4. ChaveIndividual preenchida com um ID do Google Drive? 
   ↳ O Proxy tenta ler o arquivo no Drive do professor. 
   ↳ Se conseguiu ler e tem a chave válida → usa a chave privada do professor ✅
5. Nenhuma das anteriores → entra no MODO OFFLINE nativo.
   ↳ (As métricas pedagógicas são salvas na planilha do professor, mas o texto não é enviado para o Gemini).
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
- Mesmo que alguém inspecione o código do Add-on, só verá chamadas para uma URL com um token.
- O token garante que apenas o seu Add-on pode chamar o Proxy.
- Cada professor tem sua própria planilha criada automaticamente no primeiro uso.
