/**
 * =====================================================
 *  Whitebox — TestRunner.gs
 *  Testes Manuais das Funções Críticas
 * =====================================================
 *
 * [LOW-05] Como o GAS não suporta frameworks de teste nativos
 * (Jest, Jasmine), este arquivo implementa um runner manual
 * leve que pode ser executado via:
 *   - Apps Script IDE → Executar → selecionar função
 *   - clasp run <nomeDaFunção>
 *
 * COMO USAR:
 *   1. Execute runAllTests() para rodar todos os testes
 *   2. Execute funções individuais (test_*) para depurar casos específicos
 *   3. Verifique o Apps Script Dashboard (Execuções) para ver resultados
 *
 * CONVENÇÃO:
 *   - PASS: Função passou
 *   - FAIL: Função falhou com motivo
 *   - SKIP: Dependência externa ausente (ex: planilha não configurada)
 */

// =====================================================
//  RUNNER
// =====================================================

function runAllTests() {
  const results = [];
  const testFunctions = [
    test_validarEmail_valido,
    test_validarEmail_invalido,
    test_validarEmail_vazio,
    test_jsonResponse_comStatus,
    test_jsonResponse_status200,
    test_construirPromptSocratico_idiomaPtBR,
    test_detectarProvedorPorChave,
    test_getOrCreateTargetFolder_naoLancaErro,
    test_calcularHeatmapAluno_emailVazio,
    test_fecharFormulariosVencidos_semTriggerUid,
    test_getConfig_retorno
  ];

  Logger.log('[TestRunner] ========================================');
  Logger.log('[TestRunner] Iniciando suite: ' + testFunctions.length + ' testes');
  Logger.log('[TestRunner] ========================================');

  let passed = 0, failed = 0, skipped = 0;

  for (const fn of testFunctions) {
    const name = fn.name;
    try {
      const result = fn();
      if (result && result.skip) {
        Logger.log('[TestRunner] SKIP  | ' + name + ' | ' + result.reason);
        skipped++;
      } else {
        Logger.log('[TestRunner] PASS  | ' + name);
        passed++;
      }
    } catch (e) {
      Logger.log('[TestRunner] FAIL  | ' + name + ' | ' + e.message);
      failed++;
    }
  }

  Logger.log('[TestRunner] ========================================');
  Logger.log('[TestRunner] Resultado: ' + passed + ' PASS | ' + failed + ' FAIL | ' + skipped + ' SKIP');
  Logger.log('[TestRunner] ========================================');

  if (failed > 0) {
    throw new Error('[TestRunner] ' + failed + ' teste(s) falharam. Verifique os logs.');
  }
}

// =====================================================
//  HELPER: assert simples
// =====================================================

function assert(condition, message) {
  if (!condition) throw new Error(message || 'Assertion falhou');
}

function assertEquals(a, b, msg) {
  if (a !== b) throw new Error((msg || 'assertEquals') + ': esperado=' + b + ' obtido=' + a);
}

// =====================================================
//  TESTES: validarEmail (Utils.gs)
// =====================================================

function test_validarEmail_valido() {
  const result = validarEmail('professor@escola.edu.br');
  assertEquals(result, 'professor@escola.edu.br', 'Email válido deve ser retornado em lowercase');
}

function test_validarEmail_invalido() {
  let lancouErro = false;
  try {
    validarEmail('nao-eh-um-email');
  } catch (e) {
    lancouErro = true;
    assert(e.message.includes('Email inválido'), 'Mensagem de erro deve mencionar "Email inválido"');
  }
  assert(lancouErro, 'Deveria ter lançado Error para email inválido');
}

function test_validarEmail_vazio() {
  let lancouErro = false;
  try {
    validarEmail('');
  } catch (e) {
    lancouErro = true;
  }
  assert(lancouErro, 'Deveria ter lançado Error para string vazia');
}

// =====================================================
//  TESTES: jsonResponse (BrainProxy.gs)
// =====================================================

function test_jsonResponse_comStatus() {
  const resposta = jsonResponse({ error: 'NOT_FOUND' }, 404);
  const bodyText = resposta.getContent();
  const body     = JSON.parse(bodyText);
  assertEquals(body._httpStatus, 404, 'jsonResponse com 404 deve incluir _httpStatus=404');
  assertEquals(body.error, 'NOT_FOUND', 'jsonResponse deve preservar campos originais');
}

