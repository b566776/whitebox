/**
 * ============================================================================
 * SCRIPT DE IMPORTAÇÃO AUTOMÁTICA DO CURSO WHITEBOX PARA O GOOGLE CLASSROOM
 * ============================================================================
 * 
 * Este script cria automaticamente uma turma no Google Classroom, define a
 * estrutura de tópicos (Módulos 1 e 2) e insere todos os materiais formatados.
 * 
 * INSTRUÇÕES DE EXECUÇÃO:
 * 1. Acesse o editor do Google Apps Script em: https://script.google.com/
 * 2. Clique em "Novo projeto"
 * 3. Delete qualquer código existente no arquivo Código.gs e cole todo o conteúdo deste arquivo.
 * 4. Na barra lateral esquerda, clique no símbolo "+" ao lado de "Serviços".
 * 5. Procure por "Classroom API" na lista, selecione-o e clique em "Adicionar".
 * 6. Na barra superior do editor, certifique-se de que a função "setupWhiteboxCourse" está selecionada.
 * 7. Clique no botão "Executar" (ícone de Play).
 * 8. O Google solicitará autorização de segurança. Clique em "Revisar permissões",
 *    selecione sua conta institucional, clique em "Avançado" (caso apareça a tela de alerta)
 *    e depois em "Acessar projeto (não seguro)" -> "Permitir".
 * 9. O script rodará em alguns segundos e registrará o progresso no Log de Execução.
 * 10. Abra o seu Google Classroom (https://classroom.google.com/) para ver a turma criada!
 */

