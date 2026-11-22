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

/** Indica se o professor usa a IA global da instituição */
const COL_USA_CHAVE_GLOBAL    = 'UsaChaveGlobal';

/** Chave API individual do professor (Gemini ou Claude; guardada via cofre) */
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
//  DOCUMENTO: Auto-configuração gravada no Doc
// =====================================================

/**
 * Prefixo do nome do NamedRange que carrega a configuração no documento.
 * Formato: DOC_CONFIG_RANGE_PREFIX + JSON ({ professorEmail }).
 * DEVE ser idêntico ao de whitebox-lib/Constants.gs.
 */
const DOC_CONFIG_RANGE_PREFIX = 'WHITEBOX_CONFIG:';

// =====================================================
//  SCRIPT PROPERTIES: Chaves do Servidor
// =====================================================

/** ID da Planilha Global de administração */
const PROP_ADMIN_SPREADSHEET_ID = 'ADMIN_SPREADSHEET_ID';

/** Token compartilhado para autenticar chamadas do Add-on ao Proxy */
const PROP_SHARED_TOKEN         = 'SHARED_TOKEN';

/** Provedor de IA global: 'gemini' (padrão) | 'claude' | 'ollama' — ver IAProviders.gs */
const PROP_IA_PROVIDER          = 'IA_PROVIDER';

/** Modelo do provedor global (opcional; obrigatório para 'ollama') */
const PROP_IA_MODEL             = 'IA_MODEL';

/** URL pública do servidor Ollama (só para IA_PROVIDER = 'ollama') */
const PROP_IA_BASE_URL          = 'IA_BASE_URL';

/** Chave API do provedor global (para professores que não têm chave própria) */
const PROP_IA_GLOBAL_KEY        = 'IA_GLOBAL_KEY';

/** [LEGADO] Chave Gemini global; ainda aceita quando IA_PROVIDER = 'gemini' */
const PROP_GEMINI_GLOBAL_KEY    = 'GEMINI_GLOBAL_KEY';

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

/** Rota para o resumo da telemetria de um documento (aluno vê só as próprias linhas) */
const ROUTE_RESUMO_PROCESSO         = 'resumo_processo';

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

/**
 * Texto de ajuda da pergunta do Cofre. '{EMAIL_DEV}' é trocado pelo e-mail da conta que
 * executa o servidor (quem lê o arquivo). Formulários já criados são atualizados por
 * atualizarAjudaFormulariosOnboarding() (FormOnboarding.gs).
 */
const FORM_HELP_LINK_COFRE   =
  'Opcional. Serve para ativar a análise por IA com a sua própria chave.\n' +
  '1. Gere uma chave de IA: Gemini (começa com AIza) em https://aistudio.google.com/app/apikey ' +
  'ou Claude (começa com sk-ant-) em https://console.anthropic.com\n' +
  '2. No computador, salve só a chave num arquivo de texto .txt (Bloco de Notas) e envie esse ' +
  'arquivo ao seu Google Drive. Um documento Google Docs não funciona.\n' +
  '3. No Drive, compartilhe o arquivo como Leitor com {EMAIL_DEV} ou com ' +
  '"Qualquer pessoa com o link".\n' +
  '4. Copie o link do arquivo e cole aqui.\n' +
  'Se deixar em branco, o cadastro é feito sem IA. ' +
  'Você pode colar a chave depois no painel do Whitebox: aba ⚙️ Config > 💾 Salvar Chave API.';

// =====================================================
//  NOMES DE FORMULÁRIOS E PLANILHAS (Criação dinâmica)
// =====================================================

/** Nome base do formulário semente (fixo, único por servidor) */
const FORM_SEED_NAME            = 'Whitebox - Onboarding (Semente)';

/** Prefixo do nome de cada leva de onboarding */
const FORM_LEVA_PREFIX          = 'Whitebox - Onboarding: ';

/** Prefixo para planilhas individuais de professor */
const SPREADSHEET_PROF_PREFIX   = 'Whitebox - ';

/** Pasta na raiz do Meu Drive onde fica tudo que o Whitebox cria */
const DRIVE_ROOT_FOLDER_NAME    = 'WhiteBox';

/** Subpasta de DRIVE_ROOT_FOLDER_NAME com os projetos de script */
const DRIVE_SCRIPTS_FOLDER_NAME = 'Scripts';

/** Caminho antigo (a partir do Meu Drive) da pasta do Whitebox, migrado por organizarPastasWhitebox() */
const DRIVE_PASTA_ANTIGA        = ['GDrive Meus Documentos', 'Projetos', 'whitebox'];

/** Projeto de script standalone da biblioteca WhiteboxLib (o do servidor vem de ScriptApp.getScriptId()) */
const WHITEBOX_LIB_SCRIPT_ID    = '1I-W1uY1EjP6i0cyKF-nfXcLC989yUIKirmmAb44aPbVFLkwMR8uz5Yt8';

// =====================================================
//  CACHE: Chaves do CacheService
// =====================================================

/**
 * Prefixo das chaves de cache para assignmentId do Classroom.
 * Formato: CACHE_ASSIGNMENT_PREFIX + docId → assignmentId
 * Definido em ClassroomService.gs.
 */
const CACHE_ASSIGNMENT_PREFIX   = 'ASSIGNMENT_FOR_DOC_';

/** Chave do cache dos heatmaps agregados (instituição, professor e turma) */
const CACHE_HEATMAP_GERAL       = 'HEATMAP_GERAL';

/** TTL do cache dos heatmaps agregados (5 min); nova análise ou entrega o invalida antes */
const CACHE_HEATMAP_GERAL_TTL_SEC = 300;

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