function test_jsonResponse_status200() {
  const resposta = jsonResponse({ success: true }, 200);
  const body     = JSON.parse(resposta.getContent());
  assert(!body._httpStatus, 'jsonResponse com 200 NÃO deve incluir _httpStatus');
  assertEquals(body.success, true, 'Campo success deve ser preservado');
}

// =====================================================
//  TESTES: construirPromptSocratico (BrainProxy.gs)
// =====================================================

function test_construirPromptSocratico_idiomaPtBR() {
  const metricas = { editRatio: 0.3, pasteEvents: { count: 2 }, activeFocusTimeMinutes: 15 };
  const prompt   = construirPromptSocratico('Texto de teste do aluno.', metricas);
  assert(typeof prompt === 'string', 'Prompt deve ser string');
  assert(prompt.includes('português brasileiro'), 'Prompt deve conter instrução de idioma pt-BR');
  assert(prompt.includes('riskScore'), 'Prompt deve incluir campo riskScore no JSON');
  assert(prompt.includes('suggestedQuestion'), 'Prompt deve incluir campo suggestedQuestion');
}

// =====================================================
//  TESTES: detectarProvedorPorChave (IAProviders.gs)
// =====================================================

function test_detectarProvedorPorChave() {
  assertEquals(detectarProvedorPorChave('AIzaSyExemplo'), 'gemini', 'Chave AIza... é do Gemini');
  assertEquals(detectarProvedorPorChave('sk-ant-api03-exemplo'), 'claude', 'Chave sk-ant-... é do Claude');
  assertEquals(detectarProvedorPorChave('1BxiMVs0XRY5IdDoArquivoNoDrive'), null, 'ID de cofre no Drive não é chave');
  assertEquals(detectarProvedorPorChave(''), null, 'Vazio não é chave');
}

// =====================================================
//  TESTES: getOrCreateTargetFolder (AdminSetup.gs)
// =====================================================

function test_getOrCreateTargetFolder_naoLancaErro() {
  // Smoke test: garante que a função não lança exceção ao ser chamada
  const folder = getOrCreateTargetFolder();
  assert(folder !== null && folder !== undefined, 'getOrCreateTargetFolder deve retornar um objeto Folder');
  assert(typeof folder.getName === 'function', 'Objeto retornado deve ser um Folder do Drive');
  assertEquals(folder.getName(), 'WhiteBox', 'Pasta retornada deve se chamar WhiteBox');
}

// =====================================================
//  TESTES: calcularHeatmapAluno (BrainProxy.gs)
// =====================================================

function test_calcularHeatmapAluno_emailVazio() {
  const result = calcularHeatmapAluno('');
  assert(Array.isArray(result.labels),  'Resultado deve ter labels[]');
  assert(Array.isArray(result.valores), 'Resultado deve ter valores[]');
  assert(Array.isArray(result.alertas), 'Resultado deve ter alertas[]');
  assertEquals(result.labels.length, 0, 'Email vazio deve retornar arrays vazios');
}

// =====================================================
//  TESTES: fecharFormulariosVencidos (FormOnboarding.gs)
// =====================================================

function test_fecharFormulariosVencidos_semTriggerUid() {
  // Deve retornar sem lançar exceção quando triggerUid está ausente
  // Verifica que o guard [HIGH-05] funciona corretamente
  let lancouErro = false;
  try {
    fecharFormulariosVencidos({}); // e sem triggerUid
  } catch (e) {
    lancouErro = true;
  }
  assert(!lancouErro, 'fecharFormulariosVencidos sem triggerUid NÃO deve lançar exceção — deve retornar silenciosamente');
}

// =====================================================
//  TESTES: getConfig (Utils.gs - Server)
// =====================================================

function test_getConfig_retorno() {
  const config = getConfig();
  assert(typeof config === 'object', 'getConfig deve retornar um objeto');
  // Se estiver configurado (em ambiente de prod/dev real), os campos devem existir
  // Não fazemos assert de valores específicos para não quebrar em ambientes limpos
}
