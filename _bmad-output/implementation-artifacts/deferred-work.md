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
- source_spec: none
  summary: Campo de declaração de uso de IA preenchido pelo aluno no painel e visível ao professor (política UCPel/Cásper exige declaração).
  evidence: Dividido da entrega B em 2026-10-31; o usuário escolheu fazer primeiro o relatório de processo sem veredito (B1+B2).
- source_spec: none
  summary: Lembrete de ativação do painel Whitebox no documento distribuído (texto ou banner no documento-modelo) para reduzir entregas sem telemetria.
  evidence: Dividido da entrega B em 2026-10-31; entrega independente do relatório de processo.
- source_spec: none
  summary: whitebox-client/Código.gs não tem wrappers para getSubmissionStatus e updatePasteMap, que a Sidebar chama via google.script.run; nas cópias distribuídas essas chamadas caem no failureHandler (estado de entrega e mapa de colagem por pulso nunca chegam à biblioteca).
  evidence: Observado na investigação da entrega B (2026-10-31) comparando os wrappers do cliente com as chamadas da Sidebar; não verificado em runtime.
- source_spec: `_bmad-output/implementation-artifacts/spec-process-report-no-verdict.md`
  summary: Dashboard Admin com evidência primeiro (alunos ativos, documentos, minutos de escrita por nível) e Integridade/Alertas atrás de uma chave global de Config `mostrar_risco`, desligada por padrão; inclui agregar esforço em calcularHeatmapsGerais.
  evidence: Decisão do usuário em 2026-10-31 ao revisar a spec B1+B2: spec própria depois do relatório de processo.
- source_spec: `_bmad-output/implementation-artifacts/spec-process-report-no-verdict.md`
  summary: Preferência por professor MostrarRisco (coluna em Assinaturas com migração v4 e inclusão no AdminSetup, retorno em status_licenca, rota de gravação, checkbox na aba Config) e ocultação por padrão de badge/barra de coerência, rótulos Alerta/Genuíno e cores por score no mapa de calor (oculto até o status chegar, re-render depois).
  evidence: Dividido da spec B1+B2 em 2026-10-31 após revisão independente apontar duas entregas independentes e spec acima de 3.400 tokens; o usuário escolheu implementar primeiro o relatório de processo.
