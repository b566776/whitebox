/**
 * =====================================================
 *  Whitebox — Constants.gs (Cliente / Add-on)
 * =====================================================
 *
 * [ARCH-03] Fonte única da verdade para todos os literais de string
 * do whitebox-client. Se uma chave de propriedade, rota de proxy ou
 * chave de Document Properties precisar mudar, altere APENAS aqui.
 *
 * REGRA: Nenhuma lógica ou função aqui. Apenas `const`.
 *
 * ESCOPO: Compartilhadas entre Código.gs e Utils.gs do whitebox-client.
 */

// =====================================================
//  SERVIDOR: URL do Brain Proxy
// =====================================================

/**
 * URL do Web App do Brain Proxy (whitebox-server). É para cá que o add-on envia o
 * OAuth token do usuário em toda chamada.
 *
 * Fica fixa no código de propósito: se viesse de propriedades ou do conteúdo do documento,
 * qualquer usuário poderia apontá-la para outro servidor e receber os tokens dos demais.
 *
 * Para trocar: edite aqui, crie uma nova versão da biblioteca e atualize o cliente.
 * Atualizar a implantação existente (clasp update-deployment) NÃO muda a URL;
 * só criar uma implantação nova muda.
 */
const BRAIN_PROXY_URL = 'https://script.google.com/macros/s/AKfycbwAzIlfKhJ2zoX7NV1jCzuGU8gb7PeNtXHE3evj1-X5ebcI2oiMbKUhrqrSWhL73uqg/exec';

// =====================================================
//  DOCUMENT PROPERTIES: Chaves persistidas no documento
// =====================================================

/** Quiz pendente aguardando resposta do aluno (JSON stringificado) */
const DOC_PROP_PENDING_QUIZ = 'PENDING_QUIZ';

/** Flag de entrega manual — 'true' quando aluno marca como entregue */
const DOC_PROP_SUBMITTED    = 'SUBMITTED';

/** Email do aluno salvo no documento (pré-preenchimento no QuizEditor) */
const DOC_PROP_STUDENT_EMAIL = 'STUDENT_EMAIL';

/** Mapa de eventos de colagem capturados via telemetria da Sidebar (JSON) */
const DOC_PROP_PASTE_MAP    = 'WHITEBOX_PASTE_MAP';

// =====================================================
//  DOCUMENTO: Auto-configuração gravada pelo servidor
// =====================================================

/**
 * Prefixo do nome do NamedRange que carrega a configuração no documento.
 * Formato: DOC_CONFIG_RANGE_PREFIX + JSON ({ professorEmail }).
 * DEVE ser idêntico ao de whitebox-server/Constants.gs.
 */
const DOC_CONFIG_RANGE_PREFIX = 'WHITEBOX_CONFIG:';

// =====================================================
//  ROTAS DO PROXY (callProxy)
// =====================================================

/** Rota para registrar / atualizar chave API Gemini do professor */
const ROUTE_REGISTRAR_CHAVE = 'registrar_chave';

/** Rota para análise socrática de um trecho do aluno */
const ROUTE_ANALISAR        = 'analisar';

/** Rota para log de métricas comportamentais */
const ROUTE_LOGAR_METRICAS  = 'logar_metricas';

/** Rota para consulta de status de licença do professor */
const ROUTE_STATUS_LICENCA  = 'status_licenca';

// =====================================================
//  ROTAS: Distribuição de Templates
// =====================================================

/** Rota para listar templates disponíveis (Admin) */
const ROUTE_LISTAR_TEMPLATES        = 'listar_templates';

/** Rota para distribuir template do Admin para professores */
const ROUTE_DISTRIBUIR_TEMPLATE     = 'distribuir_template';

/** Rota para listar turmas Classroom do professor */
const ROUTE_LISTAR_TURMAS_PROFESSOR = 'listar_turmas_professor';

/** [TEMPLATE-04] Rota para criar leva de atividade do professor para alunos */
const ROUTE_CRIAR_LEVA_TEMPLATE     = 'criar_leva_template';

/** [TEMPLATE-05] Rota para histórico de distribuições Admin */
const ROUTE_HISTORICO_TEMPLATES     = 'historico_templates';

/** [TEMPLATE-06] Rota para verificar status de uma distribuição em andamento */
const ROUTE_STATUS_DISTRIBUICAO     = 'status_distribuicao';


// =====================================================
//  CACHE: Chaves do CacheService (validação de fontes)
// =====================================================

/**
 * Prefixo das chaves de cache de status de URLs.
 * Formato: CACHE_URL_STATUS_PREFIX + domain → { isReliable, status }
 * TTL: 1h (3600s) — definido em validateSourceReliability()
 */
const CACHE_URL_STATUS_PREFIX = 'URL_STATUS_';

/** TTL do cache de status de URL (1 hora em segundos) */
const CACHE_URL_STATUS_TTL_SEC = 3600;

// =====================================================
//  ROLES E ESTADOS
// =====================================================

/** Professor identificado mas sem pasta Classroom — modo offline */
const ROLE_UNKNOWN          = 'NAO_IDENTIFICADO';

/** Turma padrão quando o aluno não está em pasta Classroom */
const TURMA_FALLBACK        = 'SEM_TURMA';

/** Status de quiz pendente aguardando resposta */
const QUIZ_STATUS_PENDING   = 'PENDING';

/** Status de quiz já respondido pelo aluno */
const QUIZ_STATUS_ANSWERED  = 'ANSWERED';

/** Indicador de que o quiz gerado está disponível para envio */
const QUIZ_DISPONIVEL       = 'AVAILABLE';

/** Indicador de que nenhum quiz foi gerado (risco abaixo do threshold) */
const QUIZ_NONE             = 'NONE';
