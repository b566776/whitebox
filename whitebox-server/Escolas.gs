/**
 * =====================================================
 *  Whitebox — Escolas.gs (modo do painel por escola)
 * =====================================================
 *
 * Cada escola escolhe, na aba "Escolas" da Planilha Global:
 *   - Tipo_Conta:  'workspace' (contas da escola, Google Workspace for Education) ou
 *                  'gmail' (contas pessoais @gmail);
 *   - Modo_Painel: 'addon' (painel vem do add-on publicado, que o aluno não edita) ou
 *                  'script_vinculado' (painel vem do script copiado junto com o documento,
 *                  que o aluno é dono e pode editar; modo antigo).
 *
 * A escola de um professor é a coluna Instituicao da aba Assinaturas, nunca o domínio do
 * e-mail (contas @gmail não dizem a escola).
 *
 * Contas @gmail com add-on ficam TRAVADAS até o administrador ligar a Script Property
 * GMAIL_ADDON_LIBERADO = 'sim'. Ligar só depois de: verificação OAuth do Google concluída
 * (escopos sensíveis, nunca restritos), etapa 3 do Radar no ar, termo de consentimento
 * dos responsáveis e servidor fora da conta pessoal. Enquanto travado, a escola segue no
 * modo 'script_vinculado' e o motivo aparece em configEscola().motivo.
 *
 * No modo 'addon', o servidor só aceita medições do Radar vindas dos IDs de cliente OAuth
 * listados na Script Property ADDON_CLIENT_IDS (separados por vírgula): o token do add-on
 * publicado traz o ID de cliente do projeto do add-on; o script editado por um aluno traz
 * outro. Ver origemDoRadar().
 */

const SHEET_ESCOLAS = 'Escolas';
const ESCOLAS_HEADERS = ['Instituicao', 'Tipo_Conta', 'Modo_Painel', 'Observacao'];

const TIPO_CONTA_WORKSPACE = 'workspace';
const TIPO_CONTA_GMAIL     = 'gmail';
const MODO_PAINEL_ADDON    = 'addon';
const MODO_PAINEL_SCRIPT   = 'script_vinculado';

const PROP_GMAIL_ADDON_LIBERADO = 'GMAIL_ADDON_LIBERADO';
const PROP_ADDON_CLIENT_IDS     = 'ADDON_CLIENT_IDS';

/** Chave da aba Config com o documento semente sem script vinculado (escolas em modo addon). */
const CONFIG_KEY_SEED_DOC_ID_ADDON = 'seed_document_id_addon';

/** Normaliza o nome da escola para comparação. */
function _chaveEscola(nome) {
  return String(nome || '').trim().toLowerCase();
}

/**
 * Configuração efetiva de uma escola (puro, testável).
 *
 * Sem linha na aba Escolas, a escola fica no modo antigo (workspace + script_vinculado),
 * para não mudar nada em quem já usa o Whitebox.
 *
 * @param {string} instituicao
 * @param {Array|null} linha        - [Instituicao, Tipo_Conta, Modo_Painel, ...] ou null
 * @param {boolean} gmailLiberado   - Script Property GMAIL_ADDON_LIBERADO === 'sim'
 * @returns {{ instituicao: string, tipoConta: string, modoPainel: string,
 *             modoPedido: string, travado: boolean, motivo: string }}
 */
function resolverConfigEscola(instituicao, linha, gmailLiberado) {
  const tipo = String((linha && linha[1]) || '').trim().toLowerCase();
  const modo = String((linha && linha[2]) || '').trim().toLowerCase();
  const tipoConta  = tipo === TIPO_CONTA_GMAIL ? TIPO_CONTA_GMAIL : TIPO_CONTA_WORKSPACE;
  const modoPedido = modo === MODO_PAINEL_ADDON ? MODO_PAINEL_ADDON : MODO_PAINEL_SCRIPT;
  const res = {
    instituicao: String(instituicao || ''),
    tipoConta:   tipoConta,
    modoPainel:  modoPedido,
    modoPedido:  modoPedido,
    travado:     false,
    motivo:      ''
  };
  if (tipoConta === TIPO_CONTA_GMAIL && modoPedido === MODO_PAINEL_ADDON && !gmailLiberado) {
    res.modoPainel = MODO_PAINEL_SCRIPT;
    res.travado    = true;
    res.motivo     = 'Add-on para contas @gmail ainda não liberado (falta verificação OAuth do Google, ' +
                     'etapa 3 do Radar, consentimento dos responsáveis e servidor fora da conta pessoal). ' +
                     'A escola segue no modo script_vinculado.';
  }
  return res;
}

/** Lê uma Script Property de lista separada por vírgula. @private */
function _listaDaPropriedade(nome) {
  const v = PropertiesService.getScriptProperties().getProperty(nome) || '';
  return v.split(',').map(s => s.trim()).filter(Boolean);
}

