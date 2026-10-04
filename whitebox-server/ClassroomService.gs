/**
 * ========================================================
 *  Whitebox - Serviço de Integração Google Classroom
 * ========================================================
 */

/**
 * Retorna as turmas onde o usuário atual é professor.
 */
function getClassroomCourses() {
  try {
    let allCourses = [];
    let pageToken = null;
    do {
      const response = Classroom.Courses.list({
        teacherId: 'me',
        courseStates: ['ACTIVE'],
        pageToken: pageToken
      });
      if (response.courses) {
        allCourses = allCourses.concat(response.courses);
      }
      pageToken = response.nextPageToken;
    } while (pageToken);
    
    return allCourses.map(c => ({
      id: c.id,
      name: c.name,
      section: c.section || ''
    }));
  } catch (err) {
    Logger.log('Erro ao buscar turmas: ' + err);
    throw new Error('Falha ao acessar o Google Classroom: ' + err.toString());
  }
}

/**
 * Cria uma atividade no Classroom com o "Doc Mestre" anexado como cópia para cada aluno.
 */
function publishToClassroom(courseId, seedDocId, title, description, token) {
  // 1. Validar acesso
  validateAdminAccess(token);
  
  if (!courseId || !seedDocId) throw new Error('Course ID e Seed ID são obrigatórios.');

  try {
    // 2. Definir a atividade (CourseWork)
    const resource = {
        title: title || 'Atividade Whitebox',
        description: description || 'Por favor, complete esta atividade usando o editor do Google Docs.',
        workType: 'ASSIGNMENT',
        state: 'PUBLISHED',
        materials: [
          {
            driveFile: {
              driveFile: {
                id: seedDocId
              },
              shareMode: 'STUDENT_COPY'
            }
          }
        ]
    };

    // 3. Criar no Classroom
    const assignment = Classroom.Courses.CourseWork.create(resource, courseId);
    
    // 4. Registrar na Planilha Global para rastro de auditoria
    registrarTarefaGlobal(assignment.id, title, courseId, token);

    return { 
      success: true, 
      assignmentId: assignment.id, 
      alternateLink: assignment.alternateLink 
    };
    
  } catch (err) {
    Logger.log('Erro ao publicar no Classroom: ' + err);
    throw new Error('Erro na publicação: ' + err.toString());
  }
}

/**
 * Registra a criação da tarefa na Planilha Global do Admin.
 * @param {string} professorEmail - Email do professor (obrigatório; Session.getActiveUser()
 *   retorna string vazia em doPost com executeAs:USER_DEPLOYING + acesso anônimo).
 */
function registrarTarefaGlobal(assignmentId, title, courseId, token, professorEmail) {
  const cfg = getConfig();
  const ss = SpreadsheetApp.openById(cfg.adminSpreadsheetId);
  const sheet = ss.getSheetByName('Tarefas_Globais');

  // Fallback defensivo — só usado se chamado por código legado sem o 5º argumento.
  const email = professorEmail || Session.getActiveUser().getEmail() || 'desconhecido';
  const instituicao = buscarInstituicaoProfessor(email);

  sheet.appendRow([
    assignmentId,
    email,
    instituicao,
    title,
    courseId,
    new Date().toISOString()
  ]);
}


// =====================================================
//  HELPERS: Classroom API via OAuth do Professor
// =====================================================
// Necessários porque o Web App executa como Admin (USER_DEPLOYING).
// Usar o oauthToken do professor via UrlFetchApp garante que as chamadas
// à Classroom API ocorram no contexto do professor — permitindo listar e
// criar atividades nos cursos onde o professor (não o Admin) é docente.

/**
 * Lista cursos ativos onde o PROFESSOR (dono do token) é docente.
 * @param {string} oauthToken  Token OAuth do professor (enviado pelo callProxy do add-on).
 * @returns {Array<{id, name, section}>}
 */
function _getClassroomCoursesViaOAuth(oauthToken) {
  let allCourses = [];
  let pageToken  = null;

  do {
    let url = 'https://classroom.googleapis.com/v1/courses?teacherId=me&courseStates=ACTIVE&pageSize=50';
    if (pageToken) url += '&pageToken=' + encodeURIComponent(pageToken);

    const resp = UrlFetchApp.fetch(url, {
      headers:            { 'Authorization': 'Bearer ' + oauthToken },
      muteHttpExceptions: true,
      deadline:           20
    });

    if (resp.getResponseCode() !== 200) {
      Logger.log('[ClassroomService] _getClassroomCoursesViaOAuth HTTP ' +
                 resp.getResponseCode() + ': ' + resp.getContentText().substring(0, 200));
      break;
    }

    const data = JSON.parse(resp.getContentText());
    if (data.courses) allCourses = allCourses.concat(data.courses);
    pageToken = data.nextPageToken || null;
  } while (pageToken);

  return allCourses.map(c => ({
    id:      c.id,
    name:    c.name,
    section: c.section || ''
  }));
}

/**
 * Cria uma atividade (CourseWork) no Classroom como o professor.
 * @param {string} oauthToken  Token OAuth do professor.
 * @param {string} courseId
 * @param {object} resource    Objeto CourseWork conforme a REST API do Classroom.
 * @returns {object} Objeto assignment retornado pela API.
 * @throws {Error} Se a API retornar status != 200.
 */
