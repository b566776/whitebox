/**
 * =====================================================
 *  Whitebox — SchemaManager.gs (Servidor)
 * =====================================================
 *
 * [ARCH-05] Gerenciamento de versão e integridade do schema
 * da Planilha Global de Administração.
 *
 * MOTIVAÇÃO (HIGH-03):
 *   Um índice de coluna hardcoded `data[i][5]` causou leitura silenciosa
 *   do campo errado quando uma nova coluna foi inserida antes de
 *   'SpreadsheetId'. O sistema continuou funcionando com dados incorretos
 *   por tempo indeterminado.
 *
 * SOLUÇÃO:
 *   - Campo `VersaoSchema` na aba Config identifica a versão da estrutura.
 *   - `verificarSchemaGlobal()` valida que todas as colunas obrigatórias
 *     estão presentes com os nomes corretos.
 *   - `migrarSchemaSeNecessario()` executa migrações incrementais e
 *     atualiza a versão no Config.
 *
 * POLÍTICA DE VERSÕES:
 *   v1 → v2: Adição do campo 'DataCadastro' na aba Assinaturas
 *   (defina migrações futuras como funções _migrarV2ParaV3(), etc.)
 */

// SCHEMA_VERSION_ATUAL → ver Constants.gs
// [ARCH-03/05] Definida em Constants.gs para consistência com os demais literais.

// =====================================================
//  SCHEMA ESPERADO: Definição canônica de cada aba
// =====================================================

/**
 * Colunas obrigatórias de cada aba da Planilha Global.
 * Chave: nome da aba. Valor: array de nomes de colunas na ordem correta.
 *
 * REGRA: Sempre usar `.indexOf()` para resolver colunas em runtime.
 * Nunca assumir um índice numérico fixo.
 */
const SCHEMA_GLOBAL = {
  'Assinaturas': [
    'Email', 'Instituicao', 'Status',
    'UsaChaveGlobal', 'ChaveIndividual', 'SpreadsheetId', 'DataCadastro'
  ],
  'Config': [
    'Parametro', 'Valor', 'Descricao'
  ],
  'Tarefas_Globais': [
    'ID_Tarefa', 'Professor', 'Instituicao', 'Titulo', 'Course_ID', 'Data_Criacao'
  ],
  'Ranking_Instituicao': [
    'Instituicao', 'Total_Professores', 'Total_Alunos', 'Media_Autonomia_IA', 'Ultima_Atualizacao'
  ]
};

/**
 * Colunas obrigatórias da aba Logs de cada professor.
 * Usadas por verificarSchemaProfessor() para validar planilhas individuais.
 */
const SCHEMA_LOGS_PROFESSOR = [
  'Timestamp', 'Turma', 'DocId', 'Email_Aluno',
  'Palavras', 'Tempo_Ativo_Min', 'Colar_Eventos',
  'Taxa_Edicao', 'Alteracoes_Estrutura',
  'Chars_Adicionados', 'Chars_Deletados', 'Colagem_Massiva',
  'Cpm_Medio', 'Cpm_Pico',
  'RiscoScore', 'Whitebox_Risco', 'Conselho_Pedagogico',
  'Pergunta_Socratica', 'Modo_IA', 'Entrega_Final'
];

// =====================================================
//  LEITURA DO SCHEMA: Versão atual na planilha
// =====================================================

/**
 * Lê a versão do schema armazenada na aba Config da Planilha Global.
 * Retorna 0 se a chave não existir (planilha pré-ARCH-05).
 *
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 * @returns {number}
 */
function lerVersaoSchema(ss) {
  try {
    const configSheet = ss.getSheetByName(SHEET_CONFIG);
    if (!configSheet) return 0;

    const data = configSheet.getDataRange().getValues();
    const paramCol = data[0].indexOf('Parametro');
    const valorCol = data[0].indexOf('Valor');
    if (paramCol === -1 || valorCol === -1) return 0;

    for (let i = 1; i < data.length; i++) {
      if (data[i][paramCol] === 'VersaoSchema') {
        return parseInt(data[i][valorCol]) || 0;
      }
    }
    return 0;
  } catch (e) {
    Logger.log('[SchemaManager] Erro ao ler VersaoSchema: ' + e);
    return 0;
  }
}

/**
 * Grava (ou atualiza) a versão do schema na aba Config.
 *
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 * @param {number} versao
 */