function setupWhiteboxCourse() {
  Logger.log("Iniciando a criação do curso de capacitação Whitebox...");
  
  // 1. Criar uma cópia do Documento Modelo original no Drive do Professor para os alunos usarem
  var originalTemplateId = "12XWtB6UawhTpWmm3dReb2gSJu7ErVcpV3p67d2vrgeI";
  var forceCopyUrl = "";
  var copiedFileId = "";
  try {
    var originalFile = DriveApp.getFileById(originalTemplateId);
    var copiedFile = originalFile.makeCopy("Whitebox - Documento de Trabalho (Cópia para Alunos)");
    
    // Configurar permissão para que qualquer pessoa com o link possa visualizar (necessário para fazer a cópia)
    copiedFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    
    var copiedFileUrl = copiedFile.getUrl();
    copiedFileId = copiedFile.getId();
    // Substitui "/edit..." por "/copy" para criar o link de cópia forçada
    forceCopyUrl = copiedFileUrl.replace(/\/edit\?usp=drivesdk|\/edit$/g, "") + "/copy";
    Logger.log("Cópia de trabalho dos alunos criada com sucesso: " + forceCopyUrl + " (ID: " + copiedFileId + ")");
  } catch (e) {
    Logger.log("Aviso ao copiar documento via DriveApp: " + e.message + ". Usando link do modelo original.");
    forceCopyUrl = "https://docs.google.com/document/d/" + originalTemplateId + "/copy";
    copiedFileId = originalTemplateId;
  }

  // 2. Criar a Turma (Curso) - Criamos como PROVISIONED para contornar restrições de contas pessoais/institucionais (@CourseStateDenied)
  var course = Classroom.newCourse();
  course.name = "Capacitação Whitebox: Transparência no Processo de Escrita";
  course.section = "Formação de Professores";
  course.descriptionHeading = "Curso prático para professores aprenderem a usar o Whitebox como assistente de integridade e acompanhamento do processo de escrita.";
  course.description = "Aprenda a configurar documentos modelos, interpretar métricas de CPM/colagem e utilizar a IA do Gemini para devolutivas socráticas.";
  course.ownerId = "me";
  course.courseState = "PROVISIONED";
  
  var createdCourse;
  try {
    createdCourse = Classroom.Courses.create(course);
    Logger.log("Turma criada no estado 'PROVISIONADO' com sucesso! ID: " + createdCourse.id);
  } catch (e) {
    Logger.log("Erro ao criar turma. Certifique-se de que ativou o serviço 'Classroom API' nas configurações de Serviços na barra lateral esquerda. Detalhes do erro: " + e.message);
    return;
  }
  
  var courseId = createdCourse.id;
  
  // Tentar ativar o curso via API (caso o perfil do usuário permita transicionar estados)
  try {
    createdCourse.courseState = "ACTIVE";
    Classroom.Courses.update(createdCourse, courseId);
    Logger.log("Turma ativada com sucesso!");
  } catch (e) {
    Logger.log("Nota: Não foi possível ativar o curso via API (erro: " + e.message + "). Sem problemas! O curso foi criado no estado 'PROVISIONADO'. Para começar a usá-lo, basta ir à página inicial do seu Google Classroom (https://classroom.google.com/) e clicar em 'Aceitar' no card da nova turma.");
  }
  
  // 3. Criar os Tópicos (Módulos)
  var topic1Resource = Classroom.newTopic();
  topic1Resource.name = "Módulo 1: Visão Geral";
  var topic1 = Classroom.Courses.Topics.create(topic1Resource, courseId);
  Logger.log("Tópico Módulo 1 criado. ID: " + topic1.topicId);
  
  var topic2Resource = Classroom.newTopic();
  topic2Resource.name = "Módulo 2: Uso Pedagógico";
  var topic2 = Classroom.Courses.Topics.create(topic2Resource, courseId);
  Logger.log("Tópico Módulo 2 criado. ID: " + topic2.topicId);
  
  // 4. Adicionar Materiais ao Módulo 1
  
  // Material 1.1
  createMaterial(
    courseId,
    topic1.topicId,
    "Por que precisamos repensar a avaliação da escrita?",
    "Olá, professores!\n\nVocês já receberam um texto impecável, com vocabulário avançado e estrutura perfeita, mas com a sensação de que 'não foi o aluno que escreveu'?\n\nCom a popularização do ChatGPT, Gemini, Claude e outras IAs generativas, esse desafio se tornou parte do nosso dia a dia. Não se trata mais de apenas detectar plágio tradicional — hoje, qualquer redação pode ser gerada em segundos.\n\nO problema não é a tecnologia de IA, mas sim o fato de avaliarmos apenas o produto final. Para garantir uma avaliação justa e desenvolver habilidades reais de escrita, precisamos voltar nosso olhar para o processo de construção do texto.\n\nAbaixo você encontrará recursos extras sobre essa discussão.",
    [
      { title: "Reportagem JN: Regras para uso de IA por alunos", url: "https://g1.globo.com/jornal-nacional/video/universidades-estabelecem-regras-para-uso-de-ia-por-alunos-14546463.ghtml" },
      { title: "Termos de Uso e Privacidade do Aluno", url: "https://exemplo-whitebox.org/termos-privacidade" }
    ]
  );

  // Material 1.2
  createMaterial(
    courseId,
    topic1.topicId,
    "O que é o Whitebox? Transparência e Parceria",
    "O Whitebox é um assistente pedagógico integrado diretamente ao Google Docs na forma de um painel lateral. Ele analisa exclusivamente três indicadores de escrita dentro do documento:\n\n1. ⏱️ Tempo de Foco Ativo: tempo que o aluno passou digitando/editando.\n2. ⌨️ Ritmo de Escrita (CPM): Caracteres por Minuto (100-300 é o normal).\n3. 📋 Eventos de Colagem: inserções de blocos de texto externos.\n\nPrivacidade e LGPD: O Whitebox não monitora telas, não grava áudio, não rastreia outras abas e necessita que o aluno abra o painel voluntariamente. Funciona apenas no computador.",
    [
      { title: "Google Doc de Trabalho (Cópia para Alunos)", url: forceCopyUrl },
      { title: "Planilha de Heatmap (Modelo)", url: "https://exemplo-whitebox.org/heatmap-modelo" }
    ]
  );

  // Material 1.3
  createMaterial(
    courseId,
    topic1.topicId,
    "Como o Whitebox funciona na prática? A jornada do documento",
    "Fluxo de trabalho de 5 etapas do Whitebox:\n\n1. Preparação: O administrador de tecnologia gera o Documento Modelo.\n2. Distribuição: O professor cria a Atividade no Classroom (marcando obrigatoriamente a opção 'Fazer uma cópia para cada aluno').\n3. Escrita: O aluno abre o documento copiado, ativa o painel (Extensões > Whitebox > Abrir Painel) e escreve o texto.\n4. Análise: O professor abre o documento entregue e vê as métricas de escrita no painel lateral.\n5. Orientação: O professor realiza uma devolutiva com o aluno baseando-se em evidências claras.",
    [
      { title: "Guia Completo de Implementação para Professores", url: "https://exemplo-whitebox.org/guia-completo-professor" },
      { title: "Guia de Orientação para Alunos", url: "https://exemplo-whitebox.org/guia-orientacao-aluno" }
    ]
  );
  
  // 5. Adicionar Materiais ao Módulo 2
  
  // Material 2.1
  createMaterial(
    courseId,
    topic2.topicId,
    "Primeiros passos: obtendo e validando seu Documento Modelo",
    "Aprenda a testar se seu modelo está ativado e a resolver problemas de autorização de conta Google (como o erro de multi-login/múltiplas contas logadas no mesmo navegador).\n\nDica: Use um perfil limpo no navegador ou aba anônima para evitar que o Google confunda sua conta pessoal com a institucional.",
    [
      { title: "Documento Modelo Oficial da Escola (Faça uma Cópia)", url: forceCopyUrl },
      { title: "Vídeo: Configurando o Whitebox pela primeira vez", url: "https://youtube.com/watch?v=primeira-configuracao" }
    ]
  );

  // Material 2.2
  createMaterial(
    courseId,
    topic2.topicId,
    "Como distribuir atividades Whitebox no Google Classroom",
    "Passo a passo detalhado para criar a atividade no Classroom.\n\nATENÇÃO: Lembre-se sempre de marcar 'Fazer uma cópia para cada aluno' ao anexar o Documento Modelo. Sem isso, a telemetria individual não será gerada.",
    [
      { title: "Central de Ajuda Google: Como anexar arquivos no Classroom", url: "https://support.google.com/edu/classroom/answer/6020285" },
      { title: "Vídeo: Criando atividades com cópia individual no Classroom", url: "https://youtube.com/watch?v=distribuicao-classroom" }
    ]
  );

  // Material 2.3
  createMaterial(
    courseId,
    topic2.topicId,
    "Diagnóstico pedagógico: entendendo a telemetria de escrita",
    "Aprenda a analisar as métricas de CPM, foco ativo e colagem:\n\n- CPM entre 100-300: Escrita natural.\n- CPM > 500 ou Colagens Altas: Possível colagem externa ou geração por IA.\n- CPM < 80: Dificuldade de fluxo ou bloqueio criativo.\n- CPM Zero: Falta de abertura do painel.\n\nUse os dados para apoiar e orientar o aluno, e não como punição direta.",
    [
      { title: "Acesse a Planilha de Heatmap (exemplo real)", url: "https://exemplo-whitebox.org/heatmap-real" },
      { title: "Manual Completo das Métricas do Whitebox", url: "https://exemplo-whitebox.org/manual-metricas" }
    ]
  );

  // Material 2.4
  createMaterial(
    courseId,
    topic2.topicId,
    "Feedback enriquecido com Inteligência Artificial",
    "Saiba como usar o botão 'Analisar' se a sua escola tiver uma chave do Gemini configurada. A IA gerará um parecer pedagógico textual e sugestões de perguntas socráticas para abordar os alunos de forma empática e construtiva, promovendo a reflexão sobre o processo de escrita.",
    []
  );

  // Material 2.5
  createMaterial(
    courseId,
    topic2.topicId,
    "Instruções para a turma sobre o uso do Whitebox",
    "Copie o modelo de texto abaixo e cole nas instruções de suas atividades no Google Classroom para orientar os alunos:\n\n\"Olá, turma! Esta atividade utiliza o Whitebox para valorizar seu processo de escrita. Abra o documento no computador, clique em Extensões > Whitebox > Abrir Painel e mantenha o painel aberto enquanto digita. O Whitebox não filma sua tela e não acessa outros sites, apenas acompanha seu tempo de foco e ritmo de digitação. Atividades sem registro de escrita precisarão ser justificadas.\n\nComo entregar a sua tarefa concluída:\n- Método 1 (Direto pelo Google Docs): No canto superior direito da tela do seu Google Docs, clique no botão 'Entregar' (ao lado de 'Compartilhar').\n- Método 2 (Pelo Google Classroom): Acesse a página da atividade no Classroom, localize a caixa 'Seu trabalho' no canto direito e clique no botão 'Entregar' para confirmar o envio.\"",
    [
      { title: "Guia do Aluno em PDF", url: "https://exemplo-whitebox.org/guia-aluno-pdf" },
      { title: "Termos de Uso do Aluno", url: "https://exemplo-whitebox.org/termos-uso-aluno" }
    ]
  );

  // Material 2.6 (Criado como Atividade/Assignment com cópia automática para cada aluno)
  createAssignment(
    courseId,
    topic2.topicId,
    "Atividade Prática: Simulação dos Perfis de Escrita (15 min)",
    "Esta é uma atividade prática e síncrona de 15 minutos projetada para capacitar professores no reconhecimento prático dos três perfis principais de escrita que o Whitebox rastreia.\n\nEnunciado do exercício: Escrever um resumo curto (1 parágrafo) do último filme que assistiu.\n\nGrupo 1 (Escrita Orgânica): Digita tudo direto e manualmente. (Verde no Heatmap)\nGrupo 2 (Escrita Híbrida): Digita parte do texto e usa IA (Gemini/ChatGPT) para completar trechos. (Amarelo no Heatmap)\nGrupo 3 (Cópia e Cola Direta): Escreve o texto todo na IA e cola de uma só vez no Docs. (Vermelho no Heatmap)\n\n📥 COMO ENTREGAR:\nO Google Classroom já criou automaticamente uma cópia individual do documento de escrita para você (disponível no painel lateral direito em 'Seu trabalho').\n1. Clique no documento anexado para abri-lo.\n2. Lembre-se de abrir o painel lateral em Extensões > Whitebox > Abrir Painel.\n3. Realize a escrita conforme o seu grupo de simulação.\n4. Ao terminar, clique em 'Entregar' (ou no botão 'Entregar' no canto superior direito do Docs, ou diretamente na página desta atividade no Classroom).",
    copiedFileId,
    [
      { title: "Vídeo Tutorial: Analisando Perfis em Tempo Real", url: "https://youtube.com/watch?v=analise-perfis" }
    ]
  );
  
  Logger.log("====================================================================");
  Logger.log("Curso importado com sucesso! Acesse seu Google Classroom para ver.");
  Logger.log("ID do Curso: " + courseId);
  Logger.log("====================================================================");
}

