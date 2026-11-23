/**
 * ========================================================
 *  Whitebox — IAProviders.gs (Servidor)
 *  Provedores de IA configuráveis para a análise socrática
 * ========================================================
 *
 * CONFIGURAÇÃO (Script Properties deste script):
 *   IA_PROVIDER   — 'gemini' (padrão) | 'claude' | 'ollama'
 *   IA_MODEL      — (Opcional) modelo a usar; sem ele vale o modeloPadrao do provedor.
 *                   Obrigatório para 'ollama' (depende do que está instalado no servidor).
 *   IA_BASE_URL   — Só 'ollama': URL pública do servidor (ex.: https://ollama.com).
 *                   Este script roda na nuvem do Google: 'localhost' não funciona.
 *   IA_GLOBAL_KEY — Chave do provedor global. Opcional para 'ollama'.
 *                   GEMINI_GLOBAL_KEY continua valendo quando IA_PROVIDER = 'gemini'.
 *
 * Essa configuração vale para professores com UsaChaveGlobal = 'Sim'. A chave
 * individual de um professor escolhe o provedor pelo formato (prefixoChave):
 * 'AIza...' ou 'AQ....' → Gemini, 'sk-ant-...' → Claude.
 *
 * PARA ADICIONAR UM PROVEDOR: inclua uma entrada em IA_PROVIDERS com
 * montarRequisicao() e extrairTexto(). Nada mais precisa mudar.
 */

/**
 * Modelos Claude que aceitam `fallbacks: "default"`: se um classificador de segurança
 * recusar o pedido, a própria API o reexecuta em outro modelo (cobrado pela tarifa dele).
 */
const CLAUDE_MODELOS_COM_FALLBACK = [
  'claude-fable-5-1', 'claude-opus-5-5', 'claude-opus-5', 'claude-sonnet-5-5'
];

const IA_PROVIDERS = {

  gemini: {
    modeloPadrao: 'gemini-3.8-flash',
    // 'AIza...' é o formato antigo; o Google AI Studio passou a gerar chaves 'AQ.'.
    prefixoChave: ['AIza', 'AQ.'],
    exigeChave:   true,
    montarRequisicao: function(prompt, ia) {
      return {
        url: 'https://generativelanguage.googleapis.com/v1beta/models/' +
             encodeURIComponent(ia.model) + ':generateContent',
        headers: { 'x-goog-api-key': ia.apiKey },
        payload: {
          contents: [{ parts: [{ text: prompt }] }],
          // Sem temperature: o Gemini 3 recomenda manter o padrão. O raciocínio do
          // modelo também consome maxOutputTokens, por isso o teto folgado.
          generationConfig: { maxOutputTokens: 8192, responseMimeType: 'application/json' }
        }
      };
    },
    extrairTexto: function(resposta) {
      const parts = resposta?.candidates?.[0]?.content?.parts || [];
      return parts.filter(p => !p.thought).map(p => p.text || '').join('');
    }
  },

  claude: {
    modeloPadrao: 'claude-opus-5-5',
    prefixoChave: 'sk-ant-',
    exigeChave:   true,
    montarRequisicao: function(prompt, ia) {
      const req = {
        url: 'https://api.anthropic.com/v1/messages',
        headers: { 'x-api-key': ia.apiKey, 'anthropic-version': '2023-06-01' },
        // Sem temperature nem thinking: os modelos atuais rejeitam o primeiro e já
        // raciocinam por padrão. O raciocínio consome max_tokens, por isso o teto folgado.
        payload: {
          model:      ia.model,
          max_tokens: 16000,
          messages:   [{ role: 'user', content: prompt }]
        }
      };
      if (CLAUDE_MODELOS_COM_FALLBACK.indexOf(ia.model) !== -1) {
        req.headers['anthropic-beta'] = 'server-side-fallback-2026-07-01';
        req.payload.fallbacks = 'default';
      }
      return req;
    },
    extrairTexto: function(resposta) {
      // Recusa chega como HTTP 200; conferir antes de ler o conteúdo.
      if (resposta.stop_reason === 'refusal') {
        throw new Error('O modelo recusou analisar este trecho.');
      }
      // Blocos de raciocínio vêm antes do texto: filtrar por tipo, nunca ler content[0].
      return (resposta.content || []).filter(b => b.type === 'text').map(b => b.text).join('');
    }
  },

  ollama: {
    modeloPadrao: null,
    prefixoChave: null,
    exigeChave:   false,
    montarRequisicao: function(prompt, ia) {
      return {
        url: ia.baseUrl.replace(/\/+$/, '') + '/api/chat',
        // Chave só é necessária no Ollama Cloud ou atrás de um proxy autenticado
        headers: ia.apiKey ? { 'Authorization': 'Bearer ' + ia.apiKey } : {},
        payload: {
          model:    ia.model,
          messages: [{ role: 'user', content: prompt }],
          stream:   false,
          format:   'json',
          options:  { temperature: 0.4 }
        }
      };
    },
    extrairTexto: function(resposta) {
      return resposta?.message?.content || '';
    }
  }
};

