/**
 * =====================================================
 *  Whitebox — Constants.gs (Servidor)
 * =====================================================
 *
 * [ARCH-03] Fonte única da verdade para todos os literais de string
 * do whitebox-server. Se um nome de aba, campo ou chave precisar
 * mudar, altere APENAS aqui — o restante do código atualiza automaticamente.
 *
 * REGRA: Nenhuma lógica ou função aqui. Apenas `const`.
 *
 * ESCOPO: Estas constantes são compartilhadas entre todos os arquivos
 * do whitebox-server (BrainProxy.gs, AdminSetup.gs, FormOnboarding.gs,
 * ClassroomService.gs, Utils.gs, TestRunner.gs) pois o GAS compila
 * todos os .gs do projeto em um único escopo de execução (V8 runtime).
 */

// =====================================================
//  PLANILHA GLOBAL: Nomes de Abas
// =====================================================

/** Aba principal — registro de professores licenciados */
const SHEET_ASSINATURAS        = 'Assinaturas';

/** Aba de tarefas distribuídas globalmente */
const SHEET_TAREFAS_GLOBAIS    = 'Tarefas_Globais';

/** Aba de configurações da planilha do professor */
const SHEET_CONFIG             = 'Config';

/** Aba de ranking de instituições (futuro) */
const SHEET_RANKING            = 'Ranking_Instituicao';

/** Aba de logs de análise individual do aluno */
const SHEET_LOGS               = 'Logs';

/** Aba de critérios pedagógicos personalizados do professor */
const SHEET_CONFIG_PEDAGOGICA  = 'Config_Pedagogica';

/** Aba de turmas registradas pelo professor */
const SHEET_TURMAS             = 'Turmas';

/** Aba de dashboard individual do professor (futuro) */
const SHEET_DASHBOARD          = 'Dashboard_Professor';

// =====================================================
//  PLANILHA GLOBAL: Cabeçalhos / Colunas
// =====================================================

/** Coluna de email na aba Assinaturas */
const COL_EMAIL               = 'Email';

/** Coluna de instituição na aba Assinaturas */
const COL_INSTITUICAO         = 'Instituicao';

/** Coluna de status de licença */
const COL_STATUS              = 'Status';

/** Indica se o professor usa chave Gemini global */
const COL_USA_CHAVE_GLOBAL    = 'UsaChaveGlobal';

/** Chave API Gemini individual do professor (criptografada via cofre) */
const COL_CHAVE_INDIVIDUAL    = 'ChaveIndividual';

/** ID da planilha de logs individual do professor */
const COL_SPREADSHEET_ID      = 'SpreadsheetId';

// =====================================================
//  CONFIG: Chaves da aba Config da planilha do professor
// =====================================================

/**
 * ID do Google Doc que serve como Documento Modelo (semente).
 * Armazenado na aba Config da Planilha Global do admin.
 */
const CONFIG_KEY_SEED_DOC_ID  = 'seed_document_id';

/**
 * ID do Google Form de onboarding semente.
 * Armazenado na aba Config da planilha do professor.
 */
const CONFIG_KEY_SEED_FORM_ID = 'seed_form_id';

// =====================================================
//  SCRIPT PROPERTIES: Chaves do Servidor
// =====================================================

/** ID da Planilha Global de administração */
const PROP_ADMIN_SPREADSHEET_ID = 'ADMIN_SPREADSHEET_ID';

/** Token compartilhado para autenticar chamadas do Add-on ao Proxy */
const PROP_SHARED_TOKEN         = 'SHARED_TOKEN';

/** Chave API Gemini global (para professores que não têm chave própria) */
const PROP_GEMINI_GLOBAL_KEY    = 'GEMINI_GLOBAL_KEY';

/** URL pública deste Web App (Brain Proxy), usada para auto-configurar novos documentos */
const PROP_BRAIN_PROXY_URL      = 'BRAIN_PROXY_URL';

// =====================================================
//  SCRIPT PROPERTIES: Prefixos de deadline
// =====================================================

/**
 * Prefixo das Script Properties usadas para rastrear deadlines de formulários.
 * Formato: 'DEADLINE_' + triggerId → formId
 * Usado em FormOnboarding.gs para fechar formulários vencidos.
 */
const PROP_DEADLINE_PREFIX      = 'DEADLINE_';

// =====================================================
//  ROTAS DO PROXY (doPost switch)
// =====================================================

/** Rota para registrar / atualizar chave API Gemini do professor */
const ROUTE_REGISTRAR_CHAVE     = 'registrar_chave';

