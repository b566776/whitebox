---
title: "PRFAQ Distillate: WhiteBox para IES"
type: llm-distillate
source: "prfaq-whitebox.md"
created: "2026-10-31"
purpose: "Token-efficient context for downstream PRD creation"
---

## Posicionamento e enquadramento

- Frase central: "evidência de processo para decisão humana, em português, LGPD por desenho; nunca detector de IA". Sustentada por CNE (revisão humana obrigatória), UCPel OS 035/2025 e Cásper Líbero v1.0 (detector nunca prova exclusiva; rascunhos e versões intermediárias exigíveis), Vanderbilt 2023 e WSU fev/2026 (cancelamentos por falso positivo).
- Headlines rejeitadas: "O fim do detector de IA na universidade" (define o produto pelo concorrente); "Prova de autoria para o aluno" (promete certificado que o produto não entrega).
- Argumento de venda institucional: "cumpra a política de IA que seu conselho aprovou, em escala, sem multiplicar carga docente e sem gerar passivo disciplinar". Não é "detecte mais".
- Nicho é ensino superior, não K-12, porque a âncora é regulatória (CNE, marco da EAD) e de política institucional.
- Simetria aluno-professor (mesmo relatório para os dois) é propriedade do produto e resposta à resistência estudantil (42% acham intrusivo entregar histórico completo; por isso entregar resumo de processo, nunca histórico).

## Sinais de requisito para o PRD

- Relatório de processo sem veredito; pontuação de risco existente desligada por padrão, opt-in do professor, com recomendação de política para manter desligada.
- Relatório idêntico visível ao aluno antes da entrega; painel do aluno mostra "gravando" em tempo real.
- Campo de declaração de uso de IA preenchido pelo aluno, anexado à entrega.
- Visão por turma ordenada por padrão de processo, destacando entregas que merecem conversa.
- Lembrete de ativação do painel dentro do documento distribuído.
- Painel por curso, turma e campus com tendências agregadas, sem conteúdo de texto.
- Camada de IA (Gemini) estritamente opcional e só para perguntas socráticas na devolutiva.
- Distribuição por lista de e-mails ou planilha, além do Classroom, para IES mista.
- Documentação explícita das limitações: redigitação de saída de IA aparece como humano; ditado por voz como "não verificado"; entrega sem telemetria não é indício contra o aluno.
- Hospedagem dos logs no domínio da IES (hoje ficam em conta administrativa do WhiteBox e planilha do professor): fast-follow obrigatório antes do primeiro contrato institucional.
- Entregáveis contratuais: contrato de operador de dados, lista do que é e não é coletado, retenção limitada, exclusão a pedido, exportação integral, relatório de impacto à proteção de dados como entregável do piloto, cláusula de saída.
- Só escopos OAuth não restritos (drive.file já implementado em 31/10/2026); verificação OAuth e listagem no Marketplace pendentes; allowlist pelo admin do Workspace.

## Contexto técnico e restrições

- Arquitetura atual: whitebox-client (script vinculado ao documento-modelo), whitebox-lib (biblioteca), whitebox-server (Apps Script rodando como conta admin, Google Sheets como banco, Gemini com chave do professor ou da instituição).
- Só desktop; não funciona em celular.
- Ativação passiva: o Google não permite complemento rodando oculto ao abrir o documento; o aluno precisa acionar o painel e aceitar OAuth na primeira vez.
- Escala não medida: cotas do Apps Script por conta/dia e limites de células do Sheets; serve para pilotos de centenas a poucos milhares de alunos; contrato com grupo de 50 mil matrículas exige migração do servidor (Cloud Run ou equivalente, banco real). Ação: medir cota por aluno ativo no primeiro piloto e fixar o teto suportado.
- Roda no Workspace for Education Fundamentals (gratuito); add-ons oficiais do Classroom exigem Education Plus ou Teaching and Learning Upgrade.

## Inteligência competitiva

- Turnitin: incumbente de orçamento nas públicas (USP, Unicamp, UnB, UFC, UEL), R$ 9,70 a R$ 20 por usuário/ano, inexigibilidade, via Turnitin Brazil Ltda ou Learnbase. Churn documentado no exterior (WSU, Newcastle, Southampton).
- Turnitin Clarity: evidência de processo, mas aluno escreve no editor da Turnitin via LTI 1.3 (Canvas, Moodle), sem Classroom, assistente só em inglês, pilotos nos EUA, sem preço público nem cliente brasileiro.
- Grammarly Authorship, GPTZero Writing Replay, Revision History, Brisk, Draftback: extensões Chrome, K-12 anglófono, sem português, instalação por máquina. Revision History e Brisk são a ameaça de entrada mais provável (barreira de tradução baixa, 200 mil+ educadores).
- Plagius e CopySpider: antiplágio brasileiro barato, sem Docs, sem processo. Nenhuma startup brasileira de evidência de processo.
- Risco de plataforma: Google cobrir o espaço nos relatórios de originalidade do Classroom ou no Gemini for Education; sem sinal público hoje.

## Escopo

