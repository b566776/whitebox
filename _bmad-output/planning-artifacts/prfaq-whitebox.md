---
title: "PRFAQ: WhiteBox para instituições de ensino superior"
status: "complete"
created: "2026-10-31"
updated: "2026-10-31"
stage: 5
mode: headless
concept_type: commercial
inputs:
  - "_bmad-output/planning-artifacts/research/market-comercializacao-whitebox-ensino-superior-2026-10-31/research.md"
  - "_bmad-output/planning-artifacts/briefs/brief-whitebox-2026-10-31/brief.md"
  - "_bmad-output/planning-artifacts/briefs/brief-whitebox-2026-10-31/addendum.md"
  - "_bmad-output/planning-artifacts/prd.md"
  - "_bmad-output/implementation-artifacts/deferred-work.md"
---

> Rascunho headless gerado em 31/10/2026 a partir do research de mercado e do brief. Datas, nomes de clientes e números de preço no press release são hipóteses a validar, não compromissos. Respostas marcadas **[confiança baixa]** precisam de revisão humana. Fontes `[n]` remetem ao apêndice do research.md.

# WhiteBox mostra como cada texto foi escrito, para que a decisão sobre autoria continue humana

## Professores de instituições de ensino superior passam a receber, junto com cada trabalho feito no Google Docs, um relatório de processo em português que aluno e professor veem igual. Nenhum detector, nenhum veredito.

**São Paulo, 1º de fevereiro de 2027** — O WhiteBox está disponível hoje para instituições de ensino superior brasileiras que usam o Google Workspace for Education. Ele responde à pergunta que todo professor faz desde que a IA generativa chegou à sala de aula: "esse texto foi escrito pelo aluno?". Em vez de adivinhar a partir do texto pronto, o WhiteBox registra como o texto foi construído, quanto tempo de escrita ativa, em quantas sessões, quanto entrou por colagem em bloco, e entrega esse registro em português, para o professor conversar e decidir, e para o aluno provar que o trabalho é seu.

A avaliação escrita a distância está em crise de confiança. Um professor brasileiro relatou ter flagrado cerca de 90% da turma usando IA [25]. Do outro lado, os detectores de IA erram contra inocentes: a Universidade Vanderbilt estimou 750 trabalhos por ano marcados indevidamente mesmo com 1% de falso positivo [20]; na Washington State University, um terço dos casos levados ao comitê de integridade só com o laudo do detector terminou em "não responsável" [21]. Políticas de IES brasileiras já reagiram: a UCPel e a Cásper Líbero proíbem punir com base exclusiva em detector e exigem rascunhos, versões intermediárias e conversa com o aluno [18][19]. O Conselho Nacional de Educação classifica correção automatizada com efeito acadêmico como alto risco e exige revisão humana [14][15]. O professor ficou com uma obrigação nova e nenhuma ferramenta para cumpri-la em uma turma de EAD com 200 entregas.

Com o WhiteBox, o professor distribui a atividade pelo Google Classroom como sempre fez. Cada aluno escreve na própria cópia do documento e, ao entregar, o professor abre o texto e vê ao lado um resumo de como ele nasceu: 3 horas e 40 minutos de escrita ativa em cinco sessões ao longo de uma semana, ritmo constante, duas colagens de bloco com 12% do texto final. Ou: 9 minutos de sessão única e 94% do texto colado de uma vez. Nos dois casos o WhiteBox não diz o que fazer. Ele dá ao professor o que a política da instituição manda ter antes de qualquer decisão: evidência de processo para uma conversa. O aluno vê exatamente o mesmo relatório antes do professor. Quem escreveu tem como mostrar.

> "Detector de IA é um palpite sobre o texto pronto. Nós queremos que a universidade pare de apostar em palpite e volte a olhar para o processo, que é o que ela sempre avaliou quando o aluno escrevia na frente dela. O WhiteBox é a caixa-preta aberta: o aluno sabe o que está sendo registrado, vê o mesmo que o professor e a decisão final é de gente, não de algoritmo."
> — Marcelo Miranda, criador do WhiteBox

### Como funciona