// =====================================================
//  CONFIGURAÇÃO: provedor global e detecção por chave
// =====================================================

/**
 * Indica se a IA global (Script Properties) está pronta para uso.
 *
 * @param {object} cfg - getConfig()
 * @returns {boolean}
 */
function iaGlobalDisponivel(cfg) {
  if (!Object.prototype.hasOwnProperty.call(IA_PROVIDERS, cfg.iaProvider)) {
    Logger.log('[IA] IA_PROVIDER desconhecido: ' + cfg.iaProvider);
    return false;
  }
  const provider = IA_PROVIDERS[cfg.iaProvider];
  if (!cfg.iaModel && !provider.modeloPadrao) return false;
  return provider.exigeChave ? !!cfg.iaGlobalKey : !!cfg.iaBaseUrl;
}

/**
 * Deduz o provedor pelo formato da chave de API.
 *
 * @param {string} chave
 * @returns {string|null} Nome do provedor em IA_PROVIDERS, ou null se não parece uma chave
 */
function detectarProvedorPorChave(chave) {
  if (!chave) return null;
  const nomes = Object.keys(IA_PROVIDERS);
  for (let i = 0; i < nomes.length; i++) {
    const prefixos = [].concat(IA_PROVIDERS[nomes[i]].prefixoChave || []);
    for (let j = 0; j < prefixos.length; j++) {
      if (chave.indexOf(prefixos[j]) === 0) return nomes[i];
    }
  }
  return null;
}

// =====================================================
//  LÓGICA: Análise Socrática (qualquer provedor)
// =====================================================

/**
 * @param {string} fragmento
 * @param {object} metricas
 * @param {{ provider: string, model: string, apiKey: string|null, baseUrl: string|null }} ia
 *        Resultado de resolverConfigIA()
 * @param {string} [conselhoPedagogico]
 * @returns {object} Análise em JSON, ou { error: 'IA_...' }
 */
function analisarComIA(fragmento, metricas, ia, conselhoPedagogico) {
  const prompt   = construirPromptSocratico(fragmento, metricas, conselhoPedagogico);
  const provider = IA_PROVIDERS[ia.provider];
  const tag      = '[IA:' + ia.provider + '] ';
  // Todo erro leva um `message` legível: é o que a barra lateral mostra ao professor.
  const origem   = ia.provider + ' (' + ia.model + ')';

  try {
    const req = provider.montarRequisicao(prompt, ia);
    const response = UrlFetchApp.fetch(req.url, {
      method: 'post',
      contentType: 'application/json',
      headers: req.headers,
      payload: JSON.stringify(req.payload),
      muteHttpExceptions: true
    });

    const code = response.getResponseCode();
    const content = response.getContentText();

    if (code !== 200) {
      Logger.log(tag + 'Erro HTTP ' + code + ': ' + content);
      return {
        error:   'IA_API_ERROR',
        code:    code,
        message: origem + ' respondeu HTTP ' + code + ': ' + _detalheErroProvedor(content)
      };
    }

    let result;
    try {
      result = JSON.parse(content);
    } catch (e) {
      Logger.log(tag + 'Resposta da API não é um JSON válido: ' + content);
      return { error: 'IA_INVALID_RESPONSE_FORMAT', message: origem + ' devolveu uma resposta que não é JSON.' };
    }

    const text = provider.extrairTexto(result);
    if (!text) {
      return { error: 'IA_EMPTY_RESPONSE', message: origem + ' não devolveu texto.' };
    }

    // O prompt pede JSON estruturado - uso do extrairJSON para robustez
    return extrairJSON(text);
  } catch (err) {
    Logger.log(tag + 'Exceção: ' + err);
    return { error: 'IA_EXCEPTION', message: origem + ': ' + (err.message || err.toString()) };
  }
}

/**
 * Extrai a mensagem de erro do corpo devolvido pelo provedor
 * (Gemini e Claude: { error: { message } }; Ollama: { error: "..." }).
 * Corpos fora desse formato (ex.: página HTML de um proxy) são devolvidos truncados.
 *
 * @private
 */
function _detalheErroProvedor(content) {
  try {
    const erro = JSON.parse(content).error;
    const msg  = (erro && erro.message) || (typeof erro === 'string' ? erro : '');
    if (msg) return String(msg).substring(0, 300);
  } catch (e) {}
  return String(content).substring(0, 300);
}
