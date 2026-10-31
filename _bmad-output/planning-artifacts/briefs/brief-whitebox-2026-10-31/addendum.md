---
title: 'Addendum ao brief: WhiteBox para IES'
status: ready-for-review
created: '2026-10-31'
updated: '2026-10-31'
inputs:
  - '_bmad-output/planning-artifacts/research/market-comercializacao-whitebox-ensino-superior-2026-10-31/research.md'
---

# Addendum ao brief: WhiteBox para IES

Detalhe que sustenta o brief e alimenta o PRD, a decisão de preço e o go-to-market. Fontes `[n]` remetem ao apêndice do research.md.

## 1. Benchmark de preço: contratos públicos do Turnitin no Brasil

| IES | Produto | Valor | Usuários | Ano | Preço/usuário/ano | Fonte |
|---|---|---|---|---|---|---|
| UFGD | Similarity | R$ 19.422 | 2.000 | 2023 | ~R$ 9,70 | [55] |
| UFC | Feedback Studio + Originality | US$ 15.694 | 5.000 | 2021 | ~US$ 3,10 | [36] |
| UEM | Turnitin (produto não especificado) | R$ 60.000 | 3.000 | 2024 | R$ 20 | [35] |
| Unifesspa | Originality (via Learnbase) | R$ 156.187 (R$ 152.587 licença) | 4.636 | 2024 | ~R$ 11 (se trienal, não confirmado) | [54] |
| UFOPA | Originality Check | R$ 21.313 | não informado | 2024–25 | — | [72] |

Como: inexigibilidade de licitação, fornecedor "exclusivo" (Turnitin Brazil Ltda ou Learnbase), renovação anual por aditivo. Quem: biblioteca e pró-reitoria de pós. Por quê: reputação e prova social de pares (USP, Unicamp, Unesp, Unifesp) [36][35][54][55]. Ticket anual típico: R$ 20 mil a 90 mil.

## 2. Matriz competitiva

| Player | Categoria | Onde roda | Português | IES brasileira | Preço | Restrição principal |
|---|---|---|---|---|---|---|
| Turnitin Similarity/Originality | antiplágio | LMS (Moodle) | sim | USP, Unicamp, UnB, UFC, UEL… | R$ 9,70–20/usuário/ano | não vê processo |
| Turnitin Clarity | evidência de processo | editor próprio via LTI 1.3 | não (assistente só inglês) | nenhuma | add-on sob consulta | aluno escreve no editor da Turnitin; sem Classroom [57][58][32] |
| Grammarly Authorship | processo (Docs) | extensão Chrome | não | nenhuma | grátis | controlado pelo aluno; K-12 anglófono [42] |
| GPTZero Writing Replay | processo + detector | extensão Chrome | não | nenhuma | institucional sob consulta | recomenda parear com detector [43] |
| Revision History | processo (Docs) | extensão Chrome | não | nenhuma | grátis até 150 docs/mês; Plus US$ 32/ano; escolas sob contrato | K-12 anglófono; barreira baixa para eles traduzirem para o português [65][66] |
| Brisk Teaching | suíte docente com replay | extensão Chrome | não | nenhuma | educador grátis; escola por matrícula | K-12 anglófono; barreira baixa para traduzirem [67] |
| Draftback | replay (pioneiro) | extensão Chrome | não | nenhuma | pago | 3,6 estrelas [45] |
| Plagius | antiplágio BR | desktop | sim | não nomeada | US$ 15,90/ano | sem Docs, sem processo [48] |
| CopySpider | antiplágio BR | web | sim | não nomeada | grátis | sem Docs, sem processo [49] |
| Pangram, Originality.ai, Winston | detectores | web | só Winston | nenhuma | US$ 9–65/mês | categoria em descrédito [61][62][63] |

Lacuna: evidência de processo (a) em português, (b) distribuída pela instituição ou professor via Classroom, (c) com enquadramento pedagógico, (d) a preço comparável ao Turnitin Similarity. Ninguém ocupa.