1. **A instituição ativa o WhiteBox no domínio.** O administrador do Workspace autoriza o complemento uma vez, sem escopos restritos do Google e sem acesso ao conteúdo do Drive além do documento da atividade. A instituição recebe o contrato de tratamento de dados e a lista do que é e do que não é coletado.
2. **O professor cria a atividade como sempre.** No Google Classroom, anexa o documento-modelo do WhiteBox à tarefa e marca "fazer uma cópia para cada aluno". Nada de novo para aprender.
3. **O aluno escreve e vê o próprio painel.** Ao abrir a atividade, aciona o painel WhiteBox no Docs, aceita a permissão e escreve normalmente. O painel mostra a ele, em tempo real, as mesmas métricas que o professor verá. Antes de entregar, preenche uma declaração de uso de IA, o que a política da UCPel e da Cásper já exigem [18][19].
4. **O professor revisa a turma inteira de uma vez.** Uma visão por turma ordena as entregas por padrão de processo e destaca as que merecem conversa. Em cada documento, o relatório individual aparece ao lado do texto. Se o professor quiser, uma camada opcional com IA sugere perguntas socráticas para a devolutiva. Nunca um veredito.
5. **A coordenação enxerga tendências.** Um painel por curso, turma e campus mostra padrões de esforço e de colagem ao longo do semestre, sem expor o conteúdo de nenhum texto.

> "Eu já pedia rascunho para todo mundo porque a nossa política manda, e aí ficava com 180 rascunhos para olhar. Agora eu abro a turma, vejo quem escreveu em cinco noites e quem colou tudo em nove minutos, e chamo para conversar só quem precisa. E o aluno não pode dizer que eu inventei: ele viu o mesmo relatório antes de mim."
> — Professora de Direito em centro universitário privado, turma de EAD

> "Eu demorei uma semana nesse trabalho. Da primeira vez que um professor desconfiou de mim eu não tinha como provar nada. Agora tenho."
> — Aluno do 3º semestre de Comunicação

### Como começar

Qualquer professor com conta Google pode testar gratuitamente em uma turma: basta solicitar o documento-modelo e distribuí-lo pelo Classroom. Para a instituição, o WhiteBox oferece um piloto pago de um semestre em até três cursos, com relatório de percepção dos alunos ao final, e licença institucional anual com preço por professor ativo ou por aluno, posicionado abaixo do que a instituição pagaria por um antiplágio tradicional. Funciona nas edições Fundamentals (gratuita), Standard e Plus do Google Workspace for Education.

<!-- coaching-notes-stage-2
- Headline descartada: "O fim do detector de IA na universidade" (negativa, define o produto pelo concorrente). "Prova de autoria para o aluno" (soa como certificado, promete demais). Escolhida a que coloca o processo e a decisão humana no centro.
- Diferenciadores explorados e deixados de fora do PR por serem técnicos: roda no Workspace Fundamentals gratuito (add-ons do Classroom exigem edições pagas); distribuição por documento-modelo sem Marketplace; escopos OAuth sem restritos (drive.file) já implementados em 31/10/2026.
- Posicionamento competitivo: Turnitin Clarity obriga a escrever no editor da Turnitin via LTI 1.3, sem Classroom, assistente só em inglês; Revision History/Brisk/Grammarly Authorship/GPTZero são extensões Chrome K-12 anglófonas sem português.
- Cidade e data do PR são hipóteses: 1º/fev/2027 = início de semestre, antes do prazo de adequação do marco EAD (maio/2027).
- Números do exemplo ("3h40 em cinco sessões", "94% colado em 9 minutos") são ilustrativos, não dados reais de piloto.
- A camada de IA (Gemini) foi rebaixada a "opcional" de propósito: o posicionamento não pode depender de IA julgando aluno.
- Restrições fora do PR: só desktop (não funciona em celular); exige que o aluno abra o painel (ativação passiva); score de risco existente no produto fica opt-in.
-->

---

## FAQ do cliente

### P: Isso é um detector de IA com outro nome?

R: Não, e a diferença é verificável. Um detector lê o texto final e estima a probabilidade de ter sido gerado por IA; o WhiteBox não analisa o texto para isso e não emite nenhuma pontuação de "probabilidade de IA". Ele registra metadados de como o documento foi editado (tempo de escrita ativa, sessões, ritmo, colagens em bloco e seu tamanho) e os mostra. O relatório não contém conclusão. Se a sua política diz, como a da Cásper Líbero, que não haverá processo disciplinar com base exclusiva em detector [19], o WhiteBox não entra nessa categoria: ele é a "versão intermediária" e o "registro de percurso" que a mesma política pede. Uma ressalva honesta: o produto tem uma pontuação de risco herdada da primeira versão. Na oferta para IES ela vem desligada por padrão e só o professor pode ligá-la, e recomendamos que a instituição a mantenha desligada em política.