/** Rota para análise socrática de um trecho do aluno */
const ROUTE_ANALISAR            = 'analisar';

/** Rota para log de métricas comportamentais */
const ROUTE_LOGAR_METRICAS      = 'logar_metricas';

/** Rota para consulta de status de licença do professor */
const ROUTE_STATUS_LICENCA          = 'status_licenca';

// =====================================================
//  ROTAS: Distribuição de Templates
// =====================================================

/** [TEMPLATE-01] Rota para listar templates disponíveis (Admin) */
const ROUTE_LISTAR_TEMPLATES        = 'listar_templates';

/** [TEMPLATE-02] Rota para distribuir template do Admin para professores */
const ROUTE_DISTRIBUIR_TEMPLATE     = 'distribuir_template';

/** [TEMPLATE-03] Rota para listar turmas Classroom do professor */
const ROUTE_LISTAR_TURMAS_PROFESSOR = 'listar_turmas_professor';

/** [TEMPLATE-04] Rota para criar leva de atividade do professor para alunos */
const ROUTE_CRIAR_LEVA_TEMPLATE     = 'criar_leva_template';

/** [TEMPLATE-05] Rota para histórico de distribuições Admin */
const ROUTE_HISTORICO_TEMPLATES     = 'historico_templates';

/** [TEMPLATE-06] Rota para verificar status de uma distribuição em andamento */
const ROUTE_STATUS_DISTRIBUICAO     = 'status_distribuicao';

// =====================================================
//  FORMULÁRIO DE ONBOARDING: Títulos dos Campos
// =====================================================

/**
 * [MED-03 FIX] Títulos EXATOS dos campos do formulário de onboarding.
 * DEVEM corresponder exatamente ao que está em setupFormularioSemente()
 * e gerarLevaOnboarding(). Se alterar o título no formulário, altere aqui.
 */
const FORM_FIELD_NOME        = 'Seu Nome Completo';
const FORM_FIELD_INSTITUICAO = 'Instituição / Escola';
const FORM_FIELD_LINK_COFRE  = 'Link do arquivo de Cofre (Google Drive)';

// =====================================================
//  NOMES DE FORMULÁRIOS E PLANILHAS (Criação dinâmica)
// =====================================================

/** Nome base do formulário semente (fixo, único por servidor) */
const FORM_SEED_NAME            = 'Whitebox - Onboarding (Semente)';

/** Prefixo do nome de cada leva de onboarding */
const FORM_LEVA_PREFIX          = 'Whitebox - Onboarding: ';

/** Prefixo para planilhas individuais de professor */
const SPREADSHEET_PROF_PREFIX   = 'Whitebox - ';

/** Pasta raiz no Google Drive onde tudo é armazenado */
const DRIVE_ROOT_FOLDER_NAME    = 'whitebox';

// =====================================================
//  CACHE: Chaves do CacheService
// =====================================================

/**
 * Prefixo das chaves de cache para assignmentId do Classroom.
 * Formato: CACHE_ASSIGNMENT_PREFIX + docId → assignmentId
 * Definido em ClassroomService.gs.
 */
const CACHE_ASSIGNMENT_PREFIX   = 'ASSIGNMENT_FOR_DOC_';

/** TTL do cache de assignmentId (6h em segundos) */
const CACHE_ASSIGNMENT_TTL_SEC  = 21600;

// =====================================================
//  TOKEN: Prefixo do SHARED_TOKEN gerado automaticamente
// =====================================================

/** Prefixo do token gerado no auto-provisionamento (ex: 'WBX-<uuid>') */
const TOKEN_PREFIX              = 'WBX-';

// =====================================================
//  VERSIONING: Schema da Planilha Global
// =====================================================

/**
 * [ARCH-05] Versão atual do schema da Planilha Global.
 * Incrementar AQUI ao adicionar novas colunas obrigatórias.
 * O SchemaManager.gs usa esta constante para detectar planilhas desatualizadas
 * e executar migrações incrementais de forma automática.
 *
 * Histórico:
 *   v1 - Schema base (Assinaturas, Config, Tarefas_Globais, Ranking_Instituicao)
 *   v2 - Adicionado DataCadastro na aba Assinaturas
 */
const SCHEMA_VERSION_ATUAL      = 2;

/** Chave da aba Config que armazena a versão do schema */
const CONFIG_KEY_VERSAO_SCHEMA  = 'VersaoSchema';
