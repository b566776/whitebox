- source_spec: none
  summary: Painel de evidência sem veredito — ocultar RiscoScore/Integridade por padrão (opt-in do professor), aluno vê as mesmas métricas de processo que o professor, campo de declaração de uso de IA e lembrete de ativação do painel no documento distribuído.
  evidence: Dividido do pedido "implementar o que falta" (adequação ao nicho IES) em 2026-10-31; o usuário escolheu começar pela redução de escopos OAuth.
- source_spec: none
  summary: Licença institucional — papel de admin de IES e provisionamento automático de professores por domínio de e-mail na aba Assinaturas, mantendo o cadastro manual.
  evidence: Dividido do pedido "implementar o que falta" (adequação ao nicho IES) em 2026-10-31; entrega independente da redução de escopos OAuth.
- source_spec: none
  summary: Distribuição de cópias por aluno sem depender do Google Classroom (lista de e-mails ou planilha), reaproveitando TemplateService do servidor.
  evidence: Dividido do pedido "implementar o que falta" (adequação ao nicho IES) em 2026-10-31; entrega independente da redução de escopos OAuth.
- source_spec: `_bmad-output/implementation-artifacts/spec-reduce-oauth-scopes.md`
  summary: Gravar o nome da turma no WHITEBOX_CONFIG na distribuição de turma única (TemplateService._gravarConfigNoDocumento) e usar esse valor na biblioteca quando o Drive não der acesso à pasta, para a turma não cair em SEM_TURMA sem drive.readonly.
  evidence: Dividido da spec de redução de escopos em 2026-10-31 para ficar dentro do limite de tokens; só vale a pena se o teste pós-deploy mostrar que drive.file não cobre o documento ativo em script vinculado.
- source_spec: `_bmad-output/implementation-artifacts/spec-reduce-oauth-scopes.md`
  summary: O aviso "Sem acesso ao Drive" da Sidebar só é coberto por teste de texto-fonte; falta um harness de DOM que execute o handler de getContext e verifique o toggle do elemento.
  evidence: Achado da camada verification-gap (disposição defer); o repositório não tem harness de navegador, e o aviso foi adicionado à checklist de smoke test manual.