### P: O Google Docs já tem histórico de versões de graça. Por que pagar?

R: O histórico de versões guarda estados do documento, não processo. Ele não diz quanto tempo o aluno escreveu de fato, não separa digitação de colagem, não resume nada e não escala: para uma turma de 200 entregas, o professor teria de abrir 200 históricos e inferir sozinho. O WhiteBox transforma isso em um relatório de 30 segundos por entrega, uma visão por turma e um registro que o aluno também vê, com declaração de uso de IA anexada. Também não depende de o professor instalar uma extensão de navegador em cada máquina, como Draftback ou Revision History [45][65]: o rastreio vai dentro do documento distribuído pelo Classroom.

### P: O aluno não burla isso digitando à mão o que a IA escreveu?

R: Pode, e o WhiteBox diz isso abertamente, em vez de fingir que não. Redigitar um texto de IA aparece como digitação humana; ditado por voz aparece como "não verificado" [23]. O que o WhiteBox torna visível é o padrão: um texto de 1.500 palavras redigitado em 25 minutos sem nenhuma pausa, exclusão ou reescrita é um processo diferente de uma semana de rascunhos, e essa diferença aparece no ritmo e nas sessões. Mas o produto não promete prova de inocência ou culpa. Ele promete que a conversa entre professor e aluno comece com evidência em vez de suspeita. O aluno que quer fraudar com esforço consegue, como sempre conseguiu; o aluno que escreveu passa a ter como mostrar. **[confiança baixa sobre o quanto o ritmo distingue redigitação em escala; não há estudo próprio]**

### P: O que vocês coletam dos nossos alunos, onde fica, e quem é o controlador sob a LGPD?

R: Coletamos metadados de processo: carimbos de tempo de atividade, contagem de caracteres e palavras por intervalo, eventos de colagem com tamanho em caracteres, e identificadores do documento, da turma e do e-mail institucional do aluno e do professor. Não armazenamos o conteúdo do texto fora do próprio documento do aluno, que continua no Drive da instituição. Os registros ficam em planilhas Google dentro de contas Google, hoje na conta administrativa do WhiteBox e na planilha de logs de cada professor. A instituição é controladora dos dados; o WhiteBox é operador, e o contrato de tratamento de dados define finalidade, prazo de retenção e exclusão a pedido. O que ainda não oferecemos: hospedagem dos logs no próprio domínio da instituição e relatório de impacto à proteção de dados pronto. São os dois primeiros itens que o piloto institucional entrega. **[confiança baixa: a arquitetura de armazenamento atual é a do MVP e precisa de revisão jurídica antes do primeiro contrato]**

### P: Usamos Moodle e parte dos cursos está no Microsoft 365. Funciona?

R: Não. O WhiteBox roda dentro do Google Docs e distribui pelo Google Classroom. Se os seus alunos escrevem no Word ou entregam PDF pelo Moodle, não há processo para registrar. Decidimos não construir integração LTI com Moodle ou Canvas nesta fase: isso nos colocaria no mesmo tabuleiro do Turnitin Clarity, que obriga o aluno a escrever no editor da Turnitin [57], e abandonaria o que nos diferencia, que é rodar onde o aluno já escreve. Para uma IES mista, a proposta é começar pelos cursos e disciplinas que já produzem texto no Docs, e a nossa visão por turma funciona com a lista de alunos do Classroom ou com uma planilha de e-mails.

### P: Quanto custa comparado ao Turnitin?

R: O Turnitin custa às universidades públicas brasileiras entre R$ 9,70 e R$ 20 por usuário por ano, cobrado sobre toda a instituição [35][36][54][55]. O WhiteBox cobra só por quem usa: licença por professor ativo (aquele que distribuiu ao menos uma atividade no semestre) ou, se a instituição preferir, por aluno matriculado em disciplina com WhiteBox. O compromisso é que o custo total para a instituição fique abaixo do que o Turnitin Similarity custaria para a mesma base de alunos. O preço de tabela será publicado com os pilotos; hoje ele é uma faixa, não um número, porque não existe nenhum contrato público de "evidência de processo" no Brasil para servir de referência [76]. Pilotos são pagos, com valor simbólico, porque precisamos saber se a categoria tem orçamento. **[confiança baixa: preço é a hipótese menos testada do produto]**

### P: Quanto trabalho isso dá para a nossa TI?

