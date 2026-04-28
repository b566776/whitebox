# Whitebox Client – Guia do Professor (Add-on)

Objetivo
- Descrever como o professor utiliza o Add-on no Google Docs para gerenciar sessões, salvar API keys Gemini e consultar status de licença.

Fluxo Principal
- Abrir o Add-on Whitebox no Docs (Menu Whitebox > Abrir Painel Whitebox).
- Na aba Configurações, registrar a API Key Gemini via callProxy/saveTeacherApiKey.
- Verificar status de licença com getTeacherLicenseStatus(); interpretar respostas como ATIVO/INATIVO/PROXY_NAO_CONFIGURADO.
- Enviar trechos para análise quando permitido pelo professor (via Brain Proxy).

Segurança e Privacidade
- A chave Gemini pode ser armazenada apenas localmente ou no Brain Proxy conforme política; nunca compartilhe chaves em logs.

Problemas Comuns
- PROXY_NOT_CONFIGURED: configure BRAIN_PROXY_URL e SHARED_TOKEN na configuração do Add-on.
- Licença não encontrada: valide se o professor está cadastrado e ativo na planilha Admin.
