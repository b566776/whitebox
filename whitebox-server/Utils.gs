/**
 * =====================================================
 *  Whitebox — Utils.gs (Utilitários Compartilhados)
 * =====================================================
 *
 * [ARCH-02] Arquivo utilitário centralizado do whitebox-server.
 * Contém funções de infra-estrutura que eram duplicadas ou dispersas
 * em BrainProxy.gs e AdminSetup.gs.
 *
 * REGRA: Nenhuma lógica de negócio aqui. Apenas:
 *   - Constantes e configurações
 *   - Validação de inputs
 *   - Acesso padronizado a Script Properties
 *   - Construção de respostas HTTP
 *   - Acesso padronizado à Planilha Global
 */

// Constantes → ver Constants.gs
// [ARCH-03] Todos os literais (abas, props, rotas) foram movidos para Constants.gs.

// =====================================================
//  CONFIGURAÇÃO (Script Properties)
// =====================================================

/**
 * [ARCH-02] Lê as configurações centrais das Script Properties.
 * Extraído de BrainProxy.gs para que qualquer módulo possa chamar
 * sem depender do contexto do roteador.
 *
 * @returns {{ sharedToken: string, adminSpreadsheetId: string,
 *             iaProvider: string, iaModel: string|null, iaBaseUrl: string|null, iaGlobalKey: string|null }}
 */
function getConfig() {
  const props      = PropertiesService.getScriptProperties();
  const iaProvider = (props.getProperty(PROP_IA_PROVIDER) || 'gemini').trim().toLowerCase();
  return {
    sharedToken:        props.getProperty(PROP_SHARED_TOKEN),
    adminSpreadsheetId: props.getProperty(PROP_ADMIN_SPREADSHEET_ID),
    iaProvider:         iaProvider,
    iaModel:            props.getProperty(PROP_IA_MODEL) || null,
    iaBaseUrl:          props.getProperty(PROP_IA_BASE_URL) || null,
    // A chave legada do Gemini só vale para o Gemini: nunca é enviada a outro provedor.
    iaGlobalKey:        props.getProperty(PROP_IA_GLOBAL_KEY) ||
                        (iaProvider === 'gemini' ? props.getProperty(PROP_GEMINI_GLOBAL_KEY) : null) || null
  };
}

// =====================================================
//  AUTENTICAÇÃO ADMIN
// =====================================================

/**
 * [ARCH-02] Guard de autenticação para funções Admin.
 * Chamado via google.script.run pelo Dashboard HTML.
 *
 * @param {string} token - Token passado pelo frontend
 * @throws {Error} Se o token for inválido ou ausente
 */
function validateAdminAccess(token) {
  const props  = PropertiesService.getScriptProperties();
  const shared = props.getProperty(PROP_SHARED_TOKEN);
  if (!shared || token !== shared) {
    throw new Error('UNAUTHORIZED: Token Administrativo inválido ou ausente.');
  }
}

// =====================================================
//  AUTENTICAÇÃO CLIENTE (OAuth)
// =====================================================

/**
 * Verifica um OAuth access token junto ao Google e retorna o dono e o cliente OAuth.
 * Resultado cacheado até a expiração do token (máx. 30 min).
 *
 * clientId (azp, ou aud) é o ID de cliente OAuth do projeto que pediu o token: o do
 * add-on publicado é fixo; o de um script vinculado copiado com o documento é outro. É o
 * que permite ao servidor aceitar medições só do add-on (ver Escolas.gs).
 *
 * @param {string} oauthToken - Enviado pelo callProxy da biblioteca
 * @returns {{ email: string, clientId: string }|null} null se o token for inválido
 */
function verificarTokenOAuth(oauthToken) {
  if (!oauthToken) return null;

  // Chave = hash do token: tokens excedem o limite de 250 chars das chaves de cache.
  const cache    = CacheService.getScriptCache();
  const cacheKey = 'OAUTH2_' + Utilities.base64EncodeWebSafe(
    Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, oauthToken)
  );
  const cached = cache.get(cacheKey);
  if (cached) {
    try {
      const c = JSON.parse(cached);
      if (c && c.email) return c;
    } catch (e) { /* cache antigo ou corrompido: consulta de novo */ }
  }

  try {
    const response = UrlFetchApp.fetch(
      'https://oauth2.googleapis.com/tokeninfo?access_token=' + encodeURIComponent(oauthToken),
      { muteHttpExceptions: true }
    );
    if (response.getResponseCode() !== 200) return null;
    const res = interpretarTokenInfo(JSON.parse(response.getContentText()));
    if (!res) return null;
    const ttl = Math.min(1800, parseInt(res.expiraEm, 10) || 0);
    const dados = { email: res.email, clientId: res.clientId };
    if (ttl > 0) cache.put(cacheKey, JSON.stringify(dados), ttl);
    return dados;
  } catch (authErr) {
    Logger.log('[Utils] Erro na validação OAuth: ' + authErr);
    return null;
  }
}