R: Uma autorização de domínio e uma tela de permissão por aluno. O WhiteBox não usa escopos restritos do Google (trocamos o acesso de leitura ao Drive inteiro pelo acesso só ao documento da atividade), o que dispensa a avaliação de segurança CASA e evita a tela de "aplicativo não verificado" quando a listagem no Marketplace estiver verificada [88][100]. O administrador inclui o complemento na lista de permitidos da unidade organizacional e pronto. O que a TI vai perguntar e deve saber: cada aluno ainda precisa aceitar a permissão OAuth na primeira abertura do painel; o painel não funciona em celular; e a camada de IA opcional usa a API do Gemini com chave da instituição ou do professor. **[confiança média: a verificação OAuth e a listagem no Marketplace ainda não foram feitas]**

### P: E se o aluno esquecer de abrir o painel? A entrega fica sem evidência?

R: Fica, e isso é a limitação mais importante do produto hoje. O Google não permite que um complemento rode escondido ao abrir o documento; o aluno precisa acionar o painel. Tratamos isso de três formas: um lembrete visível dentro do documento distribuído, o painel do aluno mostrando a ele que está "gravando" (porque é do interesse dele), e a orientação de que a instituição trate a ativação como parte do contrato pedagógico da atividade, como já faz com declaração de autoria. Nos pilotos medimos a taxa de entregas com telemetria por turma; se ficar abaixo de 80%, o produto não está pronto para licença institucional e dizemos isso. Uma entrega sem telemetria não é indício de nada contra o aluno; é só ausência de evidência.

### P: Sou aluno. Isso é vigilância? Pode ser usado contra mim?

R: É o contrário de vigilância escondida: você vê o que está sendo registrado enquanto escreve, vê o mesmo relatório que o professor antes de entregar e preenche você mesmo a declaração de uso de IA. O WhiteBox não lê o seu texto para julgar, não grava tela, teclado ou câmera e não funciona fora do documento da atividade. Pode ser usado contra você? Pode ser usado em uma conversa com o professor, como qualquer rascunho que ele pedisse. O que não pode, pela própria política das instituições que o adotam e pelo parecer do CNE, é ser usado como prova única para punir [14][18][19]. Sabemos que quase metade dos alunos consultados em uma enquete estrangeira acha intrusivo entregar o histórico completo de um documento [23]; por isso o WhiteBox não entrega o histórico, só o resumo de processo, e por isso ele é o mesmo para os dois lados.

### P: Isso serve como prova em processo disciplinar ou judicial?

R: Serve como registro de processo, não como laudo. O WhiteBox documenta metadados com carimbo de tempo e os apresenta sem interpretação. Em um processo, ele é um elemento ao lado da declaração do aluno, da conversa com o professor e da defesa técnica que a política da UCPel prevê [18]. Não recomendamos, e o contrato diz isso, que qualquer decisão disciplinar se baseie só nele. Se a instituição procura algo que "prove" uso de IA, nós não vendemos isso, e ninguém que diga vender tem base para a promessa [20][21][40].

### P: E se o WhiteBox acabar?

R: Os documentos dos alunos sempre foram e continuam sendo da instituição, no Drive dela. Os registros de processo são planilhas Google exportáveis a qualquer momento, e o contrato prevê entrega integral e exclusão ao fim. O código roda em Google Apps Script, dentro da infraestrutura do Google, não em servidores nossos. Hoje somos uma empresa de uma pessoa com produto em validação; é justo que a instituição trate isso como piloto e exija cláusula de saída. Preferimos dizer isso a fingir porte.

<!-- coaching-notes-stage-3
- Lacuna revelada: armazenamento dos logs em conta administrativa do WhiteBox + planilha do professor contradiz o discurso de "dados da instituição". Decisão: hospedagem dos logs no domínio da IES é fast-follow obrigatório antes do primeiro contrato institucional; RIPD (relatório de impacto) é entregável do piloto.
- Lacuna revelada: score de risco existente no produto contradiz "sem veredito". Decisão: opt-in do professor, desligado por padrão, recomendação de política para manter desligado (já em deferred-work.md).
- Lacuna revelada: entregas sem telemetria. Decisão: lembrete no documento + painel do aluno "gravando" + contrato pedagógico; métrica de corte 80% nos pilotos como critério de prontidão.
- Trade-off aceito: sem Moodle/LTI/Microsoft; IES mista começa pelos cursos em Docs. Distribuição por lista de e-mails (sem Classroom) já está em deferred-work.md.
- Trade-off aceito: burla por redigitação. Produto declara a limitação; não promete prova.
- Sinal de requisito: relatório ao aluno deve ser resumo de processo, nunca histórico completo (resposta à resistência de 42%).
- Sinal de requisito: declaração de uso de IA preenchida pelo aluno (já em deferred-work.md).
- Sinal de requisito: visão por turma com ordenação por padrão de processo.
- Inteligência competitiva reforçada: Clarity preso ao editor Turnitin; extensões Chrome exigem instalação por máquina.
-->

