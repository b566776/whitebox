# ⚠️ MÓDULO ARQUIVADO — NÃO USAR

> **Status:** `ARCHIVED` — Mantido apenas como referência histórica.
> **Data de arquivamento:** 2026-04-28
> **Razão:** Substituído por `whitebox-client/` como único módulo ativo.

---

## O que era este módulo

`apps-script/` foi a **versão 1.0** do Add-on Whitebox (EvidencIA), desenvolvida antes da
arquitetura de Brain Proxy. Ele enviava dados diretamente para `triagem.cliv.app` — um
endpoint externo de terceiro — sem controle de soberania de dados.

## Por que foi arquivado

| Problema | Detalhe |
|---|---|
| **Endpoint externo** | Dados dos alunos iam para `triagem.cliv.app` sem controle do administrador |
| **Sem Brain Proxy** | Não usava a arquitetura de segurança atual |
| **Sem Script Properties** | Credenciais hardcoded no código |
| **Duplicação massiva** | 16 funções idênticas a `whitebox-client/Código.gs` |

## Módulo ativo

```
whitebox-client/   ← USE ESTE
  Código.gs        ← Add-on (container-bound)
  Sidebar.html     ← Interface lateral
  QuizEditor.html  ← Modal de edição de quiz (migrado daqui)
  appsscript.json

whitebox-server/   ← USE ESTE (para o BrainProxy)
  BrainProxy.gs
  FormOnboarding.gs
  ClassroomService.gs
  AdminSetup.gs
  Utils.gs
  TestRunner.gs
```

## Migrações realizadas

- `QuizEditor.html` → copiado para `whitebox-client/QuizEditor.html` (único artefato exclusivo deste módulo)
- Todas as outras funções já existiam em `whitebox-client/Código.gs` com arquitetura melhorada

## Como fazer deploy

```bash
# Módulo ativo (Add-on, container-bound)
cd whitebox-client
clasp push

# Servidor (standalone Web App)
cd whitebox-server
clasp push
clasp deploy
```

> ❌ **NÃO** executar `clasp push` dentro de `apps-script/` — o `.clasp.json` foi removido
> intencionalmente para prevenir deploy acidental.
