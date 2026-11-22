/**
 * ========================================================
 *  Whitebox - Módulo de Onboarding (Formulários Semente)
 * ========================================================
 */

/**
 * Cria o Formulário Semente original.
 * Esta função deve ser executada apenas 1 vez para gerar o template base.
 */
function setupFormularioSemente() {
  const form = FormApp.create('Whitebox - Onboarding (Semente)');
  
  form.setTitle('Cadastro de Professor - Whitebox')
      .setDescription('Seja bem-vindo ao ecossistema Whitebox. Preencha os dados abaixo para provisionar seu ambiente de auditoria pedagógica.')
      .setConfirmationMessage('Recebemos seus dados! Você receberá um e-mail em instantes com o link da sua planilha individual.')
      .setAllowResponseEdits(false)
      .setCollectEmail(true);

  // Itens obrigatórios
  form.addTextItem().setTitle('Seu Nome Completo').setRequired(true);
  form.addTextItem().setTitle('Instituição / Escola').setRequired(true);
  form.addTextItem().setTitle(FORM_FIELD_LINK_COFRE)
      .setHelpText(textoAjudaCofre())
      .setRequired(false);

  // Forçar o Google a processar o formulário
  form.setAcceptingResponses(true);
  
  const formId = form.getId();
  const cfg    = getConfig();
  const ss     = SpreadsheetApp.openById(cfg.adminSpreadsheetId);
  let configTab = ss.getSheetByName('Config');

  if (!configTab) {
    configTab = ss.insertSheet('Config');
    // [LOW-03 FIX] Usar header canônico ['Parametro', 'Valor', 'Descricao']
    // consistente com AdminSetup.gs — evita conflito de schema na leitura.
    configTab.appendRow(['Parametro', 'Valor', 'Descricao']);
  }

  // Verificar se a linha já existe para não duplicar
  const data  = configTab.getDataRange().getValues();
  let found   = false;
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === 'seed_form_id') {
      configTab.getRange(i + 1, 2).setValue(formId);
      found = true;
      break;
    }
  }

  if (!found) {
    // [LOW-03] Terceira coluna obrigatória para manter schema ['Parametro', 'Valor', 'Descricao']
    configTab.appendRow(['seed_form_id', formId, 'ID do Form Semente para Onboarding']);
  }

  // Mover para a pasta alvo
  const targetFolder = getOrCreateTargetFolder();
  DriveApp.getFileById(formId).moveTo(targetFolder);

  Logger.log('Formulário Semente configurado com ID: ' + formId);
  return formId;
}

/**
 * Texto de ajuda da pergunta do Cofre, com o e-mail da conta que executa o servidor
 * (é ela que precisa ler o arquivo .txt do professor).
 */
function textoAjudaCofre() {
  const emailDev = Session.getEffectiveUser().getEmail() || 'a conta do desenvolvedor do Whitebox';
  return FORM_HELP_LINK_COFRE.replace('{EMAIL_DEV}', emailDev);
}

/**
 * O Google Forms não atualiza formulários já criados quando o código muda.
 * Reaplica o texto de ajuda atual na pergunta do Cofre de todos os formulários de
 * onboarding desta conta (semente e levas). Executar no editor após mudar o texto;
 * organizarPastasWhitebox() também chama esta função.
 * @returns {number} quantidade de formulários atualizados
 */
function atualizarAjudaFormulariosOnboarding() {
  const ajuda = textoAjudaCofre();
  const files = DriveApp.searchFiles(
    "mimeType = 'application/vnd.google-apps.form' and title contains 'Whitebox - Onboarding' " +
    "and 'me' in owners and trashed = false");
  let total = 0;
  while (files.hasNext()) {
    const file = files.next();
    try {
      const itens = FormApp.openById(file.getId()).getItems(FormApp.ItemType.TEXT);
      for (let i = 0; i < itens.length; i++) {
        if (itens[i].getTitle() === FORM_FIELD_LINK_COFRE) {
          itens[i].setHelpText(ajuda);
          total++;
        }
      }
    } catch (err) {
      Logger.log('[Onboarding] Não foi possível atualizar o formulário ' + file.getId() + ': ' + err);
    }
  }
  Logger.log('[Onboarding] Ajuda do Cofre atualizada em ' + total + ' formulário(s).');
  return total;
}