/**
 * Resposta do tokeninfo → { email, clientId, expiraEm } (puro, testável).
 * Exige e-mail verificado quando o campo vem na resposta.
 */
function interpretarTokenInfo(info) {
  if (!info || !info.email) return null;
  if (info.email_verified !== undefined && String(info.email_verified) !== 'true') return null;
  return {
    email:    String(info.email).toLowerCase(),
    clientId: String(info.azp || info.aud || info.issued_to || ''),
    expiraEm: info.expires_in
  };
}

/** Compatibilidade: só o e-mail verificado do token. */
function verificarEmailOAuth(oauthToken) {
  const r = verificarTokenOAuth(oauthToken);
  return r ? r.email : null;
}

// =====================================================
//  VALIDAÇÃO DE INPUTS
// =====================================================

/**
 * [MED-06] Valida formato de endereço de email.
 * Lança Error descritivo se o email for inválido.
 *
 * @param {string} email
 * @returns {string} Email normalizado (trim + lowercase)
 * @throws {Error}
 */
function validarEmail(email) {
  if (!email || typeof email !== 'string') {
    throw new Error('Email inválido: valor nulo ou não é string.');
  }
  const trimmed = email.trim().toLowerCase();
  const regex   = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  if (!regex.test(trimmed)) {
    throw new Error('Email inválido: "' + email + '". Formato esperado: usuario@dominio.com');
  }
  return trimmed;
}

// =====================================================
//  HTTP: Resposta JSON Padronizada
// =====================================================

/**
 * [CR-02 FIX / ARCH-02] Constrói resposta ContentService com código HTTP
 * embutido no corpo (campo _httpStatus) quando diferente de 200.
 *
 * LIMITAÇÃO: ContentService sempre retorna HTTP 200 no Apps Script.
 * O cliente DEVE checar body._httpStatus ou body.error em vez do HTTP status.
 * Ref: https://issuetracker.google.com/issues/36759757
 *
 * @param {object} data - Payload da resposta
 * @param {number} [httpCode=200] - Código HTTP lógico
 */
function jsonResponse(data, httpCode) {
  const statusCode = httpCode || 200;
  const body = (statusCode !== 200)
    ? Object.assign({ _httpStatus: statusCode }, data)
    : data;
  return ContentService
    .createTextOutput(JSON.stringify(body))
    .setMimeType(ContentService.MimeType.JSON);
}

// =====================================================
//  RATE LIMITING (Proteção de Quota)
// =====================================================

/**
 * [ARCH-06] Controle de Cota para evitar abuso da API Gemini.
 * Limita o número de análises (tokens) que um aluno pode solicitar ao
 * professor num período determinado.
 * Usa CacheService (Limite configurado: 15 chamadas por hora).
 *
 * @param {string} professorEmail
 * @param {string} alunoEmail
 * @returns {boolean} true se permitido, false se bloqueado por rate limit
 */
function verificarRateLimit(professorEmail, alunoEmail) {
  const cache = CacheService.getScriptCache();
  const rawKey = 'RATELIMIT_' + professorEmail + '_' + alunoEmail;
  const key = rawKey.replace(/[^a-zA-Z0-9_]/g, ''); // Remover chars especiais da chave
  
  let count = 0;
  const cached = cache.get(key);
  if (cached) {
    count = parseInt(cached, 10) || 0;
  }
  
  const LIMITE_POR_HORA = 15;
  if (count >= LIMITE_POR_HORA) {
    Logger.log(`[RateLimit] BLOQUEADO: ${alunoEmail} excedeu cota no professor ${professorEmail} (${count} chamadas).`);
    return false;
  }
  
  cache.put(key, (count + 1).toString(), 3600); // Expira em 1 hora (3600s)
  return true;
}


// =====================================================
//  PLANILHA GLOBAL: Acesso Padronizado
// =====================================================

/**
 * [ARCH-02] Retorna a aba 'Assinaturas' da Planilha Global.
 * Se a aba não existir mas a primeira aba tiver header 'Email',
 * usa-a como fallback. Caso contrário, lança erro crítico.
 *
 * @param {string} spreadsheetId
 * @returns {GoogleAppsScript.Spreadsheet.Sheet}
 */