/**
 * Função auxiliar para criar material de aula no Classroom usando a API oficial.
 */
function createMaterial(courseId, topicId, title, textDescription, links) {
  var material = Classroom.newCourseWorkMaterial();
  material.title = title;
  material.description = textDescription;
  material.topicId = topicId;
  material.state = "PUBLISHED";
  
  if (links && links.length > 0) {
    material.materials = links.map(function(linkItem) {
      return {
        link: {
          url: linkItem.url,
          title: linkItem.title
        }
      };
    });
  }
  
  try {
    var created = Classroom.Courses.CourseWorkMaterials.create(material, courseId);
    Logger.log("Material '" + title + "' criado com sucesso! ID: " + created.id);
  } catch (e) {
    Logger.log("Erro ao criar material '" + title + "': " + e.message);
  }
}

/**
 * Função auxiliar para criar atividade (CourseWork) no Classroom usando a API oficial.
 */
function createAssignment(courseId, topicId, title, textDescription, driveFileId, links) {
  var coursework = Classroom.newCourseWork();
  coursework.title = title;
  coursework.description = textDescription;
  coursework.topicId = topicId;
  coursework.workType = "ASSIGNMENT";
  coursework.state = "PUBLISHED";
  
  var materialsList = [];
  
  // Adicionar o arquivo do Drive com permissão STUDENT_COPY
  if (driveFileId) {
    materialsList.push({
      driveFile: {
        driveFile: {
          id: driveFileId
        },
        shareMode: "STUDENT_COPY"
      }
    });
  }
  
  // Adicionar outros links
  if (links && links.length > 0) {
    links.forEach(function(linkItem) {
      materialsList.push({
        link: {
          url: linkItem.url,
          title: linkItem.title
        }
      });
    });
  }
  
  coursework.materials = materialsList;
  
  try {
    var created = Classroom.Courses.CourseWork.create(coursework, courseId);
    Logger.log("Atividade '" + title + "' criada com sucesso! ID: " + created.id);
  } catch (e) {
    Logger.log("Erro ao criar atividade '" + title + "': " + e.message);
  }
}
