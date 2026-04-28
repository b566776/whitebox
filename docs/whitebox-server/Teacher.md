# Whitebox Server – Guia do Professor (Administração de Fluxos de Licença)

Objetivo
- Descrever como o professor interage com o Whitebox Server, com foco em configuração de chave API, status de licença e fluxo de análise via proxy.

Condições de uso
- Este guia supõe que o professor já tenha feito provisionamento ou tenha acesso via Add-on Client <docs/whitebox-client/Teacher.md>.
- Endereços de API/URLs estão disponíveis via BrainProxy e Configurações do Admin.

Fluxo de Configuração da Chave API (Gemini)
- Salvar chave Gemini do professor no Brain Proxy via client call: registrar_chave
- Verificar status de licença do professor com status_licenca
- Caso o proxy não esteja configurado, exibirá o erro PROXY_NOT_CONFIGURED

Como funciona a verificação de licença
- getTeacherLicenseStatus chama o Brain Proxy com professorEmail; o proxy retorna: ATIVO, INATIVO, PROXY_NAO_CONFIGURADO, etc.

Observabilidade
- Logs de chamadas para o proxy ajudam a diagnosticar problemas de configuração.
- Erros comuns: TOKEN ausente, ADMIN_SPREADSHEET_ID não configurado, GEMINI_GLOBAL_KEY ausente quando esperado.

Fluxo de Jurisdição de Dados
- Dados do professor são enviados ao Brain Proxy apenas com consentimento de fluxo de dados; consulte a política de privacidade interna.

Roteiro de Problemas Comuns
- Proxy não configurado: verifique BRAIN_PROXY_URL e SHARED_TOKEN no Add-on Cliente.
- Licença inativa: verifique a planilha global de admin para status correspondente.

Observação
- Este guia foca no lado servidor de aquisição de chaves e status de licenças; operações detalhadas de uso pedagógico são cobertas no Whitebox Client (Aluno/Professor).