/**
 * Função executada via Dashboard para gerar uma nova Leva (Criação Direta)
 * @param {string} token Token do Admin
 * @param {string} nomeLeva Nome da Leva (ex: Turma 2026/1)
 * @param {string} dataLimite Data e hora limite no formato 'YYYY-MM-DDTHH:mm'
 */
function gerarLevaOnboarding(token, nomeLeva, dataLimite) {
  validateAdminAccess(token);
  
  // 1. Criar um NOVO Formulário do zero (Bypassa o erro de clonagem do Google)
  const novoForm = FormApp.create(ONBOARDING_FORM_PREFIXO + nomeLeva);
  
  novoForm.setTitle('Cadastro de Professor - ' + nomeLeva)
          .setDescription('Seja bem-vindo ao ecossistema Whitebox. Preencha os dados abaixo para provisionar seu ambiente de auditoria pedagógica.')
          .setConfirmationMessage('Recebemos seus dados! Você receberá um e-mail em instantes com o link da sua planilha individual.')
          .setAllowResponseEdits(false)
          .setCollectEmail(true)
          .setAcceptingResponses(true);

  // Itens do formulário
  novoForm.addTextItem().setTitle('Seu Nome Completo').setRequired(true);
  novoForm.addTextItem().setTitle('Instituição / Escola').setRequired(true);
  novoForm.addTextItem().setTitle(FORM_FIELD_LINK_COFRE)
          .setHelpText(textoAjudaCofre())
          .setRequired(false);

  const formId = novoForm.getId();
  const formUrl = novoForm.getPublishedUrl();

  // 2. Mover para a pasta do Whitebox
  const targetFolder = getOrCreateTargetFolder();
  DriveApp.getFileById(formId).moveTo(targetFolder);

  // 3. Criar o gatilho onSubmit para este formulário específico
  ScriptApp.newTrigger('onProfessorFormSubmit')
           .forForm(novoForm)
           .onFormSubmit()
           .create();
           
  // 4. Criar o gatilho temporal para fechar o formulário (Deadline)
  if (dataLimite) {
    const limitDate = new Date(dataLimite);
    const triggerId = ScriptApp.newTrigger('fecharFormulariosVencidos')
                               .timeBased()
                               .at(limitDate)
                               .create()
                               .getUniqueId();
                               
    const props = PropertiesService.getScriptProperties();
    props.setProperty(PROP_DEADLINE_PREFIX + triggerId, formId);
  }

  return {
    success: true,
    url: formUrl,
    id: formId
  };
}

/**
 * Enviado pelo Dashboard depois de gerar uma leva, quando o DEV confirma o envio.
 * Manda o link do formulário de onboarding por e-mail a um ou mais professores.
 * O link é lido do próprio formulário (pelo ID), nunca do navegador, e só formulários
 * de onboarding do Whitebox abertos para respostas são aceitos.
 * @param {string} token Token do Admin
 * @param {string} formId ID do formulário devolvido por gerarLevaOnboarding()
 * @param {string} destinatarios E-mails separados por vírgula, ponto e vírgula, espaço ou linha
 * @param {string} [dataLimite] Data limite no formato 'YYYY-MM-DDTHH:mm' (só para o texto do e-mail)
 * @returns {{success: boolean, url: string, enviados: string[], falhas: {email: string, erro: string}[]}}
 */