---

## FAQ interno

### P: Qual é o tamanho real do mercado alcançável? Não sabemos quantas IES usam Google.

R: Não sabemos, e esse é o número mais importante que não temos. O teto teórico sobre 10,2 milhões de matrículas, ao preço do Turnitin, seria R$ 100 a 200 milhões por ano [1][35]; o alcançável é a fração que escreve em Docs, em disciplinas com texto avaliado, em IES dispostas a pagar. Nenhuma fonte separa Workspace de Microsoft 365 nas IES brasileiras [8]. O que fazemos: nas próximas duas semanas, verificar os registros MX dos domínios das 2.561 IES do Censo [1]. É barato, objetivo e dá a proporção de domínios de e-mail no Google. Não prova uso de Docs em sala, mas separa quem pode comprar de quem não pode. Só depois disso faz sentido falar em tamanho de mercado.

### P: Por que uma IES pagaria se pode simplesmente exigir rascunhos de graça, como UCPel e Cásper já fazem?

R: Porque exigir rascunhos de graça não escala e não protege. A política existe, mas o professor de EAD com 180 alunos não tem como revisar 180 históricos, então a exigência vira formalidade ou vira arbitrariedade. O WhiteBox é a forma de a instituição cumprir a própria política em escala e com registro simétrico, o que reduz o risco de um processo disciplinar mal fundamentado. O argumento de venda não é "detecte mais"; é "cumpra o que o seu conselho aprovou sem multiplicar a carga docente e sem gerar passivo". Se esse argumento não fechar piloto pago em cinco instituições, o substituto de custo zero venceu e precisamos saber disso cedo. É a razão de os pilotos serem pagos.

### P: O que mata este produto?

R: Quatro coisas, em ordem de probabilidade. (1) A Revision History ou a Brisk lançarem interface em português e preço para escolas brasileiras; são extensões Chrome com mais de 200 mil educadores e barreira de tradução baixa [65][67]. Nossa resposta é velocidade e o enquadramento institucional (contrato de dados, visão por turma, declaração de IA) que uma extensão K-12 não tem. (2) O Google construir rastreio de processo nos relatórios de originalidade do Classroom; não há sinal público disso [91][92], mas somos um complemento sobre a plataforma deles. (3) A Turnitin trazer o Clarity em português e empurrá-lo aos clientes Moodle que já tem; a barreira é alta porque o Clarity exige escrever no editor dela [57], mas a força de vendas e o orçamento já existem. (4) A taxa de entregas com telemetria ficar baixa demais para o produto ser confiável como política. As três primeiras são externas; a quarta é nossa e é a que medimos primeiro.

### P: Qual é o problema técnico mais difícil? Apps Script e planilhas Google aguentam 50 mil alunos?

R: Não sabemos, e a arquitetura atual não foi desenhada para isso. O servidor é um Apps Script que roda como a conta administrativa, com Google Sheets como banco. As cotas do Apps Script são por conta e por dia (chamadas externas, tempo de execução de gatilhos, chamadas à API do Gemini) e as planilhas têm limite de células e degradam antes dele. Para pilotos de algumas centenas a poucos milhares de alunos isso serve. Para licença em um grupo com 50 mil matrículas, não. O que fazemos: medir consumo de cota por aluno ativo no primeiro piloto; definir o teto que a arquitetura atual suporta; e planejar a migração do servidor para Cloud Run ou equivalente, com banco de verdade, como pré-requisito de qualquer contrato acima desse teto. Hospedar os logs no domínio da IES, que o cliente vai pedir pela LGPD, pode ser resolvido no mesmo movimento. **[alto risco: nenhuma medição de escala existe hoje]**

### P: Como funciona a economia unitária?

