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

## PASSO 5: Adicionar Professores (Painel Admin)

Você pode adicionar professores de duas formas:

**Opção A — Via Função (Programático)**
```javascript
// Execute no editor do BrainProxy:
adicionarProfessor("professor@escola.com.br", "Escola XYZ", false); // sem chave global
adicionarProfessor("vip@escola.com.br", "Escola XYZ", true);        // com chave global
```

**Opção B — Via Planilha (Manual)**
1. Abra a planilha Whitebox Admin.
2. Na aba "Assinaturas", adicione uma linha com:
   - `Email` | `Escola` | `Status: Ativo` | `UsaChaveGlobal: Sim/Não`

---

## Hierarquia de Chaves API (Regras de Negócio)

```
Para cada requisição de análise:

1. O professor está na lista? Se não → retorna "NAO_CADASTRADO" (modo offline)
2. Status == "Inativo"? → retorna "INATIVO"
3. UsaChaveGlobal == "Sim" E GEMINI_GLOBAL_KEY existe? → usa chave global ✅
4. ChaveIndividual preenchida? → usa chave do professor ✅
5. Nenhuma das anteriores → modo offline (métricas são salvas, análise não é feita)
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
