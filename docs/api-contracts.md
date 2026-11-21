# Contratos de API - Protocolo de Comunicação Whitebox

## 1. Autenticação
Todas as requisições devem ser enviadas via `HTTP POST` para a URL do Web App.

**Header**: `Content-Type: application/json`

O corpo carrega uma de duas credenciais:
- **Cliente (add-on)**: `oauthToken` — o OAuth token do usuário (`ScriptApp.getOAuthToken()`). O servidor o valida junto ao Google e obtém o e-mail verificado.
- **Admin**: `token` — o `SHARED_TOKEN`, que existe apenas nas Script Properties do servidor.

### 1.1. Autorização por rota
| Rotas | Quem pode chamar |
| :--- | :--- |
| `ping`, `logar_metricas` | Qualquer conta Google autenticada. |
| `resumo_processo` | Qualquer conta Google autenticada; o servidor filtra as linhas pelo e-mail verificado (ver 2.3.1). |
| `status_licenca`, `status_distribuicao` | O próprio `professorEmail` (e-mail verificado = e-mail informado). |
| `analisar`, `registrar_chave`, `listar_turmas_professor`, `criar_leva_template` | O próprio `professorEmail`, com cadastro `Ativo` na aba `Assinaturas`. |
| `listar_templates`, `distribuir_template`, `historico_templates`, `reset_planilha` | Somente Admin. |

### 1.2. Erros de autenticação e autorização
O `ContentService` sempre devolve HTTP 200; o status lógico vem em `_httpStatus`.

| `_httpStatus` | `error` | Significado |
| :--- | :--- | :--- |
| 401 | `UNAUTHORIZED` | Credencial ausente/inválida, ou e-mail verificado diferente do `professorEmail`. |
| 403 | `PROFESSOR_NAO_CADASTRADO` | Rota de professor chamada por e-mail fora da aba `Assinaturas`. |
| 403 | `PROFESSOR_INATIVO` | Professor cadastrado com `Status` diferente de `Ativo`. |

---

## 2. Rotas do Servidor (`doPost`)

### 2.1. `analisar`
Solicita uma análise socrática de IA de um fragmento de texto. Exclusiva do professor (cadastro `Ativo`).

**Payload**:
```json
{
  "oauthToken": "OAUTH_TOKEN_DO_PROFESSOR",
  "route": "analisar",
  "professorEmail": "prof@escola.edu",
  "alunoEmail": "aluno@escola.edu",
  "fragmento": "Texto do aluno para análise...",
  "metricas": {
    "editRatio": 0.5,
    "pasteEvents": 1
  }
}
```

**Resposta**:
```json
{
  "modoIA": true,
  "riskScore": 25,
  "justification": "Baixo risco, edição constante.",
  "suggestedQuestion": "Como você chegou a essa conclusão no segundo parágrafo?"
}
```

Sem IA disponível para o professor, a resposta traz `"modoIA": false`. Se o provedor falhar, vem `"modoIA": true` com um campo `error`: `IA_API_ERROR` (com `code`, o status HTTP do provedor), `IA_INVALID_RESPONSE_FORMAT`, `IA_EMPTY_RESPONSE`, `IA_EXCEPTION` (inclui recusa do modelo) ou `IA_PARSE_FALLBACK`. O contrato é o mesmo para Gemini, Claude e Ollama.

Todo erro traz também `message`, legível, com o provedor, o modelo e o texto devolvido por ele (ex.: `gemini (gemini-3.8-flash) respondeu HTTP 404: ...`). A biblioteca repassa esse motivo à barra lateral no campo `aiError: { code, message }` de `sendToBackend`; o modo offline chega como `code: "OFFLINE"`. Com `aiError` presente, a barra lateral mostra o motivo no lugar do resultado.

### 2.2. `logar_metricas`
Persiste a telemetria comportamental do aluno.

**Payload**:
```json
{
  "oauthToken": "OAUTH_TOKEN_DO_USUARIO",
  "route": "logar_metricas",
  "professorEmail": "prof@escola.edu",
  "turma": "Turma_A_123",
  "docId": "GOOGLE_DOC_ID",
  "alunoEmail": "aluno@escola.edu",
  "metricas": { ... },
  "analise": { ... },
  "isFinal": true
}
```

**Resposta**:
```json
{ "success": true }
```

Se o professor informado não estiver cadastrado ou não tiver planilha, a resposta é `404 PLANILHA_PROFESSOR_NAO_ENCONTRADA`, com `message` legível. A biblioteca repassa qualquer recusa deste log à barra lateral no campo `metricsError: { code, message }` de `sendToBackend` (`null` quando o log foi aceito). A barra lateral só mostra "Métricas salvas e enviadas" com `metricsError` nulo; caso contrário, o indicador fica vermelho com o motivo.

### 2.3. `status_licenca`
Verifica se o e-mail do chamador está cadastrado como professor e se o modo IA está disponível. O cliente usa a resposta para decidir a interface: `ATIVO`/`INATIVO` confirmam o cadastro; `NAO_CADASTRADO` não.

**Payload**:
```json
{
  "oauthToken": "OAUTH_TOKEN_DO_USUARIO",
  "route": "status_licenca",
  "professorEmail": "prof@escola.edu"
}
```

**Resposta**:
```json
{
  "status": "ATIVO",
  "escola": "Escola de Teste",
  "modoIA": true,
  "tipoChave": "individual"
}
```

