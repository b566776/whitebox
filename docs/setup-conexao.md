# ⚙️ Configuração de Conexão — Whitebox

Este guia descreve como configurar a conexão entre o **Add-on Whitebox** (instalado no Google Docs) e o **servidor Whitebox** (BrainProxy). Siga estas instruções se você ver o erro:

> ❌ `BRAIN_PROXY_URL não configurada nas Script Properties`

---

## O que é a `BRAIN_PROXY_URL`?

O Whitebox funciona em dois componentes:

| Componente | Onde roda | O que faz |
|---|---|---|
| **Add-on (whitebox-client)** | Google Docs do professor | Interface lateral, rastreamento de alunos |
| **Servidor (whitebox-server / BrainProxy)** | Google Apps Script standalone | IA, Classroom, banco de dados global |

A `BRAIN_PROXY_URL` é o endereço do servidor. Sem ela, o Add-on não sabe como se comunicar com o servidor, e a aba **Distribuir** (e outras funções de IA) ficam inativas.

---

## ✅ Método 1 — Assistente de Configuração (Recomendado)

A partir da versão com `setupWhitebox()`, o professor pode configurar com **2 cliques** diretamente no documento:

### Passo a Passo

1. **Abra o documento** onde o Whitebox está instalado
2. No menu superior, clique em **`Whitebox`**
3. Clique em **`⚙️ Configurar Conexão`**
4. Uma caixa de diálogo aparecerá pedindo a **URL do servidor**:
   ```
   https://script.google.com/macros/s/AKfycbw.../exec
   ```
   > Obtenha esta URL com o administrador do sistema ou no painel do [Apps Script do servidor](https://script.google.com).

5. Em seguida, outra caixa pedirá o **SHARED_TOKEN**:
   ```
   WBX-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
   ```
   > Este token foi gerado automaticamente na primeira vez que o servidor foi acessado.

6. O sistema fará um **ping de validação** para confirmar que a URL e o token estão corretos
7. Se tudo estiver correto: `✅ Whitebox Configurado!`

> [!TIP]
> Feche e reabra o Painel Whitebox após a configuração para carregar com as novas credenciais.

---

## 🔧 Método 2 — Script Properties Manual (Alternativo)

Se o menu não estiver disponível (ex: primeiro acesso antes do `onOpen` rodar):

1. No documento, vá em **Extensões > Apps Script**
2. No editor, clique em **⚙️ Configurações do Projeto** (ícone de engrenagem à esquerda)
3. Clique na aba **Propriedades do script**
4. Clique em **+ Adicionar propriedade** e adicione:

| Propriedade | Valor |
|---|---|
| `BRAIN_PROXY_URL` | `https://script.google.com/macros/s/.../exec` |
| `SHARED_TOKEN` | `WBX-...` |

5. Clique **Salvar**
6. Feche e reabra o documento

---

## 🔍 Onde encontrar a URL e o Token

### URL do Servidor
O administrador do sistema pode encontrá-la em:
- [Dashboard Admin](https://script.google.com/macros/s/AKfycbwAzIlfKhJ2zoX7NV1jCzuGU8gb7PeNtXHE3evj1-X5ebcI2oiMbKUhrqrSWhL73uqg/exec) → O endereço na barra do browser é a URL
- Ou: Apps Script do `whitebox-server` → **Implantar** → **Gerenciar implantações** → URL da implantação ativa

### SHARED_TOKEN
- Foi exibido uma única vez na **primeira vez que o servidor foi acessado** (mensagem de auto-provisionamento)
- Se perdido: acesse Apps Script do `whitebox-server` → **Configurações** → **Propriedades do script** → procure `SHARED_TOKEN`

---

## 🩺 Diagnóstico: Hierarquia de Configuração

O `getProxyConfig()` da biblioteca busca `BRAIN_PROXY_URL` nesta ordem:

```
1. DeveloperMetadata do documento   ← Configurado via Criar Leva (automático)
2. DocumentProperties do documento  ← Configurado manualmente por documento  
3. ScriptProperties do projeto      ← Configurado pelo assistente (setupWhitebox)
```

Se nenhum dos três tiver o valor, o erro é exibido.

---

## 📋 Checklist de Resolução

- [ ] O servidor Whitebox está deployado? (acesse a URL e veja se mostra o Dashboard)
- [ ] O `SHARED_TOKEN` bate com o configurado no servidor?
- [ ] As Script Properties foram salvas no projeto **whitebox-client** (não no servidor)?
- [ ] Após salvar, o documento foi fechado e reaberto?

---

*Documentação técnica — Whitebox v2.x*
*Relacionado: [Teacher.md](Teacher.md) | [Admin.md](Admin.md) | [architecture.md](architecture.md)*