function getPlanilhaGlobal(spreadsheetId) {
  const ss    = SpreadsheetApp.openById(spreadsheetId);
  let sheet   = ss.getSheetByName(SHEET_ASSINATURAS);
  if (!sheet) {
    sheet = ss.getSheets()[0];
    const firstHeader = sheet.getRange('A1').getValue();
    if (firstHeader !== 'Email') {
      throw new Error(
        'CRÍTICO: Aba "' + SHEET_ASSINATURAS + '" não encontrada e a primeira aba foi alterada. ' +
        'Os dados podem ter sido perdidos.'
      );
    }
  }
  return sheet;
}

/**
 * [ARCH-02] Busca o registro completo de um professor na Planilha Global.
 * Retorna null se não encontrado ou em caso de erro.
 *
 * @param {string} email
 * @param {string} adminSpreadsheetId
 * @returns {{ email, escola, status, usaChaveGlobal, chaveIndividual, spreadsheetId }|null}
 */
function buscarRegistroProfessor(email, adminSpreadsheetId) {
  try {
    const sheet   = getPlanilhaGlobal(adminSpreadsheetId);
    const data    = sheet.getDataRange().getValues();
    const h       = data[0];
    const emailCol  = h.indexOf('Email');
    const escolaCol = h.indexOf('Instituicao');
    const statusCol = h.indexOf('Status');
    const globalCol = h.indexOf('UsaChaveGlobal');
    const chaveCol  = h.indexOf('ChaveIndividual');
    const ssCol     = h.indexOf('SpreadsheetId');

    if (emailCol === -1) {
      throw new Error('Coluna "Email" não encontrada na aba Assinaturas.');
    }

    // Emails não diferenciam maiúsculas: a planilha pode ter grafia diferente da conta Google.
    const alvo = String(email || '').trim().toLowerCase();
    if (!alvo) return null;

    for (let i = 1; i < data.length; i++) {
      if (String(data[i][emailCol]).trim().toLowerCase() === alvo) {
        return {
          email:           data[i][emailCol],
          escola:          escolaCol !== -1 ? data[i][escolaCol] : '',
          status:          statusCol !== -1 ? data[i][statusCol] : '',
          usaChaveGlobal:  globalCol !== -1 ? data[i][globalCol] : '',
          chaveIndividual: chaveCol  !== -1 ? data[i][chaveCol]  : '',
          spreadsheetId:   ssCol     !== -1 ? data[i][ssCol]     : ''
        };
      }
    }
    return null;
  } catch (err) {
    Logger.log('[Utils] Erro ao buscar professor "' + email + '": ' + err);
    return null;
  }
}

// =====================================================
//  PARSING: JSON Robusto
// =====================================================

/**
 * [ARCH-02] Extrai um objeto JSON de strings que podem conter Markdown.
 * Tenta 3 estratégias em cascata antes de lançar erro.
 *
 * @param {string} texto - Resposta da IA (pode conter ```json ... ```)
 * @returns {object}
 * @throws {Error} Se nenhuma estratégia funcionar
 */
function extrairJSON(texto) {
  // 1. Parse direto
  try { return JSON.parse(texto); } catch (e) {}

  // 2. Bloco Markdown: ```json { ... } ``` ou ``` { ... } ```
  const mdMatch = texto.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (mdMatch && mdMatch[1]) {
    try { return JSON.parse(mdMatch[1].trim()); } catch (e) {}
  }

  // 3. Fallback: procurar pelo primeiro '{' e último '}' (evita regex gulosa quebrando JSONs múltiplos)
  try {
    const startIdx = texto.indexOf('{');
    const endIdx = texto.lastIndexOf('}');
    if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
      return JSON.parse(texto.substring(startIdx, endIdx + 1));
    }
  } catch (e) {}

  Logger.log('[Utils] extrairJSON: falhou nas estratégias. Texto: ' + texto.substring(0, 200));
  
  // Retorno Gracioso para não estourar a API do Cliente
  return {
    error: 'IA_PARSE_FALLBACK',
    message: 'A IA respondeu, mas não em um formato que o Whitebox consiga ler. Tente um trecho menor ou tente novamente.',
    riskEvidence: 'A IA respondeu, mas não foi possível estruturar os dados. Resposta bruta: ' + texto.substring(0, 150) + '...',
    pedagogicalAdvice: 'Tente analisar um trecho menor ou tente novamente em alguns instantes.',
    scoreIntegridade: null
  };
}

// =====================================================
//  FORMATAÇÃO
// =====================================================

/**
 * Retorna a data/hora atual como ISO 8601 (UTC).
 * Centralizado para consistência nos logs da planilha.
 * @returns {string}
 */
function isoNow() {
  return new Date().toISOString();
}
