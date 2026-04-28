# Whitebox Client - Guia Administrativo

Este documento é destinado a administradores de TI e desenvolvedores que gerenciam a implantação do Add-on Whitebox Client.

## ⚙️ Propriedades de Configuração
O comportamento do Add-on é governado pelas `ScriptProperties` e `DocumentProperties`:

### Script Properties (Globais)
- `BRAIN_PROXY_URL`: A URL do Web App `whitebox-server` implantado.
- `SHARED_TOKEN`: O segredo de autenticação compartilhado entre o Cliente e o Proxy.

### Document Properties (Por Documento)
- `assignmentId`: O ID da Tarefa do Classroom vinculada a este documento.
- `courseId`: O ID do Curso do Classroom.
- `lastSync`: Timestamp do último envio de telemetria para o servidor.

## 🚀 Checklist de Implantação
1.  **Publicação**: Certifique-se de que o Add-on foi publicado como um script "vinculado ao documento" dentro do modelo **Doc Mestre**.
2.  **Escopos**: O script requer `https://www.googleapis.com/auth/documents` e `https://www.googleapis.com/auth/script.external_request`.
3.  **Link do Proxy**: Verifique se a `BRAIN_PROXY_URL` nas Script Properties aponta corretamente para a implantação ativa do `whitebox-server`.

## 🔍 Solução de Problemas
- **Erros de Rede**: Use o console do desenvolvedor do navegador para verificar chamadas `UrlFetch` que falharam para o proxy.
- **Permissão Negada**: Certifique-se de que os alunos autorizaram o Add-on a rodar em seu domínio.
- **Falhas de Sincronização**: Verifique os logs do servidor (Brain Proxy) para erros `UNAUTHORIZED`, que indicam uma incompatibilidade de `SHARED_TOKEN`.

---
*Documentação gerada via metodologia BMAD.*