function gravarVersaoSchema(ss, versao) {
  const configSheet = ss.getSheetByName(SHEET_CONFIG);
  if (!configSheet) {
    Logger.log('[SchemaManager] Aba Config ausente — não foi possível gravar VersaoSchema.');
    return;
  }

  const data     = configSheet.getDataRange().getValues();
  const paramCol = data[0].indexOf('Parametro');
  const valorCol = data[0].indexOf('Valor');
  if (paramCol === -1 || valorCol === -1) return;

  // Atualizar linha existente
  for (let i = 1; i < data.length; i++) {
    if (data[i][paramCol] === 'VersaoSchema') {
      configSheet.getRange(i + 1, valorCol + 1).setValue(versao);
      Logger.log('[SchemaManager] VersaoSchema atualizada para: ' + versao);
      return;
    }
  }

  // Inserir nova linha
  configSheet.appendRow(['VersaoSchema', versao, 'Versão do schema da Planilha Global (ARCH-05)']);
  Logger.log('[SchemaManager] VersaoSchema inserida: ' + versao);
}

// =====================================================
//  VERIFICAÇÃO: Integridade das colunas
// =====================================================

/**
 * [ARCH-05] Verifica se todas as abas e colunas obrigatórias existem
 * na Planilha Global. Detecta inconsistências antes que causem bugs silenciosos.
 *
 * @param {string} adminSpreadsheetId
 * @returns {{
 *   ok: boolean,
 *   versaoAtual: number,
 *   versaoEsperada: number,
 *   abas: { nome: string, ok: boolean, colunasFaltando: string[], colunasExtras: string[] }[],
 *   mensagem: string
 * }}
 */
function verificarSchemaGlobal(adminSpreadsheetId) {
  const ss = SpreadsheetApp.openById(adminSpreadsheetId);
  const versaoAtual = lerVersaoSchema(ss);
  const resultado   = {
    ok:              true,
    versaoAtual:     versaoAtual,
    versaoEsperada:  SCHEMA_VERSION_ATUAL,
    abas:            [],
    mensagem:        ''
  };

  for (const nomeAba in SCHEMA_GLOBAL) {
    const sheet = ss.getSheetByName(nomeAba);
    const abaCheck = { nome: nomeAba, ok: true, colunasFaltando: [], colunasExtras: [] };

    if (!sheet) {
      abaCheck.ok = false;
      abaCheck.colunasFaltando = SCHEMA_GLOBAL[nomeAba];
      resultado.ok = false;
      resultado.abas.push(abaCheck);
      Logger.log('[SchemaManager] ABA AUSENTE: ' + nomeAba);
      continue;
    }

    const headersAtivos   = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const headersEsperados = SCHEMA_GLOBAL[nomeAba];

    // Colunas que deveriam existir mas não existem
    abaCheck.colunasFaltando = headersEsperados.filter(h => !headersAtivos.includes(h));

    // Colunas extras (informativo — não é erro, apenas rastreado)
    abaCheck.colunasExtras   = headersAtivos.filter(h => h !== '' && !headersEsperados.includes(h));

    if (abaCheck.colunasFaltando.length > 0) {
      abaCheck.ok  = false;
      resultado.ok = false;
    }

    resultado.abas.push(abaCheck);
  }

  // Verificar divergência de versão
  if (versaoAtual < SCHEMA_VERSION_ATUAL) {
    resultado.ok      = false;
    resultado.mensagem = 'Schema desatualizado: v' + versaoAtual + ' → v' + SCHEMA_VERSION_ATUAL +
                         '. Execute migrarSchemaSeNecessario() para atualizar.';
  } else if (resultado.ok) {
    resultado.mensagem = 'Schema v' + versaoAtual + ' ✅ Todas as colunas obrigatórias presentes.';
  } else {
    resultado.mensagem = 'Schema v' + versaoAtual + ' ⚠️ Inconsistências detectadas. Verifique as abas reportadas.';
  }

  Logger.log('[SchemaManager] verificarSchemaGlobal: ' + resultado.mensagem);
  return resultado;
}

/**
 * [ARCH-05] Verifica a aba Logs de uma planilha individual de professor.
 * Útil após migrations que adicionam novas colunas ao schema de logs.
 *
 * @param {string} profSpreadsheetId
 * @returns {{ ok: boolean, colunasFaltando: string[], email: string }}
 */
function verificarSchemaProfessor(profSpreadsheetId) {
  try {
    const ss        = SpreadsheetApp.openById(profSpreadsheetId);
    const logSheet  = ss.getSheetByName(SHEET_LOGS);
    if (!logSheet) return { ok: false, colunasFaltando: SCHEMA_LOGS_PROFESSOR };

    const headers = logSheet.getRange(1, 1, 1, logSheet.getLastColumn()).getValues()[0];
    const faltando = SCHEMA_LOGS_PROFESSOR.filter(h => !headers.includes(h));

    return {
      ok:              faltando.length === 0,
      colunasFaltando: faltando,
      spreadsheetId:   profSpreadsheetId
    };
  } catch (e) {
    Logger.log('[SchemaManager] Erro ao verificar schema do professor ' + profSpreadsheetId + ': ' + e);
    return { ok: false, colunasFaltando: [], error: e.toString() };
  }
}

