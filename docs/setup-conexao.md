# ⚙️ Conexão com o Servidor — Whitebox

O Add-on não precisa ser configurado em cada documento. A URL do servidor (BrainProxy) é **fixa no código da biblioteca**, e nenhum professor ou aluno consegue alterá-la.

---

## Onde fica a URL

| Item | Local |
|---|---|
| Constante | `BRAIN_PROXY_URL` em `whitebox-lib/Constants.gs` |
| Valor | URL do Web App do `whitebox-server` (termina em `/exec`) |

O assistente **Whitebox > ⚙️ Configurar Conexão** e a função `configurarConexaoAgora()` foram removidos. As propriedades `BRAIN_PROXY_URL` (do documento e do script) não são mais lidas.

### Por que é fixa
Em toda chamada, o Add-on envia ao servidor o OAuth token de quem está usando o documento. Quando a URL vinha de propriedades, qualquer usuário podia apontá-la para outro endereço pelo menu e passar a receber os tokens dos demais — inclusive o do professor, ao abrir o documento de um aluno. Com a URL no código da biblioteca, que os usuários só conseguem ler, o token só sai para o servidor oficial.

---

## Como trocar a URL (somente Admin/desenvolvedor)

A URL só muda se uma **nova implantação** do Web App for criada. Atualizar a implantação existente (`clasp update-deployment`) mantém a mesma URL — prefira sempre esse caminho.

Se for preciso trocar:

1. Edite `BRAIN_PROXY_URL` em `whitebox-lib/Constants.gs`.
2. `clasp push` na biblioteca e crie uma nova versão.
3. Atualize `version` no `appsscript.json` do cliente e faça `clasp push` no cliente.
4. Redistribua o documento modelo.

Documentos já distribuídos continuam na versão antiga da biblioteca e, portanto, na URL antiga (ver [Manual do Desenvolvedor](development-guide.md), seção 2.4). Mantenha a implantação antiga no ar enquanto houver documentos apontando para ela.

---

## 🩺 Diagnóstico

| Sintoma na barra lateral | Causa provável |
|---|---|
| `PROXY_CONNECTION_FAILED` | Falha de rede, ou a implantação do Web App foi removida. |
| `PROXY_INVALID_RESPONSE` | O servidor respondeu algo que não é JSON. Em geral, o dono do script precisa autorizar o Web App de novo (abrir o Dashboard) após uma mudança de escopos. |
| `UNAUTHORIZED` | O servidor não reconheceu a conta Google, ou o e-mail não é o do professor do documento. |
| Painel de aluno para um professor | O e-mail não está na aba `Assinaturas`. Não tem relação com a conexão. |

- [ ] O servidor está no ar? (abra a URL no navegador; deve aparecer o Dashboard)
- [ ] O Add-on foi autorizado com a sua conta Google (pop-up de permissões na primeira abertura)?

### SHARED_TOKEN (somente Admin)
- É a credencial do **Dashboard Admin**. Professores e alunos nunca precisam dele, e ele não deve ser colocado em documentos nem no cliente.
- Para consultar: Apps Script do `whitebox-server` → **Configurações** → **Propriedades do script** → `SHARED_TOKEN`
- Para trocar (ex.: suspeita de vazamento): execute `rotacionarSharedToken()` no editor do `whitebox-server` e informe o novo valor no Dashboard.

---

*Documentação técnica — Whitebox v2.x*
*Relacionado: [Teacher.md](Teacher.md) | [Admin.md](Admin.md) | [architecture.md](architecture.md)*