R: Exemplo com números hipotéticos, não validados. Um centro universitário com 5.000 alunos e 60 professores em disciplinas de escrita intensiva. A R$ 600 por professor ativo por ano, a licença custaria R$ 36 mil, ou R$ 7,20 por aluno da instituição, abaixo do piso do Turnitin [55]. O custo variável nosso é quase zero (Apps Script, Sheets e Gemini com chave do cliente), então a margem bruta é alta; o custo real é venda e suporte. Se o ciclo for de 45 a 120 dias [86] e um fundador vender sozinho, cabem talvez 8 a 12 negociações por semestre. A conta fecha se o ticket médio ficar em dezenas de milhares de reais e a conversão de piloto para licença passar de 40%. Se o ticket cair para alguns milhares, o modelo vira autoatendimento pelo professor, e aí o produto e a empresa são outros. **[confiança baixa: todos os números são hipóteses]**

### P: Como conseguimos os primeiros cinco pilotos pagos?

R: Três portas, em paralelo. (1) Ser Educacional e Cruzeiro do Sul, pilotos da parceria ABMES–Google de janeiro de 2026 [5]: são os grupos com relação mais ativa com o Google e com motivo para mostrar uso pedagógico de IA; abordagem pela área de inovação com o enquadramento "cumprimento do parecer do CNE". (2) Programas de inovação aberta dos grupos, no modelo Yduqs Labs, que já preveem piloto remunerado de seis meses [73]. (3) Entrada pelo professor: distribuir o documento-modelo gratuito a professores de Direito, Pedagogia e Comunicação em centros universitários privados e deixar que os que usarem levem o caso à coordenação; a vitrine da ABMES [95] como canal de credibilidade. Meta: cinco pilotos assinados em dois semestres. Se em um semestre não houver nenhum piloto pago com as três portas, o problema é de proposta de valor, não de canal.

### P: Qual é a exposição legal?

R: Duas frentes. LGPD: tratamos dados de processo vinculados a e-mail institucional de alunos, parte deles possivelmente menores de 18 anos no primeiro ano de graduação; precisamos de contrato de operador, base legal definida pela instituição, retenção limitada, exclusão a pedido e relatório de impacto. O vocabulário "capitalismo de vigilância" já circula nos conselhos universitários [79] e vai aparecer. Responsabilidade por uso indevido: se uma instituição punir um aluno com base só no relatório e a decisão for revertida, o WhiteBox será citado. Mitigação: o relatório não contém veredito, o contrato veda uso como prova exclusiva e o material de adoção cita o parecer do CNE e as políticas da UCPel e da Cásper. Nada disso foi revisado por advogado; é o primeiro gasto externo antes do primeiro contrato. **[alto risco até revisão jurídica]**

### P: A que dizemos não para fazer isto?

R: Não a detecção de IA por texto, mesmo quando o cliente pedir, e vai pedir. Não a Moodle, Canvas e LTI. Não a celular. Não a ensino fundamental e médio, apesar de ser onde os concorrentes estão, porque o argumento regulatório e a política institucional são de ensino superior. Não a universidades públicas até termos prova social privada e documentação de inexigibilidade. Não ao programa de parceiros Google e a revenda de Workspace. Não a funcionalidades do painel administrativo além de visão por turma e tendências por curso. Cada "não" desses é uma pressão real de cliente que vamos sentir no primeiro piloto.

### P: Por que nós, por que agora?

R: Agora porque três relógios batem juntos: o parecer do CNE exige política institucional de IA com revisão humana [14][15]; o marco da EAD obriga a rever avaliação e recredenciar até maio de 2027 [13][82]; e a parceria ABMES–Google de janeiro de 2026 põe os grupos privados em conversa ativa com o Google [5]. Ao mesmo tempo, os detectores perdem contratos em universidades de pesquisa [20][21][22] e ninguém vende evidência de processo em português no Google Docs [42][43][57][65]. Nós porque o produto já existe, roda no Workspace gratuito, está em português e foi desenhado em torno de "sem veredito" antes de a norma pedir. O que não temos: time, prova social e dinheiro para venda de campo. Por isso o canal é professor primeiro e piloto pago depois.

### P: A pergunta que o fundador evita: este produto depende de o aluno cooperar com o próprio monitoramento. Isso se sustenta?

