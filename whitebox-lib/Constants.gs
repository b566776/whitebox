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
const BRAIN_PROXY_URL = 'https://script.google.com/macros/s/AKfycbzRiSQpiKHH4DG1Ts5Jyx7DdbX7rLJmyPRPQEmqg4JGVFOVwpn_WaAIsE0kqvhie1GJiA/exec';

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

/**
 * Cópia do professor designado (e-mail). O WHITEBOX_CONFIG é um NamedRange preso ao
 * primeiro parágrafo e some quando o aluno apaga o começo do documento; esta propriedade
 * não depende do texto. getDesignatedProfessors() grava aqui quando acha o NamedRange e,
 * quando ele sumiu, lê daqui e recria o NamedRange.
 */
const DOC_PROP_PROFESSOR    = 'WHITEBOX_PROFESSOR';

/**
 * Impressões (hash) dos parágrafos que vieram do modelo, gravadas na primeira abertura
 * do painel pelo aluno numa cópia SEM a linha MARCADOR_INICIO_ALUNO (modelos antigos).
 * Esses parágrafos não contam em Palavras Escritas, no Radar nem como colagem.
 */
const DOC_PROP_BASELINE     = 'WHITEBOX_BASELINE';

/**
 * Hashes dos parágrafos já vistos neste documento (LRU, no máximo PARAGRAFOS_VISTOS_MAX).
 * Um parágrafo que reaparece igual (restaurar versão, desfazer, mover) não é colagem.
 */
const DOC_PROP_PARAGRAFOS_VISTOS = 'WHITEBOX_SEEN_PARAS';

/** Hashes dos parágrafos na última medição (para saber o que reapareceu desde então) */
const DOC_PROP_SNAPSHOT_HASHES   = 'WHITEBOX_PARA_HASHES';

/** Teto da lista de parágrafos vistos (cabe folgado nos 9 KB de uma propriedade) */
const PARAGRAFOS_VISTOS_MAX = 400;

// =====================================================
//  DOCUMENTO: Linha que separa o modelo do texto do aluno
// =====================================================

/**
 * Texto da linha do Documento Modelo abaixo da qual o aluno escreve. Tudo até esta linha
 * (inclusive) é do modelo: não conta em Palavras Escritas, no Radar de Esforço nem como
 * colagem. A comparação ignora maiúsculas, acentos e símbolos ao redor.
 * DEVE ser idêntico a MARCADOR_INICIO_ALUNO em whitebox-server/Constants.gs.
 */
const MARCADOR_INICIO_ALUNO = 'ESCREVA O SEU TRABALHO ABAIXO DESTA LINHA';

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

/** Rota para o resumo da telemetria de um documento (aluno vê só as próprias linhas) */
const ROUTE_RESUMO_PROCESSO = 'resumo_processo';

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

/** Cópia do documento mestre com o título da atividade (nome da cópia do aluno) */
const ROUTE_COPIAR_MODELO_ATIVIDADE = 'copiar_modelo_atividade';


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

// =====================================================
//  RADAR DE ESFORÇO: estados por evidência
// =====================================================

/**
 * Estados de um parágrafo no Radar de Esforço. A cor mostra só evidência de processo,
 * nunca o tamanho do parágrafo. O código de uma letra vai para o log (Heatmap_Scores).
 */
const RADAR_ESTADO_SEM_ALERTA      = 'S'; // nenhuma evidência contra (não prova autoria)
const RADAR_ESTADO_COLAGEM         = 'C'; // entrou de uma vez, rápido demais para digitação
const RADAR_ESTADO_COLAGEM_EDITADA = 'E'; // começou como colagem e depois foi alterado
const RADAR_ESTADO_NAO_OBSERVADO   = 'N'; // apareceu enquanto o painel estava fechado
const RADAR_ESTADO_LEGADO          = 'L'; // alerta gravado pela versão antiga (por posição)

/** Crescimento mínimo (caracteres) entre duas medições para ser avaliado. */
const RADAR_CRESCIMENTO_MIN = 80;

/** Crescimento mínimo de um parágrafo para receber o alerta da medição. */
const RADAR_CRESCIMENTO_MIN_PARAGRAFO = 40;

/**
 * Ritmo acima do qual a entrada não é digitação (caracteres por segundo). 8/s = 480 por
 * minuto, perto de 100 palavras por minuto: digitação muito rápida e contínua.
 */
const RADAR_CPS_COLAGEM = 8;

/**
 * Intervalo máximo entre duas medições para o painel ter "visto" a escrita. Acima disso
 * (painel fechado, professor abrindo dias depois), o que cresceu é "não observado".
 */
const RADAR_JANELA_OBSERVADA_MS = 90 * 1000;

/** Hora (ms) da última medição de parágrafos (WHITEBOX_PARA_SNAPSHOT). */
const DOC_PROP_SNAPSHOT_TS = 'WHITEBOX_PARA_SNAPSHOT_TS';

/** De onde veio a linha de base: 'revisao' (1ª revisão do Drive) ou 'abertura' (1ª abertura). */
const DOC_PROP_BASELINE_FONTE = 'WHITEBOX_BASELINE_FONTE';

/** Teto de alertas guardados no mapa (cabe nos 9 KB de uma propriedade). */
const RADAR_MAPA_MAX = 70;

/** Quantos caracteres normalizados do início do parágrafo identificam uma colagem editada. */
const RADAR_PREFIXO = 40;
