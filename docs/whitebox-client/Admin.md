# Whitebox Client – Guia do Administrador (Add-on)

Objetivo
- Orientar a instalação, configuração de proxy e gestão dos objetos de licença para o ambiente de Google Docs via Add-on.

Conteúdo
- Requisitos de instalação
- Configuração de BRAIN_PROXY_URL e SHARED_TOKEN
- Fluxo de provisionamento do servidor (integração com Brain Proxy)
- Gerenciamento de usuários e permissões via Admin Console
- Diagnóstico e logs

Configurações
- BRAIN_PROXY_URL: URL do Web App do BrainProxy
- SHARED_TOKEN: Token compartilhado entre Client e Brain Proxy

Guia de Operação
- Primeiro uso: configurar o proxy, autorizar o Add-on no Docs, iniciar sessão como administrador.
- Monitorar chamadas ao Brain Proxy via console/logs do Script.

Notas de Segurança
- Tokens devem ser protegidos; não vazar URLs de proxy ou tokens em logs públicos.