R: Sim, depende, e não há como contornar sem violar o que o produto promete. O aluno precisa abrir o painel e aceitar a permissão. Se ele não quiser, não há evidência, e a instituição não pode puni-lo por isso. A aposta é que a cooperação vem do interesse: o aluno que escreveu quer o registro, como quer o recibo. Os 88% que sentiram o trabalho "totalmente seu" no piloto da Universidade da Flórida com Authorship sugerem isso [24], mas é dado anglófono e de ferramenta controlada pelo aluno. Se no Brasil a adesão ficar baixa por desconfiança, o produto não é uma ferramenta de integridade; é uma ferramenta de portfólio para quem quiser usá-la, e o preço e o comprador mudam. Medimos isso nos pilotos com pesquisa de percepção, e é a única métrica que pode fazer a empresa mudar de rumo.

### P: Se der certo, como é a empresa em três anos?

R: Uma empresa pequena e rentável que é a forma padrão de cumprir política de IA na avaliação escrita em algumas dezenas de IES privadas brasileiras, com a segunda onda em universidades públicas via biblioteca e pró-reitoria de pós, e com um ativo que ninguém mais tem: dados longitudinais, anonimizados, sobre como estudantes brasileiros escrevem. Esse ativo vale para pesquisa, para política pública e para o próprio produto (normas de processo por curso). Não é unicórnio. É infraestrutura de confiança em um nicho com âncora regulatória.

<!-- coaching-notes-stage-4
- Riscos de viabilidade: escala do Apps Script + Sheets não medida (migração para Cloud Run ou similar como pré-requisito de contratos grandes); armazenamento de logs fora do domínio da IES; nenhuma revisão jurídica (LGPD, operador/controlador, responsabilidade por uso indevido).
- Estimativas: ciclo 45–120 dias (fonte fraca); fundador solo vende 8–12 negociações/semestre; exemplo R$ 600/professor ativo/ano, R$ 36 mil por centro de 5.000 alunos (R$ 7,20/aluno); conversão piloto→licença alvo > 40%.
- Incógnitas e como descobrir: adoção Workspace nas IES (MX das 2.561 IES, 2 semanas); disposição a pagar (5 pilotos pagos, 2 semestres); comitê de compra (10 entrevistas); CASA/escopos (consulta ao programa OAuth); Clarity em português (reunião Turnitin/Learnbase); percepção do aluno (pesquisa nos pilotos); preço Turnitin 2025–26 (PNCP).
- Posicionamento: nicho IES, não K-12; "cumpra sua política em escala sem passivo", não "detecte mais".
- Dependências: Google (plataforma e risco de o próprio Classroom cobrir o espaço); cooperação do aluno (ativação passiva).
- Pivô possível identificado: se adesão do aluno for baixa, o produto vira portfólio de autoria controlado pelo aluno (modelo Grammarly Authorship), com outro comprador.
-->

---

## O veredito

**Avaliação geral: precisa de mais calor.** O posicionamento e o momento são os mais sólidos que um produto deste porte pode ter: a norma brasileira pede exatamente o que o WhiteBox entrega, a categoria concorrente está em descrédito documentado e ninguém ocupa a posição em português no Google Docs. Mas quase tudo entre o posicionamento e a receita ainda é hipótese: quem compra, por quanto, se o aluno coopera e se a arquitetura aguenta. O conceito está pronto para pilotos pagos; não está pronto para um PRD de produto institucional completo sem que os cinco pilotos respondam às perguntas abaixo.

**Forjado em aço**

- **"Evidência de processo para decisão humana, nunca detector."** Sustentado por fontes primárias brasileiras (CNE, UCPel, Cásper) e por cancelamentos documentados no exterior. É a frase que vende e é também o critério de desenho. Não mexer.
- **Timing regulatório.** Três gatilhos independentes (parecer do CNE, marco da EAD até maio de 2027, parceria ABMES–Google) convergem em 2026–2027. A janela é real e tem prazo.
- **Lacuna competitiva.** Clarity preso ao editor da Turnitin e sem português; extensões Chrome K-12 sem português nem distribuição institucional; nenhum player brasileiro. A lacuna está bem mapeada.
- **Alcance pelo Workspace gratuito.** A distribuição por documento-modelo funciona onde os add-ons oficiais do Classroom não chegam. É uma vantagem estrutural que o time já tem.
- **Simetria aluno–professor.** Transformar a objeção de vigilância em propriedade do produto é a resposta certa à resistência estudantil e à crítica da WSU.

**Precisa de mais calor**