- Dentro (MVP institucional): relatório sem veredito, relatório ao aluno, declaração de IA, visão por turma, admin de IES com provisionamento por domínio, contrato de dados, Marketplace sem escopos restritos, lembrete de ativação, distribuição sem Classroom.
- Fora: detecção de IA por texto; Moodle, Canvas, LTI; celular; K-12; universidades públicas antes de prova social privada; programa de parceiros Google e revenda de Workspace; painel admin além de visão por turma e tendências por curso.
- Talvez: logs hospedados no domínio da IES (obrigatório antes do primeiro contrato, mas depende de rearquitetura); migração para Cloud Run (condicionada ao teto de escala medido).

## Go-to-market, preço e recursos

- Segmento inicial: IES privadas com Google Workspace; prioridade Ser Educacional e Cruzeiro do Sul (pilotos ABMES–Google jan/2026); centros universitários com Direito, Pedagogia, Comunicação, Administração e EAD em escala. Públicas: segunda onda via biblioteca e pró-reitoria de pós.
- Canal: professor primeiro (documento-modelo gratuito), piloto pago via programas de inovação (Yduqs Labs: ciclo ~6 meses, exige CNPJ e solução validada) e vitrine ABMES, depois licença anual.
- Preço: licença anual por professor ativo ou por aluno em disciplina com WhiteBox; custo total para a instituição abaixo do Turnitin Similarity; tabela publicada após pilotos. Exemplo hipotético: R$ 600/professor ativo/ano, 60 professores em centro de 5.000 alunos = R$ 36 mil (R$ 7,20/aluno). Pilotos pagos com valor simbólico.
- Comprador presumido (sem fonte): pró-reitor acadêmico ou coordenador de EAD. Ciclo presumido 45 a 120 dias. Fundador solo vende 8 a 12 negociações por semestre.
- Meta: 5 pilotos pagos em 2 semestres; conversão piloto-licença acima de 40%; 80% das entregas com telemetria como critério de aceite.
- Pivô identificado: se adesão do aluno for baixa, o produto vira portfólio de autoria controlado pelo aluno (modelo Grammarly Authorship), com outro comprador e outro preço.

## Questões abertas e como descobrir

- Quantas IES usam Google Workspace vs Microsoft 365: verificar registros MX das 2.561 IES do Censo (2 semanas, custo baixo). Precede qualquer plano de receita.
- Disposição a pagar: 5 pilotos pagos com preço declarado.
- Comitê de compra e ciclo em IES privada: 10 entrevistas com pró-reitores e coordenadores de EAD.
- Custo e prazo do CASA, escopos restantes: consulta ao programa de verificação OAuth.
- Clarity em português e preço no Brasil: reunião com Turnitin Brazil ou Learnbase.
- Percepção do estudante brasileiro: pesquisa dentro dos pilotos.
- Preço Turnitin 2025–2026: busca no PNCP.
- Teto de escala da arquitetura atual: medição no primeiro piloto.
- Exposição legal (LGPD operador/controlador, menores de 18 no 1º ano, responsabilidade por uso indevido): revisão por advogado antes do primeiro contrato.

## Veredito (itens acionáveis)

- Veredito: precisa de mais calor. Pronto para pilotos pagos; não pronto para PRD institucional completo sem os dados dos pilotos.
- Forjado em aço: posicionamento sem veredito; timing regulatório 2026–2027; lacuna competitiva mapeada; alcance pelo Workspace gratuito; simetria aluno-professor.
- Precisa de mais calor: preço (decidir por professor ativo vs por aluno antes do primeiro contrato); comprador (10 entrevistas); fricção de ativação (métrica de 80% como aceite); capacidade de venda (canal professor-primeiro não validado em IES brasileira); LGPD como produto.
- Rachaduras: mercado não dimensionado (MX primeiro); escala técnica (medir e fixar teto; não propor a grupo grande antes); substituto de custo zero (se 5 IES não pagarem piloto em 2 semestres, o substituto venceu); dependência da cooperação do aluno e da plataforma Google (monitorar com adesão nos pilotos e vigilância de produto).
- Ordem antes do PRD: MX das IES; revisão jurídica de contrato e armazenamento; primeiro piloto pago com preço declarado; medir ativação e cota nele; 10 entrevistas com compradores.

## Achados do teste com personas (party mode, 31/10/2026)

- Vocabulário: eliminar "biometria de teclado" (README) de todo o material; biometria é dado sensível na LGPD.
- Contradição a resolver: roteiro do professor no README diz que entrega sem métricas não será pontuada; FAQ diz que não é indício. Vale a regra do FAQ.
- Caso de uso crítico: aluno escreve no Word e cola no final = relatório igual ao de fraude. Mitigação: contrato de atividade dentro do documento distribuído; press release deve abrir "Como funciona" com "o aluno escreve na cópia distribuída".
- Acessibilidade: ditado por voz "não verificado" afeta alunos com deficiência; comissão de inclusão antes do NDE.
- GTM: entrar por TCC (banca existente, volume menor), não por disciplina de EAD de massa; visão por turma é pré-requisito de qualquer piloto em disciplina.
- Preço de piloto: valor fechado por semestre, não por professor ativo (incentiva subativação, fere isonomia).
- Contrato: logs no domínio da IES já no piloto; nota fiscal de CNPJ; cláusula de saída com exportação.
- Entregável de venda: minuta de política institucional de IA com "registro de processo como elemento do contraditório, nunca prova exclusiva".
- Métrica nova para pilotos: taxa de não entrega após o aluno ver o próprio relatório (risco de evasão por atividade).