function enviarLinkOnboardingPorEmail(token, formId, destinatarios, dataLimite) {
  validateAdminAccess(token);

  const emails = normalizarDestinatariosOnboarding(destinatarios);
  if (emails.invalidos.length) {
    throw new Error('E-mail inválido: ' + emails.invalidos.join(', '));
  }
  if (!emails.validos.length) {
    throw new Error('Informe o e-mail do professor.');
  }
  if (emails.validos.length > ONBOARDING_MAX_DESTINATARIOS) {
    throw new Error('Envie para no máximo ' + ONBOARDING_MAX_DESTINATARIOS + ' e-mails por vez.');
  }

  if (!formId) throw new Error('Formulário não informado.');
  const nomeArquivo = DriveApp.getFileById(formId).getName();
  if (nomeArquivo.indexOf(ONBOARDING_FORM_PREFIXO) !== 0) {
    throw new Error('Este formulário não é um onboarding do Whitebox.');
  }
  const form = FormApp.openById(formId);
  if (!form.isAcceptingResponses()) {
    throw new Error('Este formulário está fechado para respostas.');
  }
  const url = form.getPublishedUrl();
  const nomeLeva = nomeArquivo.substring(ONBOARDING_FORM_PREFIXO.length).trim();

  const quota = MailApp.getRemainingDailyQuota();
  if (quota < emails.validos.length) {
    throw new Error('Cota diária de e-mails insuficiente (restam ' + quota + ').');
  }

  const mensagem = montarEmailConviteOnboarding(nomeLeva, url, dataLimite);
  const enviados = [];
  const falhas = [];
  for (let i = 0; i < emails.validos.length; i++) {
    const email = emails.validos[i];
    try {
      MailApp.sendEmail({ to: email, subject: mensagem.subject, body: mensagem.body });
      enviados.push(email);
    } catch (err) {
      Logger.log('[Onboarding] Falha ao enviar convite para ' + email + ': ' + err);
      falhas.push({ email: email, erro: String(err && err.message || err) });
    }
  }
  Logger.log('[Onboarding] Convite da leva "' + nomeLeva + '" enviado para ' + enviados.length +
             ' e-mail(s); falhas: ' + falhas.length);

  return { success: enviados.length > 0, url: url, enviados: enviados, falhas: falhas };
}

/**
 * Separa a lista de e-mails digitada pelo DEV, sem repetidos (ignora maiúsculas).
 * @param {string} texto
 * @returns {{validos: string[], invalidos: string[]}}
 */
function normalizarDestinatariosOnboarding(texto) {
  const partes = String(texto || '').split(/[\s,;]+/);
  const vistos = {};
  const validos = [];
  const invalidos = [];
  for (let i = 0; i < partes.length; i++) {
    const email = partes[i].trim().toLowerCase();
    if (!email || vistos[email]) continue;
    vistos[email] = true;
    if (/^[^\s@<>()",;:]+@[^\s@<>()",;:]+\.[a-z]{2,}$/i.test(email)) {
      validos.push(email);
    } else {
      invalidos.push(email);
    }
  }
  return { validos: validos, invalidos: invalidos };
}

/**
 * Assunto e corpo do e-mail de convite.
 * @param {string} nomeLeva
 * @param {string} url Link publicado do formulário
 * @param {string} [dataLimite] 'YYYY-MM-DDTHH:mm'
 */
function montarEmailConviteOnboarding(nomeLeva, url, dataLimite) {
  let prazo = '';
  const m = String(dataLimite || '').match(/^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/);
  if (m) {
    prazo = m[3] + '/' + m[2] + '/' + m[1] + (m[4] ? ' às ' + m[4] + ':' + m[5] : '');
  }
  const body =
    'Olá!\n\n' +
    'Você foi convidado(a) a se cadastrar como professor(a) no Whitebox' +
    (nomeLeva ? ' (leva "' + nomeLeva + '")' : '') + '.\n\n' +
    'Preencha o formulário de cadastro neste link:\n' + url + '\n\n' +
    'Abra o link com a conta Google que você vai usar no Whitebox: o cadastro fica no e-mail ' +
    'da conta que responder o formulário.\n' +
    (prazo ? 'O formulário fica aberto até ' + prazo + '.\n' : '') +
    '\nAo enviar, você recebe outro e-mail com o link da sua planilha individual.\n\n' +
    'Equipe Whitebox';
  return {
    subject: '📝 Convite para cadastro no Whitebox' + (nomeLeva ? ' - ' + nomeLeva : ''),
    body: body
  };
}