## 3. Segmentos e comportamento de compra

| Segmento | Tamanho | Quem compra | Como compra | Gatilho | Papel no GTM |
|---|---|---|---|---|---|
| Grandes grupos privados (Ser, Cruzeiro do Sul, Yduqs, Cogna, Ânima) | megamantenedoras = 1,4% das mantenedoras, 47% das matrículas [4] | áreas de inovação + TI + Jurídico + Suprimentos | programa de inovação, piloto pago ~6 meses (Yduqs Labs) [73]; Ânima prefere equity [75] | parceria ABMES–Google [5]; marco da EAD [13] | primeira onda |
| Centros universitários e faculdades privadas | 417 + 1.897 IES; 45% das matrículas [1] | coordenador de curso / pró-reitor acadêmico `[ASSUMPTION]` | sem dado brasileiro; presumido ciclo curto | política de IA (CNE) [14][15] | primeira onda, via professor |
| Universidades públicas | 317 IES públicas; pós e TCC | biblioteca + pró-reitoria de pós | inexigibilidade, R$ 20–90 mil/ano [35][36] | renovação Turnitin; prova social | segunda onda |

Ciclo de compra: única afirmação encontrada, 45 a 120 dias; [86] não cita fonte. Comitê: literatura norte-americana genérica, "muitos vetam, poucos aprovam", medo do risco de implantação [76].

## 4. Marcos regulatórios e políticas que criam a demanda

- **Parecer do CNE sobre IA**: política institucional obrigatória; correção automatizada com repercussão acadêmica é de alto risco; revisão humana exigida [14][15].
- **UCPel, OS 035/2025**: declaração de uso de IA; docente pede "explicação e, se necessário, defesa técnica (detalhar processo, apresentar rascunhos e revisões)"; detector "apenas como apoio, nunca como prova exclusiva" [18].
- **Cásper Líbero, Política v1.0 (2026)**: detectores têm "taxas relevantes de falso positivo"; sem processo disciplinar baseado só neles; "avaliações em processo: versões preliminares, registros de percurso criativo e feedbacks intermediários"; "versões intermediárias" exigíveis [19].
- **Decreto 12.456/2025 (marco da EAD)**: limite de 30% de carga EAD em cursos presenciais, recredenciamento, adequação até maio de 2027; SERES já indefere cursos [13][82][83].
- **Exterior**:
  - Vanderbilt desliga o detector de IA do Turnitin (2023) [20].
  - WSU cancela o contrato de detecção de IA (fev/2026), lista seis universidades R1 que baniram o detector, estima 1.485 falsos positivos/semestre e registra que 33% dos casos de IA levados ao comitê de integridade terminaram em "não responsável" [21].
  - Newcastle não renova o Turnitin após 2026/27 por privacidade [22].
  - Southampton não renova por uso de trabalhos de alunos no treinamento de modelos [70].

## 5. Requisitos que a pesquisa impõe ao PRD (confiança alta)

| # | Requisito | Fonte | Estado em 31/10/2026 |
|---|---|---|---|
| 1 | Relatório visível ao aluno, idêntico ao do professor | [21] | pendente (deferred-work.md) |
| 2 | Visão por turma para revisar muitos relatórios | [23] | pendente |
| 3 | Nenhuma pontuação que funcione como veredito; pontuação de risco desligada por padrão | [14][15] | pendente (deferred-work.md) |
| 4 | Campo de declaração de uso de IA | [18][19] | pendente (deferred-work.md) |
| 5 | Tratamento explícito e documentado das limitações: redigitação de saída de IA aparece como humano; ditado por voz fica "não verificado" | [23] | pendente |
| 6 | Contrato de tratamento de dados, minimização declarada (metadados de processo, não conteúdo nem dados pessoais), transparência ao aluno | [77][79] | pendente |
| 7 | Escopos OAuth não restritos, para evitar CASA e a tela de "app não verificado" | [88][100] | feito: drive.readonly substituído por drive.file |
| 8 | Lembrete de ativação do painel do aluno no documento distribuído, para reduzir entregas sem telemetria | deferred-work.md | pendente |

