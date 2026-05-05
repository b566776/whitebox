/**
 * Script de Teste E2E: Validação de Injeção de Metadados [ARCH-LIB]
 * Executar este teste no console do Apps Script do whitebox-server.
 */
function testarInjecaoMetadados() {
  const TEST_DOC_ID = '1-iOBoLbJ5JO2AdvHTnf4RUVV4WEup6KmaJVu8JbNkmM'; // ID fornecido pelo usuário
  const professorEmail = Session.getActiveUser().getEmail();
  
  Logger.log('🚀 Iniciando Teste E2E para o Doc: ' + TEST_DOC_ID);
  
  try {
    // 1. Simular a configuração do Proxy (garantir que temos URL e Token)
    const cfg = getConfig();
    if (!cfg.proxyUrl || !cfg.sharedToken) {
      throw new Error('Script Properties do Servidor incompleto: BRAIN_PROXY_URL ou SHARED_TOKEN ausente.');
    }
    
    // 2. Abrir o Documento
    const doc = DocumentApp.openById(TEST_DOC_ID);
    
    // 3. Limpar metadados antigos para o teste ser limpo
    const oldMeta = doc.getDeveloperMetadata().filter(m => m.getKey() === 'WHITEBOX_CONFIG');
    oldMeta.forEach(m => m.remove());
    Logger.log('🧹 Metadados antigos removidos.');

    // 4. Injetar novos metadados (Simulando o fluxo de distribuirMestreParaProfessor)
    const configObj = {
      proxyUrl:    cfg.proxyUrl,
      sharedToken: cfg.sharedToken
    };
    
    doc.addDeveloperMetadata('WHITEBOX_CONFIG', JSON.stringify(configObj));
    Logger.log('✅ Novos metadados injetados: ' + JSON.stringify(configObj));

    // 5. Verificação de Leitura
    const checkMeta = doc.getDeveloperMetadata().filter(m => m.getKey() === 'WHITEBOX_CONFIG');
    if (checkMeta.length > 0) {
      const valorRecuperado = checkMeta[0].getValue();
      Logger.log('🔍 Verificação de Leitura: OK! Valor: ' + valorRecuperado);
      
      if (valorRecuperado === JSON.stringify(configObj)) {
        Logger.log('🏆 TESTE SUCESSO: O documento está devidamente preparado para a auto-configuração do Cliente.');
      } else {
        Logger.log('❌ FALHA: O valor recuperado difere do injetado.');
      }
    } else {
      throw new Error('Falha crítica: Metadado não encontrado após a injeção.');
    }

  } catch (err) {
    Logger.log('❌ ERRO NO TESTE: ' + err.toString());
  }
}
