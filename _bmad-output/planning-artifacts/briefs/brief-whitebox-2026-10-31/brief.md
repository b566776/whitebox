---
title: 'Product Brief: WhiteBox para instituições de ensino superior'
status: ready-for-review
created: '2026-10-31'
updated: '2026-10-31'
inputs:
  - '_bmad-output/planning-artifacts/research/market-comercializacao-whitebox-ensino-superior-2026-10-31/research.md'
  - '_bmad-output/planning-artifacts/prd.md'
  - 'README.md'
---

# Product Brief: WhiteBox para instituições de ensino superior

> Brief de comercialização. Consolida a oportunidade e o público do WhiteBox no ensino superior brasileiro a partir da pesquisa de mercado de 31/10/2026. Itens marcados `[ASSUMPTION]` foram inferidos e precisam de confirmação do dono do produto. Fontes numeradas `[n]` remetem ao apêndice do research.md.

## Sumário executivo

O WhiteBox é um painel lateral do Google Docs que registra como um texto foi construído (tempo de foco, ritmo de digitação, colagens em bloco, sessões) e entrega ao professor e ao aluno um relatório de processo em português. Ele não diz se o texto foi escrito por IA. Ele mostra se o aluno escreveu.

É o que a política acadêmica brasileira passou a exigir: normas de IES e o parecer do CNE proíbem punir com base em detector e pedem processo documentado e revisão humana [14][15][18][19], enquanto universidades no exterior cancelam a detecção de IA do Turnitin [20][21]. Ninguém vende evidência de processo no Brasil em português, no Google Docs, a preço de IES [42][43][57][65].

A aposta: entrar pelo ensino superior privado que já vive no Google, com adoção iniciada pelo professor e convertida em licença institucional, posicionando o WhiteBox como "evidência de processo para decisão humana" e ancorando-o abaixo do preço do Turnitin. As universidades públicas são a segunda onda.

## O problema

**O professor está preso entre dois erros.** Um professor relata flagrar cerca de 90% da turma usando IA [25]. Ao mesmo tempo, detectores de IA produzem falsos positivos em escala: a Vanderbilt estimou 750 trabalhos por ano marcados indevidamente mesmo com 1% de erro [20]; na WSU, 33% dos casos baseados só em detector terminaram em "não responsável" [21]. O professor que acusa pode punir um inocente; o que não acusa sente que a avaliação escrita perdeu sentido.

**A instituição precisa de política, e a política pede processo.** O CNE exige política institucional de IA e revisão humana [14][15]. As IES que já escreveram a sua política convergem: declaração de uso, rascunhos, versões intermediárias, conversa com o aluno, detector "apenas como apoio" [18][19]. Hoje elas fazem isso sem ferramenta: pedem rascunhos à mão e confiam no histórico de versões do Docs, que não resume nada e não escala para uma turma de EAD com 200 alunos.

**O aluno que escreveu não tem como provar.** O relatório do detector é só para o docente [21], o ônus da prova recai sobre o aluno [16], e há mobilização estudantil contra detectores [27]. A falta de evidência prejudica primeiro quem fez o trabalho.

**O custo do status quo** é tempo docente gasto em suspeita improdutiva, risco jurídico e reputacional em processos disciplinares mal fundamentados, e avaliação escrita a distância perdendo credibilidade justamente quando o novo marco da EAD (Decreto 12.456/2025) obriga as IES a redesenhar essa avaliação até 2027 [13][82].

## A solução

O professor distribui pelo Google Classroom um documento-modelo que já carrega o WhiteBox. Cada aluno recebe sua cópia, abre o painel e escreve normalmente. Ao final, professor e aluno veem o mesmo relatório de processo: quanto tempo de escrita ativa, em quantas sessões, quanto texto entrou por colagem em bloco, como o ritmo evoluiu. O professor usa isso para a conversa que a política institucional manda ter. O aluno usa como comprovante de autoria.

Três propriedades separam o WhiteBox da categoria detector, e a pesquisa as trata como critério de desenho, não só de discurso [21][23][14]:

- **Nunca emite veredito.** Mostra evidência; a decisão é humana. A pontuação de risco existente fica desligada por padrão (opt-in do professor).
- **O aluno vê o mesmo relatório que o professor.** Transparência total, enquadrada como escudo de quem fez o trabalho.
- **Coleta só metadados de processo.** Não guarda o conteúdo do texto nem dados pessoais além do e-mail institucional. LGPD por desenho.

Uma camada opcional (Gemini) sugere perguntas socráticas para a devolutiva, nunca julgamento; a instituição vê esforço e padrões agregados por turma, curso e campus.

## O que torna isto diferente

- **Ocupa uma posição vazia no Brasil.** Nenhum player brasileiro vende evidência de processo [48][49]. As ferramentas de processo em Google Docs são extensões de Chrome anglófonas para o K-12, sem português [42][43][65][67]. O Turnitin Clarity exige escrever no editor da Turnitin via LTI, sem Google Classroom e só em inglês [57][58][32].
- **Roda no Google Workspace gratuito.** A distribuição por documento-modelo funciona na edição Fundamentals [9]; os add-ons oficiais do Classroom exigem edições pagas [98][99]. O que parece limitação de MVP (distribuir por documento-modelo, não por add-on) é vantagem de alcance.
- **Chega onde o Turnitin não está: a sala de aula privada e a EAD.** O Turnitin é compra de biblioteca e pós-graduação em universidades públicas [35][36]. O WhiteBox entra pelo professor de graduação e pela EAD privada, que concentra 95,9% das matrículas a distância [1].
- **Honestidade sobre o fosso.** Não há fosso técnico. A vantagem é posicionamento, idioma, enquadramento pedagógico alinhado à norma brasileira e velocidade de execução. Cinco pilotos pagos gerariam dados que nenhum concorrente tem, porque ninguém mediu este mercado.