## 6. Estado do produto em 31/10/2026 (contexto para o PRD)

Arquitetura: biblioteca central (whitebox-lib), wrapper vinculado ao documento (whitebox-client) e servidor proxy (whitebox-server), todos sobre Apps Script, com Google Sheets como persistência e Gemini opcional; detalhe em README.md. Já existem: telemetria de foco, ritmo e colagem; vínculo com Classroom; painel admin com heatmaps por aluno, turma, professor e instituição; escopos reduzidos a drive.file. Pendentes não cobertos na seção 5: admin de IES com provisionamento por domínio; distribuição sem Classroom (deferred-work.md).

## 7. Canal Google: três portas e seus pedágios

| Porta | Exigência | Implicação |
|---|---|---|
| Workspace Marketplace | verificação OAuth; CASA se escopos restritos (custo não publicado, milhares a dezenas de milhares de dólares); escolha entre listagem pública e privada é irreversível; sem cobrança nativa [88][89][100] | publicar após verificação, sem escopos restritos; faturar fora |
| Add-ons do Classroom | só Education Plus / Teaching and Learning Upgrade; allowlist do admin [98][99] | restringe às IES que já pagam ao Google; o documento distribuído pelo professor (documento-modelo) contorna isso |
| Programa de parceiros | trilha Build exige 3 integrações aprovadas; revenda exige Partner Advantage [87][96] | fora de escopo nesta fase |

Gatekeeper: o admin do Workspace controla add-ons por unidade organizacional [90]. Positivo na venda institucional; ponto de morte da adoção pelo professor em IES com TI restritiva.

## 8. Questões abertas e como respondê-las

| # | Questão | Como responder | Custo |
|---|---|---|---|
| 1 | Quantas IES usam Google Workspace vs Microsoft 365? | Verificar registros MX dos domínios das 2.561 IES; pedir dado a ABMES/Semesp e Observatório Educação Vigiada [8] | baixo |
| 2 | Existe disposição a pagar por evidência de processo? Quanto? | Cinco pilotos pagos com preço declarado | médio |
| 3 | Quem decide e em quanto tempo numa IES privada? | Dez entrevistas com pró-reitores acadêmicos e coordenadores de EAD | baixo |
| 4 | Quanto custa e demora o CASA? Restam escopos restritos? | Consulta ao programa de verificação OAuth e a laboratório credenciado [100] | baixo |
| 5 | O Clarity terá português e preço por aluno no Brasil? | Reunião comercial com Turnitin Brazil ou Learnbase | baixo |
| 6 | Como estudantes brasileiros reagem ao rastreamento de processo? | Pesquisa de percepção dentro dos pilotos | médio |
| 7 | Preço do Turnitin em contratos 2025–2026? | Busca no PNCP por "Turnitin" e "Learnbase" | baixo |

## 9. Alternativas consideradas e descartadas

- **Entrar pelas universidades públicas primeiro.** Descartado: compra por inexigibilidade exige exclusividade e prova social que o WhiteBox ainda não tem; foco delas é pós e TCC, não graduação em escala.
- **Posicionar como detector de IA mais barato (modelo Tesify [53]).** Descartado: a categoria está sendo deslegitimada por norma e por cancelamentos; contraria a proposta central do produto.
- **Integrar com Moodle via LTI.** Descartado nesta fase: joga no tabuleiro do Turnitin Clarity, abandona a vantagem de rodar no Workspace gratuito e exige engenharia que o time não tem.
- **Pilotos gratuitos.** Descartado: sem preço declarado não se responde à questão aberta mais importante.