/**
 * Função acionada pelo gatilho TimeBased na data limite.
 * Ela olha para as propriedades, acha qual Form venceu agora, e desativa as respostas.
 */
function fecharFormulariosVencidos(e) {
  // [HIGH-05 FIX] Guard explícito: sem triggerUid o lookup retorna 'DEADLINE_undefined'
  // e o formulário nunca seria fechado sem qualquer log de aviso.
  if (!e || !e.triggerUid) {
    Logger.log('[Onboarding] fecharFormulariosVencidos: e.triggerUid ausente. ' +
               'Essa função deve ser acionada apenas por um gatilho TimeBased — não manualmente.');
    return;
  }

  const triggerId = e.triggerUid;
  const props     = PropertiesService.getScriptProperties();
  const formId    = props.getProperty(PROP_DEADLINE_PREFIX + triggerId);

  if (formId) {
    try {
      const form = FormApp.openById(formId);
      form.setAcceptingResponses(false);
      form.setCustomClosedFormMessage('As inscrições para esta leva de professores foram encerradas.');
      Logger.log('[Onboarding] Formulário fechado automaticamente (Deadline): ' + formId);
    } catch (err) {
      Logger.log('[Onboarding] Erro ao fechar form ' + formId + ': ' + err);
    }
    // Limpeza da propriedade
    props.deleteProperty(PROP_DEADLINE_PREFIX + triggerId);
    // Remover o gatilho para evitar execuções futuras desnecessárias
    const triggers = ScriptApp.getProjectTriggers();
    for (let i = 0; i < triggers.length; i++) {
      if (triggers[i].getUniqueId() === triggerId) {
        ScriptApp.deleteTrigger(triggers[i]);
        break; // Encontrado — sair do loop
      }
    }
  } else {
    Logger.log('[Onboarding] fecharFormulariosVencidos: nenhum formId encontrado para triggerUid=' + triggerId);
  }
}

/**
 * Função acionada toda vez que um professor responde o formulário de Onboarding.
 */

// FORM_FIELD_* → ver Constants.gs
// [ARCH-03] Constantes dos campos do formulário movidas para Constants.gs.


