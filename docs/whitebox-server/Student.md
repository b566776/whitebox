# Whitebox Server – Guia do Aluno (Interação com o Documento)

Objetivo
- Explicar como o aluno interage com o Whitebox por meio do Documento Google e quais dados são gerados/compartilhados.

Visão Geral
- O aluno utiliza o documento para as atividades pedagógicas; o servidor/ proxy processa trechos de texto conforme autorização do professor.
- Dados enviados pelo aluno podem incluir métricas básicas e trechos de texto para análise (conforme políticas internas).

Fluxo Típico de Uso
- Abrir o documento model, permitir que o professor configure a sessão de análise.
- Selecionar trechos para análise (quando permitido pelo professor) e iniciar envio para o Brain Proxy via Add-on Client.
- Visualizar resultados (quando retornados pelo proxy) na interface do documento.

Privacidade e Segurança
- Dados do aluno são tratados sob as políticas da instituição. Evite enviar informações sensíveis sem consentimento.
- O tráfego de dados passa pelo Brain Proxy com token de autenticação; o usuário final não precisa interagir com tokens.

Limitações
- Em ambientes onde o proxy não está configurado, o fluxo pode operar offline com métricas locais apenas.

Resolução de Problemas
- Se não houver resposta do proxy, verifique a conectividade e as configurações do Add-on Client (BRAIN_PROXY_URL e SHARED_TOKEN).
- Em casos de erro, consulte os logs da planilha Admin para eventos de provisionamento e permissões.