function _createCourseWorkViaOAuth(oauthToken, courseId, resource) {
  const url = 'https://classroom.googleapis.com/v1/courses/' +
              encodeURIComponent(courseId) + '/courseWork';

  const resp = UrlFetchApp.fetch(url, {
    method:             'post',
    headers:            {
      'Authorization': 'Bearer ' + oauthToken,
      'Content-Type':  'application/json'
    },
    payload:            JSON.stringify(resource),
    muteHttpExceptions: true,
    deadline:           30
  });

  if (resp.getResponseCode() !== 200) {
    const errBody = resp.getContentText().substring(0, 400);
    Logger.log('[ClassroomService] _createCourseWorkViaOAuth HTTP ' +
               resp.getResponseCode() + ': ' + errBody);
    throw new Error('Classroom API retornou ' + resp.getResponseCode() + ': ' + errBody);
  }

  return JSON.parse(resp.getContentText());
}

/**
 * Lista alunos matriculados num curso, usando o token do professor.
 * @param {string} oauthToken
 * @param {string} courseId
 * @returns {number} Total de alunos matriculados.
 */
function _listStudentsViaOAuth(oauthToken, courseId) {
  let total     = 0;
  let pageToken = null;

  do {
    let url = 'https://classroom.googleapis.com/v1/courses/' +
              encodeURIComponent(courseId) + '/students?pageSize=100';
    if (pageToken) url += '&pageToken=' + encodeURIComponent(pageToken);

    const resp = UrlFetchApp.fetch(url, {
      headers:            { 'Authorization': 'Bearer ' + oauthToken },
      muteHttpExceptions: true,
      deadline:           15
    });

    if (resp.getResponseCode() !== 200) {
      Logger.log('[ClassroomService] _listStudentsViaOAuth HTTP ' +
                 resp.getResponseCode() + ' para courseId=' + courseId);
      break;
    }

    const data = JSON.parse(resp.getContentText());
    total    += (data.students || []).length;
    pageToken = data.nextPageToken || null;
  } while (pageToken);

  return total;
}

/**
 * Busca a instituição vinculada ao professor na planilha de Assinaturas.
 */
function buscarInstituicaoProfessor(email) {
  const props = PropertiesService.getScriptProperties();
  const adminId = props.getProperty('ADMIN_SPREADSHEET_ID');
  if (!adminId) return 'N/A';
  
  const ss = SpreadsheetApp.openById(adminId);
  const sheet = ss.getSheetByName('Assinaturas');
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const emailCol = headers.indexOf('Email');
  const instCol = headers.indexOf('Instituicao');
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][emailCol] === email) {
      return data[i][instCol] || 'Não informada';
    }
  }
  return 'Não cadastrada';
}

/**
 * Tenta encontrar qual tarefa (Assignment) gerou este documento de aluno.
 * Cruza o docId com as submissões das turmas onde o aluno está inscrito.
 *
 * [MED-05 FIX] Cache via CacheService com TTL de 6 horas.
 * O mapeamento docId → assignmentId é estável (não muda durante o período escolar),
 * tornando o cache seguro e muito eficiente para reduzir chamadas à Classroom API.
 */
function findAssignmentIdByDocId(docId) {
  if (!docId) return null;

  // 1. Verificar cache
  const cache     = CacheService.getDocumentCache();
  const cacheKey  = CACHE_ASSIGNMENT_PREFIX + docId;
  const cached    = cache.get(cacheKey);
  if (cached) {
    try {
      const parsed = JSON.parse(cached);
      Logger.log('[ClassroomService] Cache hit para docId=' + docId);
      return parsed; // { assignmentId, courseId }
    } catch (e) {
      // Cache corrompido — prosseguir com busca real
      Logger.log('[ClassroomService] Cache inválido para ' + docId + ', rebuscando...');
    }
  }

  try {
    // 2. Listar turmas do aluno (paginado)
    let courses = [];
    let coursePageToken = null;
    do {
      const coursesResponse = Classroom.Courses.list({
        studentId:    'me',
        courseStates: ['ACTIVE'],
        pageToken:    coursePageToken
      });
      if (coursesResponse.courses) courses = courses.concat(coursesResponse.courses);
      coursePageToken = coursesResponse.nextPageToken;
    } while (coursePageToken);

    for (const course of courses) {
      // 3. Listar submissões do aluno nesta turma (paginado)
      let submissions = [];
      let subPageToken = null;
      do {
        const submissionsResponse = Classroom.Courses.CourseWork.StudentSubmissions.list(
          course.id, '-', { userId: 'me', pageToken: subPageToken }
        );
        if (submissionsResponse.studentSubmissions) {
          submissions = submissions.concat(submissionsResponse.studentSubmissions);
        }
        subPageToken = submissionsResponse.nextPageToken;
      } while (subPageToken);

      for (const sub of submissions) {
        if (sub.assignmentSubmission && sub.assignmentSubmission.attachments) {
          for (const att of sub.assignmentSubmission.attachments) {
            if (att.driveFile && att.driveFile.id === docId) {
              const result = { assignmentId: sub.courseWorkId, courseId: course.id };
              // 4. Armazenar no cache (TTL: 6h = 21600s)
              try { cache.put(cacheKey, JSON.stringify(result), 21600); } catch (e) {}
              Logger.log('[ClassroomService] Assignment encontrado e cacheado para docId=' + docId);
              return result;
            }
          }
        }
      }
    }
  } catch (e) {
    Logger.log('[ClassroomService] Erro ao buscar assignment via Classroom: ' + e);
  }
  return null;
}