function onProfessorFormSubmit(e) {
  if (!e || !e.response) return; // Segurança contra execuções manuais acidentais

  const email        = e.response.getRespondentEmail();
  const itemResponses = e.response.getItemResponses();

  let instituicao = 'Não informada';
  let linkDrive   = '';

  for (let i = 0; i < itemResponses.length; i++) {
    const title  = itemResponses[i].getItem().getTitle();
    const answer = itemResponses[i].getResponse();

    // [MED-03 FIX] Matching exato por constante — não por substring impreciso.
    // O bug anterior usava title.includes('Link do Cofre Drive') que nunca batia com
    // 'Link do arquivo de Cofre (Google Drive)', forçando todos ao modo offline.
    if (title === FORM_FIELD_INSTITUICAO) {
      instituicao = answer;
    } else if (title === FORM_FIELD_LINK_COFRE) {
      linkDrive = answer;
    }
  }

  // 1. Validar e Extrair o File ID do Link (se houver)

  let fileId = '';
  let chaveAprovada = false;
  let usouChaveGlobal = false;
  
  if (linkDrive && linkDrive.trim().length > 0) {
    fileId = linkDrive.trim();
    const matchUrl = linkDrive.match(/\/d\/([-\w]{25,})/);
    if (matchUrl) fileId = matchUrl[1];
    
    try {
      const file = DriveApp.getFileById(fileId);
      const textoChave = file.getBlob().getDataAsString().trim();
      
      if (detectarProvedorPorChave(textoChave)) {
        chaveAprovada = true;
      }
    } catch (err) {
      Logger.log('[Onboarding] Erro de Permissão ao acessar Cofre de ' + email + ' - ' + err.toString());
    }
  } else {
    // Se o professor não enviou o link, aprovamos o cadastro em Modo Offline (sem IA)
    chaveAprovada = true;
    usouChaveGlobal = false; // Não libera a chave global automaticamente
  }
  
  // 2. Fluxo de Sucesso ou Falha
  if (chaveAprovada) {
    // [CR-03] Serializar registros simultâneos para evitar race condition no rowIndex
    const lock = LockService.getScriptLock();
    let spreadsheetId = '';
    try {
      lock.waitLock(30000); // Aguarda até 30s por uma submissão anterior

      // Registra na planilha Global com Status Ativo
      adicionarProfessor(email, instituicao, usouChaveGlobal, fileId);

      // [CR-03 FIX] Buscar o rowIndex REAL do professor por email, não por getLastRow()
      // Isso garante que dois professores submetendo simultaneamente não troquem suas planilhas.
      const cfg = getConfig();
      const sheet = getPlanilhaGlobal(cfg.adminSpreadsheetId);
      const data = sheet.getDataRange().getValues();
      const spreadsheetCol = data[0].indexOf('SpreadsheetId');

      let rowIndex = -1;
      for (let i = 1; i < data.length; i++) {
        if (data[i][0] === email) { rowIndex = i; break; }
      }

      if (rowIndex === -1) {
        throw new Error('[Onboarding] Professor ' + email + ' não encontrado após adicionarProfessor()');
      }

      spreadsheetId = garantirPlanilhaProfessor(email, sheet, rowIndex, spreadsheetCol);

    } catch (lockErr) {
      Logger.log('[Onboarding] Erro no lock/provisionamento para ' + email + ': ' + lockErr);
      MailApp.sendEmail({
        to: email,
        subject: '⚠️ Erro Temporário - Whitebox',
        body: 'Olá!\n\nOcorreu um erro temporário ao processar seu cadastro. Por favor, aguarde alguns minutos e tente novamente.\n\nDesculpe o inconveniente.\n\nEquipe Whitebox'
      });
      return;
    } finally {
      lock.releaseLock();
    }
    
    let msgBody = 'Olá!\n\nSeu cadastro foi aprovado com sucesso.\n\n';
    if (fileId) {
      msgBody += 'Seu Cofre do Drive foi validado com sucesso e sua chave privada será utilizada para a Inteligência Artificial.\n\n';
    } else {
      msgBody += 'Você não forneceu uma chave individual. Seu perfil foi configurado para o **Modo Offline**.\nVocê poderá utilizar o sistema normalmente para coleta e registro de métricas pedagógicas, mas sem as análises automatizadas da Inteligência Artificial. Se a sua instituição fornecer uma Chave Global no futuro, a IA será ativada automaticamente.\n\n';
    }
    msgBody += 'Sua Planilha de Logs e Configurações Pedagógicas já está pronta: https://docs.google.com/spreadsheets/d/' + spreadsheetId + '\n\nBem-vindo(a) ao Whitebox!';
    
    // Envia E-mail de Sucesso
    MailApp.sendEmail({
      to: email,
      subject: '✅ Cadastro Aprovado - Whitebox',
      body: msgBody
    });
    
  } else {
    // Falhou: Enviou um link mas ele não pôde ser validado
    MailApp.sendEmail({
      to: email,
      subject: '❌ Erro de Cadastro - Permissão do Cofre Drive (Whitebox)',
      body: 'Olá!\n\nRecebemos sua inscrição no Whitebox, porém NÃO conseguimos acessar a Chave de API através do Link do Cofre fornecido.\n\nPor favor, verifique se:\n1. O link está correto.\n2. O arquivo está compartilhado conosco com permissão de "Leitor".\n3. É um arquivo de texto .txt enviado ao Drive (um Google Docs não funciona) e contém apenas a sua chave de API (Gemini: iniciada com AIza...; Claude: iniciada com sk-ant-...).\n\nCorrija as permissões no Drive e preencha o formulário novamente para ativar sua conta.'
    });
  }
}