// =====================================================
//  MIGRAÇÃO: Schema incremental
// =====================================================

/**
 * [ARCH-05] Ponto de entrada para migrações de schema.
 * Executa migrações em sequência da versão atual até SCHEMA_VERSION_ATUAL.
 * Idempotente: seguro para executar múltiplas vezes.
 *
 * @param {string} adminSpreadsheetId
 * @returns {{ migracoes: string[], versaoFinal: number }}
 */
function migrarSchemaSeNecessario(adminSpreadsheetId) {
  const ss          = SpreadsheetApp.openById(adminSpreadsheetId);
  const versaoAtual = lerVersaoSchema(ss);
  const migracoes   = [];

  if (versaoAtual >= SCHEMA_VERSION_ATUAL) {
    Logger.log('[SchemaManager] Nenhuma migração necessária (v' + versaoAtual + ' = atual).');
    return { migracoes: [], versaoFinal: versaoAtual };
  }

  Logger.log('[SchemaManager] Iniciando migração v' + versaoAtual + ' → v' + SCHEMA_VERSION_ATUAL);

  // ---- Migração v0 → v1: schema base (criado pelo setupPlanilhaGlobal) ----
  if (versaoAtual < 1) {
    // Nada a migrar estruturalmente: schema v1 é criado pelo setup.
    // Apenas registrar a versão em planilhas pré-ARCH-05.
    migracoes.push('v0→v1: VersaoSchema registrada (schema base existente).');
    gravarVersaoSchema(ss, 1);
  }

  // ---- Migração v1 → v2: Adicionar 'DataCadastro' se ausente ----
  if (versaoAtual < 2) {
    migracoes.push(..._migrarV1ParaV2(ss));
    gravarVersaoSchema(ss, 2);
  }

  // ---- Adicione futuras migrações aqui ----
  // if (versaoAtual < 3) {
  //   migracoes.push(..._migrarV2ParaV3(ss));
  //   gravarVersaoSchema(ss, 3);
  // }

  const versaoFinal = lerVersaoSchema(ss);
  Logger.log('[SchemaManager] Migração concluída. Versão final: v' + versaoFinal);
  return { migracoes, versaoFinal };
}

/**
 * Migração v1 → v2: Adiciona a coluna 'DataCadastro' na aba Assinaturas
 * para planilhas criadas antes do ARCH-05 (que não tinham esse campo).
 *
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 * @returns {string[]} Log das ações executadas
 */
function _migrarV1ParaV2(ss) {
  const log   = [];
  const sheet = ss.getSheetByName(SHEET_ASSINATURAS);
  if (!sheet) {
    log.push('v1→v2: Aba Assinaturas ausente — migração pulada.');
    return log;
  }

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  if (headers.includes('DataCadastro')) {
    log.push('v1→v2: DataCadastro já presente — nada a fazer.');
    return log;
  }

  // Adicionar coluna ao final dos headers
  const novaColuna = sheet.getLastColumn() + 1;
  sheet.getRange(1, novaColuna).setValue('DataCadastro').setFontWeight('bold');

  // Preencher linhas existentes com 'N/A (pré-ARCH-05)' como valor sentinel
  const numRows = sheet.getLastRow() - 1;
  if (numRows > 0) {
    const filler = Array(numRows).fill(['N/A (pré-ARCH-05)']);
    sheet.getRange(2, novaColuna, numRows, 1).setValues(filler);
  }

  log.push('v1→v2: Coluna DataCadastro adicionada à aba Assinaturas (' + numRows + ' linhas preenchidas).');
  Logger.log('[SchemaManager] ' + log[log.length - 1]);
  return log;
}

// =====================================================
//  EXPOSIÇÃO ADMIN: Para Dashboard e doGet
// =====================================================

/**
 * [ARCH-05] Retorna o resultado de verificarSchemaGlobal para o Dashboard Admin.
 * Chamado via google.script.run pelo HTML do Dashboard.
 *
 * @param {string} token - SHARED_TOKEN para autenticação
 * @returns {object} Resultado de verificarSchemaGlobal()
 */
function getSchemaStatus(token) {
  validateAdminAccess(token);
  const cfg = getConfig();
  return verificarSchemaGlobal(cfg.adminSpreadsheetId);
}

/**
 * [ARCH-05] Executa migrações pendentes via Dashboard Admin.
 * Chamado via google.script.run pelo HTML do Dashboard.
 *
 * @param {string} token - SHARED_TOKEN para autenticação
 * @returns {object} Resultado de migrarSchemaSeNecessario()
 */
function executarMigracoes(token) {
  validateAdminAccess(token);
  const cfg = getConfig();
  return migrarSchemaSeNecessario(cfg.adminSpreadsheetId);
}
