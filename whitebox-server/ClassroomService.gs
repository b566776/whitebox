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
 */
function registrarTarefaGlobal(assignmentId, title, courseId, token) {
  const cfg = getConfig();
  const ss = SpreadsheetApp.openById(cfg.adminSpreadsheetId);
  const sheet = ss.getSheetByName('Tarefas_Globais');
  
  // Buscar nome da instituição do professor logado (simplificado para o e-mail logado)
  const professorEmail = Session.getActiveUser().getEmail();
  const instituicao = buscarInstituicaoProfessor(professorEmail);

  sheet.appendRow([
    assignmentId,
    professorEmail,
    instituicao,
    title,
    courseId,
    new Date().toISOString()
  ]);
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
 */
function findAssignmentIdByDocId(docId) {
  try {
    // 1. Listar turmas do aluno
    let courses = [];
    let coursePageToken = null;
    do {
      const coursesResponse = Classroom.Courses.list({ 
        studentId: 'me', 
        courseStates: ['ACTIVE'],
        pageToken: coursePageToken 
      });
      if (coursesResponse.courses) courses = courses.concat(coursesResponse.courses);
      coursePageToken = coursesResponse.nextPageToken;
    } while (coursePageToken);
    
    for (const course of courses) {
      // 2. Listar submissões do aluno nesta turma (filtramos por aluno para ser rápido)
      let submissions = [];
      let subPageToken = null;
      do {
        const submissionsResponse = Classroom.Courses.CourseWork.StudentSubmissions.list(course.id, '-', { 
          userId: 'me',
          pageToken: subPageToken
        });
        if (submissionsResponse.studentSubmissions) submissions = submissions.concat(submissionsResponse.studentSubmissions);
        subPageToken = submissionsResponse.nextPageToken;
      } while (subPageToken);
      
      for (const sub of submissions) {
        if (sub.assignmentSubmission && sub.assignmentSubmission.attachments) {
          const attachments = sub.assignmentSubmission.attachments;
          for (const att of attachments) {
            if (att.driveFile && att.driveFile.id === docId) {
              return {
                assignmentId: sub.courseWorkId,
                courseId: course.id
              };
            }
          }
        }
      }
    }
  } catch (e) {
    Logger.log('Erro ao buscar assignment via Classroom: ' + e);
  }
  return null; 
}