### 2.3.1. `resumo_processo`
Resume a telemetria já gravada na aba `Logs` do professor para **um** documento. Alimenta o card "Relatório de processo" da barra lateral, no aluno e no professor. Só evidência de processo: nenhum `RiscoScore`, veredito, conselho ou pergunta entra na resposta, e linhas de análise de IA são ignoradas.

**Payload**:
```json
{
  "oauthToken": "OAUTH_TOKEN_DO_USUARIO",
  "route": "resumo_processo",
  "professorEmail": "prof@escola.edu",
  "docId": "ID_DO_DOCUMENTO"
}
```

**Autorização** (só pelo e-mail verificado; o servidor não vê a designação gravada no documento):
- Chamador = `professorEmail`, cadastrado e `Ativo`: um bloco por aluno do documento.
- Qualquer outro chamador: só as linhas cujo `Email_Aluno` é o próprio chamador, seja o que for que o payload diga. Sem linhas, `registros` é 0.
- Linhas cujo `Email_Aluno` é o próprio professor (testando a visão do aluno) nunca entram.

**Resposta** (alunos ordenados por `ultimaAtividade`, mais recente primeiro):
```json
{
  "registros": 5,
  "alunos": [{
    "email": "aluno@escola.edu",
    "minutosAtivos": 29, "sessoes": 2, "palavras": 812,
    "colagens": 3, "charsAdicionados": 5120, "charsDeletados": 640,
    "cpmMedio": 140, "cpmPico": 310, "entregue": false,
    "primeiraAtividade": "2026-10-30T13:02:00.000Z",
    "ultimaAtividade": "2026-10-31T14:40:00.000Z"
  }]
}
```

Os contadores do painel são cumulativos por sessão da barra lateral. O resumo soma trechos monotônicos: uma sessão nova começa quando `Tempo_Ativo_Min`, `Colar_Eventos` ou `Chars_Adicionados` diminui, ou quando passam mais de 30 minutos entre dois `Timestamp`. `cpmMedio` é a média dos `Cpm_Medio` não nulos, `cpmPico` o maior `Cpm_Pico`, `palavras` a última contagem não nula.

**Erros**: `400 BAD_REQUEST` (sem `professorEmail` ou `docId`), `403 PROFESSOR_NAO_CADASTRADO`, `403 PROFESSOR_INATIVO` (só quando o chamador é o professor). Sem planilha ou sem aba `Logs`, a resposta é `{ "registros": 0, "alunos": [] }`.

### 2.4. `listar_templates` (Admin)
Lista templates de Docs na pasta central do Admin.

**Payload**:
```json
{ "token": "SHARED_TOKEN", "route": "listar_templates" }
```

### 2.5. `distribuir_template` (Admin)
Copia template para Drive do professor e compartilha.

**Payload**:
```json
{ 
  "token": "SHARED_TOKEN", 
  "route": "distribuir_template", 
  "templateId": "ID_DOC", 
  "destinatarios": ["prof1@edu.com"], 
  "notificarEmail": true 
}
```

### 2.6. `listar_turmas_professor` (Professor)
Lista turmas do Classroom onde o usuário é docente.

**Payload**:
```json
{ "oauthToken": "OAUTH_TOKEN_DO_PROFESSOR", "route": "listar_turmas_professor", "professorEmail": "prof@edu.com" }
```

### 2.7. `criar_leva_template` (Professor)
Cria atividade no Classroom com `STUDENT_COPY` do template.

**Payload**:
```json
{ 
  "oauthToken": "OAUTH_TOKEN_DO_PROFESSOR", 
  "route": "criar_leva_template", 
  "professorEmail": "prof@edu.com", 
  "templateDocId": "ID_DOC", 
  "turmas": ["ID_TURMA"], 
  "titulo": "Atividade 01", 
  "executionId": "uuid-v4" 
}
```

### 2.8. `status_distribuicao` (Polling)
Consulta progresso de uma criação de leva em andamento.

**Payload**:
```json
{ "oauthToken": "OAUTH_TOKEN_DO_PROFESSOR", "route": "status_distribuicao", "professorEmail": "prof@edu.com", "executionId": "uuid-v4" }
```

### 2.9. `historico_templates` (Admin)
Retorna log de todas as distribuições Admin -> Professores.

**Payload**:
```json
{ "token": "SHARED_TOKEN", "route": "historico_templates" }
```

---

## 3. Utilitário do Cliente (`callProxy`)
O cliente usa uma função padronizada para interagir com o servidor.

```javascript
/**
 * Realiza chamada POST segura para o Brain Proxy (versão resumida de whitebox-lib/Utils.gs).
 * @param {string} route Rota de destino
 * @param {object} data Dados para o body
 */
function callProxy(route, data) {
  const payload = Object.assign({ route: route }, data);
  if (!payload.professorEmail) {
    payload.professorEmail = Session.getActiveUser().getEmail();
  }
  payload.oauthToken = ScriptApp.getOAuthToken();

  // BRAIN_PROXY_URL é constante da biblioteca: o token nunca vai para uma URL configurável
  const response = UrlFetchApp.fetch(BRAIN_PROXY_URL, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });
  return JSON.parse(response.getContentText());
}
```

```javascript
/**
 * Realiza chamada POST segura para o Brain Proxy via Biblioteca.
 * [ARCH-LIB] No modelo novo, o Wrapper chama 'WhiteboxLib.callProxy'
 */
function callLibrary(functionName, args) {
  // O Dynamic Dispatcher do whitebox-client encaminha para:
  return WhiteboxLib[functionName].apply(null, args);
}
```