- **Preço.** Uma faixa ancorada em um único benchmark de categoria vizinha, com unit economics hipotética. Os pilotos pagos precisam ter preço declarado, mesmo que simbólico, e a decisão por professor ativo versus por aluno precisa ser tomada antes do primeiro contrato.
- **Comprador.** "Pró-reitor acadêmico ou coordenador de EAD" é suposição sem fonte. Dez entrevistas resolvem isso em um mês e mudam o material de venda.
- **Fricção de ativação.** O produto depende de o aluno abrir o painel. Lembrete no documento, painel "gravando" e contrato pedagógico são paliativos razoáveis; a métrica de 80% de entregas com telemetria precisa virar critério de aceite dos pilotos e ser medida de verdade.
- **Capacidade de venda.** Um fundador, ciclo de 45 a 120 dias, comitês de compra. O canal "professor primeiro" existe para compensar isso, mas não há evidência de que professor converte instituição em IES brasileira. O primeiro semestre de pilotos é também o teste desse canal.
- **LGPD como produto, não como cláusula.** Logs no domínio da IES, relatório de impacto, contrato de operador e revisão jurídica. Tudo isso é pré-requisito de venda e nada está feito.

**Rachaduras na fundação**

- **Mercado não dimensionado.** Não se sabe quantas IES usam Google Workspace. A verificação de registros MX das 2.561 IES custa dias e deve preceder qualquer plano de receita. Sem isso, o tamanho da oportunidade é uma frase, não um número.
- **Escala técnica.** Apps Script com Google Sheets como banco não foi medido além do MVP. Um contrato com um grupo de 50 mil alunos hoje seria uma promessa que a arquitetura não sustenta. Medir cota por aluno ativo no primeiro piloto e fixar o teto é obrigatório antes de qualquer proposta a grande grupo.
- **Substituto de custo zero.** A IES pode exigir rascunhos e conversar sem software. O argumento "cumpra a política em escala sem passivo" é bom, mas nenhum cliente o validou com dinheiro. Se cinco instituições não pagarem piloto em dois semestres, o substituto venceu.
- **Dependência da cooperação do aluno e da plataforma.** O produto não funciona se o aluno não quiser e não existe se o Google decidir cobrir o espaço. Nenhuma das duas dependências pode ser eliminada; as duas precisam ser monitoradas com métrica (adesão nos pilotos) e com vigilância de produto (Classroom, Gemini for Education).

**O que fazer antes do PRD.** Em ordem: verificar MX das IES; revisar contrato e armazenamento com advogado; fechar o primeiro piloto pago com preço declarado; medir ativação e cota de escala nele; dez entrevistas com compradores. O PRD que sair disso será um documento de produto institucional com números; o que sairia hoje seria um documento de hipóteses bem escritas.

---

## Pós-teste: o PRFAQ diante de coordenadora, pró-reitor e compras

Sessão de party mode em 31/10/2026 (transcrição em `_bmad-output/party-mode/2026-10-31-prfaq-whitebox-ies.md`). Dez achados que o PRFAQ não cobria ou cobria mal, em ordem de urgência:

1. O README chama o ritmo de digitação de "biometria de teclado"; biometria é dado pessoal sensível na LGPD. Trocar o vocabulário em todo o material ou assumir base legal específica.
2. O roteiro do professor no README ("lições sem métricas não serão pontuadas") contradiz o FAQ ("entrega sem telemetria não é indício de nada"). Adotar a regra do FAQ e reescrever o roteiro.
3. Texto escrito no Word e colado ao final aparece como colagem em bloco, o próprio exemplo de fraude do press release. A resposta é contrato de atividade escrito dentro do documento distribuído, e o "Como funciona" precisa abrir com "o aluno escreve na cópia distribuída".
4. Ditado por voz como "não verificado" é questão de acessibilidade, não limitação técnica; envolver a comissão de inclusão antes do primeiro piloto.
5. Entrada por TCC (banca já é a "conversa", volume menor) em vez de disciplina de massa; replica o caminho do Turnitin nas federais dentro da privada.
6. Visão por turma é pré-requisito de piloto, não melhoria.
7. Preço fechado por semestre para o piloto; "por professor ativo" incentiva subativação e fere a isonomia que o pró-reitor precisa defender.
8. Logs no domínio da IES já no piloto; compras não aprova transferência de dados nem em piloto.
9. Entregar uma minuta de política institucional de IA com o registro de processo como elemento do contraditório; o pró-reitor compra a frase, o software passa junto.
10. Relatório visível antes da entrega pode virar causa de não entrega; medir evasão por atividade nos pilotos.