/** true se o administrador liberou o add-on para escolas de contas @gmail. */
function gmailAddonLiberado() {
  const v = PropertiesService.getScriptProperties().getProperty(PROP_GMAIL_ADDON_LIBERADO) || '';
  return v.trim().toLowerCase() === 'sim';
}

/**
 * Configuração da escola pelo nome (coluna Instituicao). Cache de 5 min.
 * @param {string} instituicao
 * @param {string} adminSpreadsheetId
 */
function configEscola(instituicao, adminSpreadsheetId) {
  const chave = _chaveEscola(instituicao);
  const cache = CacheService.getScriptCache();
  const cacheKey = 'ESCOLA_' + Utilities.base64EncodeWebSafe(
    Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, chave));
  let linha = null;
  const guardado = cache.get(cacheKey);
  if (guardado !== null) {
    try { linha = JSON.parse(guardado); } catch (e) { linha = null; }
  } else {
    try {
      const sheet = SpreadsheetApp.openById(adminSpreadsheetId).getSheetByName(SHEET_ESCOLAS);
      if (sheet && sheet.getLastRow() >= 2 && chave) {
        const vals = sheet.getRange(2, 1, sheet.getLastRow() - 1, ESCOLAS_HEADERS.length).getValues();
        for (let i = 0; i < vals.length; i++) {
          if (_chaveEscola(vals[i][0]) === chave) { linha = vals[i]; break; }
        }
      }
      cache.put(cacheKey, JSON.stringify(linha), 300);
    } catch (e) {
      Logger.log('[Escolas] Erro ao ler a aba Escolas: ' + e);
    }
  }
  return resolverConfigEscola(instituicao, linha, gmailAddonLiberado());
}

/**
 * De onde veio uma chamada do painel (puro, testável).
 * @param {string} clientId           - ID de cliente OAuth do token (azp/aud)
 * @param {string[]} idsDoAddon       - Script Property ADDON_CLIENT_IDS
 * @returns {string} 'addon' se o token é do add-on publicado; senão 'script_vinculado'
 */
function origemDoCliente(clientId, idsDoAddon) {
  return (clientId && (idsDoAddon || []).indexOf(String(clientId)) !== -1)
    ? MODO_PAINEL_ADDON : MODO_PAINEL_SCRIPT;
}

/**
 * Decide se o servidor aceita medições do Radar desta origem (puro, testável).
 * No modo addon, só o add-on publicado; sem IDs configurados, recusa tudo e diz por quê
 * (falha fechada: aceitar qualquer origem anularia o modo addon).
 * @returns {{ ok: boolean, origem: string, erro?: string, message?: string }}
 */
function origemDoRadar(cfgEscola, clientId, idsDoAddon) {
  const origem = origemDoCliente(clientId, idsDoAddon);
  if (cfgEscola.modoPainel !== MODO_PAINEL_ADDON) return { ok: true, origem: origem };
  if (!idsDoAddon || idsDoAddon.length === 0) {
    return { ok: false, origem: origem, erro: 'ADDON_NAO_CONFIGURADO',
             message: 'Escola em modo add-on, mas ADDON_CLIENT_IDS não está configurado no servidor.' };
  }
  if (origem !== MODO_PAINEL_ADDON) {
    return { ok: false, origem: origem, erro: 'ORIGEM_NAO_AUTORIZADA',
             message: 'Esta escola usa o add-on do Whitebox. Abra o painel pelo menu Extensões > Whitebox.' };
  }
  return { ok: true, origem: origem };
}

/** IDs de cliente OAuth do add-on publicado (Script Property ADDON_CLIENT_IDS). */
function idsDoAddon() {
  return _listaDaPropriedade(PROP_ADDON_CLIENT_IDS);
}

/** Valor da aba Config da Planilha Global, ou '' se faltar. */
function lerConfigGlobal(adminSpreadsheetId, parametro) {
  try {
    const sheet = SpreadsheetApp.openById(adminSpreadsheetId).getSheetByName(SHEET_CONFIG);
    if (!sheet) return '';
    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === parametro) return String(data[i][1] || '').trim();
    }
  } catch (e) {
    Logger.log('[Escolas] Erro ao ler Config "' + parametro + '": ' + e);
  }
  return '';
}

/**
 * Documento semente do mestre conforme o modo da escola do professor (puro, testável).
 * Modo addon usa o semente sem script vinculado; se ele faltar, cai no semente comum (que
 * ainda funciona, mas leva o script editável junto) e avisa.
 * @returns {{ seedId: string, aviso: string }}
 */
function escolherSemente(cfgEscola, seedComum, seedAddon) {
  if (cfgEscola && cfgEscola.modoPainel === MODO_PAINEL_ADDON) {
    if (seedAddon) return { seedId: seedAddon, aviso: '' };
    return { seedId: seedComum, aviso: 'Escola em modo add-on, mas "' + CONFIG_KEY_SEED_DOC_ID_ADDON +
             '" não está na aba Config: usado o semente com script vinculado.' };
  }
  return { seedId: seedComum, aviso: '' };
}