## A quem serve

**Comprador inicial: IES privada que usa Google Workspace.** Centros universitários e grupos com cursos de escrita intensiva (Direito, Pedagogia, Comunicação, Administração) e EAD em escala. Prioridade para quem já é parceiro do Google: Ser Educacional e Cruzeiro do Sul, pilotos da parceria ABMES–Google de janeiro de 2026 [5]. Comprador presumido: pró-reitor acadêmico ou coordenador de EAD `[ASSUMPTION: nenhuma fonte brasileira descreve o comitê de compra em IES privada]`.

**Usuário primário: o professor de disciplina com produção textual avaliada.** Precisa decidir com justiça sobre dezenas ou centenas de entregas, dentro de uma política institucional que o obriga a conversar antes de punir. Sucesso para ele: abrir a entrega, entender o processo em 30 segundos e ter a pergunta certa para a devolutiva.

**Usuário protegido: o aluno.** Quer não ser acusado injustamente e quer que o esforço conte. Sucesso: ver seu próprio relatório antes do professor e sentir o trabalho como seu (88% dos alunos no piloto de Authorship da Universidade da Flórida [24]).

**Segunda onda: universidades públicas**, via biblioteca e pró-reitoria de pós-graduação, que hoje compram Turnitin por inexigibilidade com tickets de R$ 20 mil a 90 mil/ano [35][36][54][55]. Essa onda exige prova social de pares e documentação para inexigibilidade antes da abordagem.

## Modelo de entrada e preço

Canal: professor primeiro, instituição depois. Entrada gratuita pelo documento-modelo; conversão, via programas de inovação dos grupos (modelo Yduqs Labs [73]) e vitrine da ABMES [95], em piloto pago; só então licença anual. Preço: licença institucional anual por usuário abaixo do Turnitin Similarity, com alternativa por professor ou turma ativa, que captura mais valor onde a escrita é intensiva e mantém baixo o custo por aluno para a instituição. Pilotos sempre pagos, ainda que simbolicamente, porque não existe evidência de disposição a pagar nesta categoria no Brasil. Confiança baixa a média: a recomendação repousa em um único benchmark de categoria vizinha [35][36][54][55].

## Critérios de sucesso

Os primeiros 12 meses respondem às questões abertas da pesquisa, não só vendem.

| Sinal | Meta `[ASSUMPTION]` | Pergunta que responde |
|---|---|---|
| Pilotos pagos assinados | 5, em grupos e centros universitários distintos | Existe disposição a pagar por evidência de processo? |
| Entregas com telemetria por turma piloto | acima de 80% das entregas | O fluxo de ativação pelo aluno funciona em escala? |
| Conversão piloto para licença | pelo menos 2 de 5 | O produto sobrevive ao comitê de compra? |
| Percepção do aluno nos pilotos | maioria declara o relatório "justo" ou "protetor" | Como o estudante brasileiro reage? |
| Preço por aluno da instituição | abaixo do Turnitin Similarity (R$ 9,70 a R$ 20/usuário/ano) | O preço-âncora é viável? |
| Publicação no Marketplace | sem escopos restritos, sem CASA (avaliação de segurança exigida pelo Google) | A distribuição institucional é possível a baixo custo? |

## Escopo

**Dentro, para a primeira oferta a IES:**
- Relatório de processo e pontuação de risco opt-in, como descrito em A solução.
- Campo de declaração de uso de IA preenchido pelo aluno (exigência das políticas UCPel e Cásper).
- Visão por turma para o professor revisar muitas entregas.
- Licença institucional: papel de admin de IES e provisionamento de professores por domínio.
- Apenas escopos OAuth não restritos (drive.file no lugar de drive.readonly, já feito) e listagem no Marketplace.
- Contrato de tratamento de dados e declaração explícita de minimização.
- Tratamento declarado das limitações: redigitação de saída de IA e ditado por voz aparecem como processo humano ou não verificado [23].

**Fora:**
- Qualquer detecção de IA por análise de texto.
- Integração com Moodle, Canvas ou qualquer LMS via LTI.
- Funcionamento em celular.
- Revenda de Google Workspace ou participação no programa de parceiros Google nesta fase.

## Riscos e incógnitas

- **Mercado alcançável não dimensionado.** Ninguém sabe quantas IES usam Google Workspace em vez de Microsoft 365. Resposta barata: verificar registros MX dos domínios das 2.561 IES.
- **Fricção de ativação.** O painel depende de o aluno abri-lo e aceitar a permissão OAuth. Em domínios com TI restritiva, a allowlist do administrador mata a adoção iniciada pelo professor [90].
- **Substituto de custo zero.** Exigir rascunhos e conversar, como UCPel e Cásper já fazem [18][19], não custa nada; o WhiteBox precisa provar que escala isso.
- **Entrada de concorrentes.** Revision History ou Brisk podem traduzir o produto e descer ao Brasil com barreira baixa [65][67]; a Turnitin pode empurrar o Clarity aos clientes Moodle que já tem.
- **Objeção de vigilância.** A resistência a rastreamento é real (42% em enquete anglófona [23]) e o vocabulário "dataficação e capitalismo de vigilância" já circula em conselhos universitários [79]. Minimização e transparência são pré-requisitos de venda.

## Visão

Em três anos, o WhiteBox é a forma padrão de uma IES brasileira cumprir a própria política de IA na avaliação escrita: todo texto avaliado chega com seu relatório de processo, o aluno o vê antes do professor, e a conversa sobre autoria substitui a acusação. O produto é a infraestrutura de confiança da escrita acadêmica em português no ecossistema Google.
