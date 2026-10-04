/**
 * Script de Teste E2E: Validação da Auto-Configuração gravada no documento [ARCH-LIB]
 * Executar este teste no console do Apps Script do whitebox-server.
 *
 * Verifica o que só dá para confirmar no ambiente real:
 *   1. O servidor consegue gravar o WHITEBOX_CONFIG (NamedRange) no documento.
 *   2. A configuração sobrevive à cópia do documento — é o que o Classroom faz
 *      em STUDENT_COPY, e é disso que a designação do professor depende.
 */
function testarInjecaoMetadados() {
  const TEST_DOC_ID = '1-iOBoLbJ5JO2AdvHTnf4RUVV4WEup6KmaJVu8JbNkmM'; // ID fornecido pelo usuário
  const professorEmail = Session.getActiveUser().getEmail();
  const esperado = DOC_CONFIG_RANGE_PREFIX + JSON.stringify({ professorEmail: professorEmail });

  const lerConfig = function(docId) {
    return DocumentApp.openById(docId).getNamedRanges()
      .map(r => r.getName())
      .filter(n => n.indexOf(DOC_CONFIG_RANGE_PREFIX) === 0);
  };

  Logger.log('🚀 Iniciando Teste E2E para o Doc: ' + TEST_DOC_ID);

  let copia = null;
  try {
    // 1. Gravar (mesmo caminho usado na distribuição; substitui configurações antigas)
    _gravarConfigNoDocumento(TEST_DOC_ID, professorEmail);
    Logger.log('✅ Configuração gravada: ' + esperado);

    // 2. Verificação de Leitura no documento original
    const noOriginal = lerConfig(TEST_DOC_ID);
    if (noOriginal.length !== 1 || noOriginal[0] !== esperado) {
      throw new Error('Leitura no original difere do gravado: ' + JSON.stringify(noOriginal));
    }
    Logger.log('🔍 Verificação de Leitura: OK!');

    // 3. Verificação na cópia (simula o STUDENT_COPY do Classroom)
    copia = DriveApp.getFileById(TEST_DOC_ID).makeCopy('Whitebox - teste de cópia (pode apagar)');
    const naCopia = lerConfig(copia.getId());
    if (naCopia.length !== 1 || naCopia[0] !== esperado) {
      throw new Error('A configuração NÃO sobreviveu à cópia: ' + JSON.stringify(naCopia));
    }
    Logger.log('🏆 TESTE SUCESSO: a configuração acompanha a cópia do documento.');

  } catch (err) {
    Logger.log('❌ ERRO NO TESTE: ' + err.toString());
  } finally {
    if (copia) copia.setTrashed(true);
  }
}
