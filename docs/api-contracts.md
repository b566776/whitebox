# Contratos de API - Protocolo de Comunicação Whitebox

## 1. Autenticação
Todas as requisições devem ser enviadas via `HTTP POST` para a URL do Web App e incluir o `SHARED_TOKEN`.

**Header**: `Content-Type: application/json`

---

## 2. Rotas do Servidor (`doPost`)

### 2.1. `analisar`
Solicita uma análise socrática de IA de um fragmento de texto.

**Payload**:
```json
{
  "token": "SHARED_TOKEN",
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

### 2.2. `logar_metricas`
Persiste a telemetria comportamental do aluno.

**Payload**:
```json
{
  "token": "SHARED_TOKEN",
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

### 2.3. `status_licenca`
Verifica se o professor está ativo e se o modo IA está disponível.

**Payload**:
```json
{
  "token": "SHARED_TOKEN",
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
{ "token": "SHARED_TOKEN", "route": "listar_turmas_professor", "professorEmail": "prof@edu.com" }
```

### 2.7. `criar_leva_template` (Professor)
Cria atividade no Classroom com `STUDENT_COPY` do template.

**Payload**:
```json
{ 
  "token": "SHARED_TOKEN", 
  "route": "criar_leva_template", 
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
{ "token": "SHARED_TOKEN", "route": "status_distribuicao", "executionId": "uuid-v4" }
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
 * Realiza chamada POST segura para o Brain Proxy.
 * @param {string} route Rota de destino
 * @param {object} payload Dados para o body
 */
function callProxy(route, payload) {
  const config = getProxyConfig(); // { url, token }
  const body = {
    token: config.token,
    route: route,
    ...payload
  };
  
  const options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(body),
    muteHttpExceptions: true
  };
  
  const response = UrlFetchApp.fetch(config.url, options);
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
