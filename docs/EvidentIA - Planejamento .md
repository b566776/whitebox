

Para um hackathon com prazo de 4 dias, o foco deve ser no **MVP (Produto Mínimo Viável)**, priorizando a integração das funcionalidades que abrem a "caixa-preta" e validam a autonomia do aluno.

Abaixo, apresento o planejamento dividido por competências para dois desenvolvedores:

---

## **Cronograma de Execução (4 Dias)**

### **Dia 1: Fundação e Captura de Dados (A "Caixa-Preta")**

O foco é estabelecer a comunicação entre o Google Docs e o backend.

* **Dev 1 (Frontend/Google Apps Script):**  
  * Criar o Add-on básico para Google Docs.

    * 1\. Instalação e Configuração (Administrador de TI / Professor).   
      O foco aqui é a instalação centralizada para evitar que o aluno precise configurar algo manualmente.  
* **Publicação:** O desenvolvedor publica o Add-on de forma privada no domínio do Google Workspace for Education da instituição.  
* **Distribuição:** O administrador de TI ou o professor (via Console de Admin) realiza a "Instalação Forçada" (Force-install).  
* **Ativação:** O Add-on aparece automaticamente no menu lateral de todos os Google Docs criados dentro do domínio da escola, sem necessidade de download externo

  #### 2\. A Jornada do Professor (Avaliação e Diálogo)

  O professor utiliza a ferramenta para sair do jogo de "adivinhação" e agir com base em evidências.

* **Criação da Tarefa e Abertura da "Caixa-Preta":**Distribuição via Google Classroom: O professor cria uma atividade e anexa um Google Docs com a opção "Distribuir uma cópia para cada aluno".   
  Ativação Automática: Assim que o aluno abre sua cópia, o Add-on inicia o registro silencioso de metadados, tempo de edição e histórico de rascunhos.  
  Configuração de Parâmetros: Através da Sidebar, o docente define se a tarefa exigirá validação de fontes via Google Scholar e ativará alertas para inserções massivas de texto (indícios de automação).  
  Transparência Pedagógica: O professor orienta a turma que o processo de construção (e não apenas o arquivo pronto) será visível, promovendo o uso ético da IA e o letramento digital desde o rascunho.   
  Essa funcionalidade transforma a ferramenta em um suporte ajustável, evitando que seja apenas um veredito de "é IA"  
* **Análise de Indicadores:** O docente revisa os relatórios que apontam padrões de escrita e a confiabilidade das fontes citadas.  
* **Análise do texto produzido**: O professor seleciona o aluno/trabalho quando ele abre o trabalho de um aluno específico: Diferente de uma aplicação externa, o Add-on funciona dentro do arquivo aberto. Informando o e-mail do proprietário do arquivo; a Sidebar "acorda" já sabendo que aquele texto pertence ao Aluno X, permitindo que o professor visualize o nível de autonomia daquele trabalho específico sem precisar selecioná-lo em uma lista.  
  Caso o professor suspeite de um parágrafo específico ou queira validar uma fonte isolada, poderá destacar (seleciona com o mouse) um trecho do texto no Google Docs.e clicar em "Analisar Evolução" na Sidebar, e a aplicação mostrará se aquele trecho específico "mudou o tom repentinamente".  
* **Disparo da Validação:** Se o professor notar indícios de automação pura ou falta de reflexão, ele aciona o **Gerador de Quiz** baseado no texto entregue.  
* **Oportunidade de Conversa:** Com o resultado do quiz em mãos, o professor recebe sugestões de como conversar com o aluno para desenvolver o senso crítico e o uso ético das ferramentas digitais.  
* **Veredito Pedagógico:** O quiz não substitui o professor; ele serve como uma evidência adicional para que a decisão final sobre o aprendizado seja justa e fundamentada.

  ### 3\. A Jornada do Aluno (Escrita e Construção)

  Nesta fase, a ferramenta atua como um assistente de letramento e coletor de evidências para o futuro diálogo com o docente.

* **Produção Assistida:** O aluno escreve no Google Docs enquanto o add-on registra o progresso e a evolução do trabalho desde o rascunho.  
* **Preparação para a Defesa:** O sistema sinaliza ao aluno que o processo de construção está sendo documentado, incentivando a reflexão sobre o conteúdo e as fontes utilizadas.  
* **Realização do Quiz:** O aluno responde ao **Quiz Gerado por IA** somente após o professor decidir enviá-lo, utilizando essa etapa como uma ferramenta de autoavaliação e confirmação de sua compreensão.  
* **Pesquisa Assistida (Google Scholar)**: Se o professor configurou a tarefa para exigir fontes confiáveis, o aluno verá um campo de busca que retorna artigos acadêmicos diretamente na lateral, facilitando a citação correta.  
* **Indicador de Progresso (Caixa-Preta)**: Um gráfico simples que mostra ao aluno o seu próprio tempo de dedicação e histórico de rascunhos. Isso gera transparência: o aluno sabe que o seu processo está sendo valorizado, não apenas o texto final.  
* **Validador de Fontes**: Uma ferramenta onde o aluno cola um link e a IA indica se aquela fonte é considerada confiável (ex: ".edu", ".gov") ou se ele deve procurar uma evidência melhor.  
* **Interface do Quiz de Autonomia**: Quando o professor dispara o desafio, é nesta Sidebar que as perguntas aparecem para o aluno responder.  
* 

  ---

  ### **Benefício da Alteração**

  Esta mudança garante que a ferramenta não seja vista como uma "caça às bruxas" automatizada, mas como um **apoio pedagógico** acionado pelo professor no momento que ele considerar oportuno para o desenvolvimento do aluno.

  * Implementar a captura de metadados do documento (tempo de edição e histórico de revisões).  
  *   
* **Dev 2 (Backend/Integrações):**  
  * Configurar a estrutura de banco de dados para armazenar os logs de estilo dos alunos.  
  * Criar a API para receber os metadados e os textos enviados pelo Add-on.

    **Documentação Técnica da API.**   
    Esta documentação foi estruturada para que o **Dev 2** possa implementar o backend da solução, garantindo a recepção correta dos dados enviados pelo Google Apps Script (Dev 1\) e o processamento das regras de negócio do desafio.

    #### 1\. Visão Geral

    A API serve como o motor de inteligência da solução, processando metadados de escrita e conteúdos textuais para abrir a "caixa-preta" da aprendizagem e validar a autonomia do aluno.

#### 2. Endpoint de Análise Principal

* **URL:**  "https://triagem.cliv.app/api/send"; 
* **Método:** POST
* **Content-Type:** application/json

#### A) Estrutura do Payload (Enviado pelo Add-on)
O Add-on disparará as capturas empacotadas para este POST, contendo as heurísticas de comportamento (`behavioralMetrics`), e agora utilizando a **String Composta de Rastreio** em `studentId`.

```json
{
  "documentId": "ID_UNICO_DOC",
  "timestamp": 1713360000000,
  "studentContext": {
    "studentId": "professor@escola.com+Turma 9A+aluno@escola.com+1uH2G_vB..._Exemplo_Id"
  },
  "behavioralMetrics": {
    "activeFocusTimeMinutes": 15,
    "idleGapCount": 2,
    "editRatio": "0.18",
    "structureChanges": 1,
    "charsAdded": 1200,
    "charsDeleted": 150,
    "pasteEvents": {
      "count": 2,
      "massiveInsertionsDetected": true,
      "avgCharsPerPaste": 250
    },
    "typingSpeed": {
      "avgCharsPerMinute": 85,
      "peakCharsPerMinute": 110
    }
  },
  "contentAnalysis": {
    "selectedFragment": "Trecho selecionado pelo professor...",
    "detectedUrls": ["https://exemplo1.com", "https://exemplo2.org"]
  }
}
```

#### B) Estrutura de Retorno Esperada (Processada pelo Dev 2)
*(Baseado no arquivo `4-dados_processados_backend.json`)*

**Orientações para o Dev 2:** O Backend deverá engolir o Payload acima, disparar as IA Generativas/NLP, extrair insights de consistência e formular o relatório final neste contrato rigoroso de retorno abaixo. O Add-on reage diretamente à resposta desssa infraestrutura:

```json
{
  "contentAnalysis": {
    "toneConsistencyScore": 0.45,
    "vocabularyComplexityIndex": "AVANÇADO",
    "toneChangeDetected": true
  },
  "sourcesAndLiteracy": {
    "detectedUrls": [
      {
        "url": "https://exemplo.edu.br",
        "exists": true,
        "trustScore": "CONFIÁVEL",
        "sourceOriginType": "ACADÊMICO",
        "citationMatch": true
      }
    ],
    "unreliableSourcesCount": 1,
    "hallucinationAlert": false
  },
  "pedagogicalEngagement": {
    "status": "SENT_BY_TEACHER",
    "suggestedSocraticQuestions": [
      "Como você validou a informação da fonte citada?",
      "Este parágrafo apresenta um estilo diferente do seu usual; pode explicar como o estruturou?"
    ]
  }
}
```

---

      #### 3\. Requisitos de Processamento (Lógica do Dev 2\)

      O backend deve implementar quatro motores principais de análise:

      #### A. Motor de Estilo (Diferencial)

* **Ação:** Comparar o trechoAtual com o histórico de trabalhos anteriores do mesmo aluno armazenados no banco de dados.  
* **Objetivo:** Detectar indícios de mudança brusca de tom ou padrões de escrita que sugiram conteúdo gerado por IA ou terceiros.

  #### B. Validador de Fontes e "Alucinações"

* **Ação:** Validar se as URLs em fontes são reais e classificar sua credibilidade.  
* **Objetivo:** Alertar o professor sobre sites não confiáveis, falta de autoria ou informações sem evidência.

  #### C. Gerador de Quiz de Autonomia

* **Ação:** Utilizar um modelo de LLM (ex: Gemini) para gerar 3 perguntas de múltipla escolha baseadas exclusivamente no trechoAtual.  
* **Objetivo:** Confirmar se o estudante realmente refletiu sobre o conteúdo entregue ou se apenas automatizou o processo.

  #### D. Relatório de Apoio Pedagógico

* **Ação:** Gerar sugestões de perguntas socráticas baseadas nos riscos detectados (ex: baixo effortScore).  
* **Objetivo:** Apoiar o professor no desenvolvimento do senso crítico e uso ético das ferramentas digitais pelo aluno.

  ---

  #### 4\. Fluxo de Resposta da API

  A API deve retornar um status consolidado para atualizar a Sidebar.html:

| Campo | Descrição |
| :---- | :---- |
| status | Sucesso ou Erro na análise. |
| pedagogicalAdvice | String com dica de como o professor deve abordar o aluno. |
| quizData | Array de objetos com perguntas e opções de resposta. |
| riskEvidence | Descritivo das evidências encontradas (ex: "Mudança de tom no parágrafo 3"). |

  ---

  #### 5\. Considerações de Segurança

* **Autenticação:** Validar o token Bearer enviado pelo Google Apps Script.  
* **Escalabilidade:** Como o envio possui estratégia de *debounce* de 3 segundos no cliente, o backend deve estar preparado para picos de requisições ao final de prazos escolares.  
* **Inclusão Digital:** As mensagens de erro e alertas de risco devem usar linguagem clara, evitando jargões técnicos excessivos para facilitar o uso por professores não especialistas.  
  * 

### **Dia 2: Inteligência e Validação de Fontes**

Desenvolvimento dos motores de análise crítica.

* **Dev 1 (Frontend/UI):**  
  * Desenvolver o painel lateral (Side-panel) para o professor e aluno.  
  * Integrar a interface de "extensão do Google Scholar" para sugerir fontes reais.  
* **Dev 2 (IA e Lógica de Negócio):**  
  * Implementar o verificador de fontes: validar se os links citados existem e sua confiabilidade.  
  * Desenvolver o algoritmo de "Análise de Estilos" comparando o texto atual com o histórico do aluno.

### **Dia 3: Validação de Autonomia e Relatórios**

Transformar dados em suporte pedagógico.

* **Dev 1 (Funcionalidades de Engajamento):**  
  * Implementar o **Gerador de Quiz** automático baseado no conteúdo do texto para o aluno responder.  
  * Criar os indicadores visuais (semáforos de cores) para o professor.  
* **Dev 2 (Processamento de Linguagem Natural):**  
  * Configurar o prompt de IA para gerar as perguntas do quiz e as sugestões de diálogo para o professor.  
  * Ajustar o detector de "plágio e fontes inexistentes".

### **Dia 4: Refinamento, Pitch e Integração Final**

Foco na experiência do usuário e apresentação dos diferenciais.

* **Dev 1:** Ajustar a interface para garantir que seja amigável a não especialistas (Inclusão Digital).  
* **Dev 2:** Testes finais de integração e geração do relatório final de evidências para o docente.  
* **Ambos:** Preparação dos argumentos do pitch: como a solução evita a "caça às bruxas" e foca no ensino.

---

## **🛠️ Divisão de Responsabilidades**

| Função | Dev 1 (Especialista em Interface/Apps Script) | Dev 2 (Especialista em Backend/IA) |
| :---- | :---- | :---- |
| **Foco Principal** | Experiência no Google Docs e captura de metadados. | Inteligência de análise, validação de fontes e geração de quiz. |
| **Entregáveis** | Add-on funcional, Dashboard visual e integração Scholar. | API de análise de estilo, motor de validação de URLs e IA generativa. |

Este planejamento garante que, ao final do 4º dia, vocês tenham uma ferramenta que não apenas aponta indícios de automação, mas fornece ao professor as evidências necessárias para uma avaliação justa e profunda.

## ANEXOS  Anexo 1 \- Documentação de Proposta: POC EvidencIA

Duração de 6 Meses

### 1\. Visão Geral

Esta Prova de Conceito (POC) visa validar a eficácia do Add-on EvidencIA em um  
ambiente real de ensino por um período de 6 meses. O foco é abrir a "caixa-preta" do processo de escrita, promovendo o letramento digital e o uso ético de tecnologias (incluindo IA) por meio de evidências de esforço e autonomia.

2\. Público-Alvo e Ambiente  
● Perfil: Professores e alunos utilizando contas pessoais (@gmail.com).  
● Plataforma: Google Docs integrado ao Google Classroom (versão pessoal).  
● Duração: 6 meses.

3\. Arquitetura da Solução

3.1. Frontend (Google Apps Script \- Dev 1\)  
● Sidebar Contextual: Interface que se adapta ao perfil (Professor ou Aluno).  
● Mecanismo de Debounce: Captura de metadados de escrita a cada 3 segundos de  
Inatividade para otimizar cotas de API.  
● Gatilhos Automatizados: Uso de onEdit e onOpen para registro silencioso de  
evolução, mesmo com a sidebar fechada.

3.2. Backend e Inteligência (API \- Dev 2\)  
● Análise de Estilo: Comparação de tons e complexidade vocabular entre trabalhos.  
● Validação de Fontes: Checagem de credibilidade de URLs citadas.  
● Motor de Quiz: Geração de perguntas socráticas baseadas no rascunho do aluno.

4\. Estrutura de Identificação e Dados (Par Identificador)  
Para garantir a organização em domínios não rígidos, cada registro de dados na API segue o  par: \\[E-mail do Professor\] \+ \[Nome da Turma/Classroom\]\+[E-mail do Aluno\] \+ \[ID do Documento\]. O nome da turma é extraído automaticamente da pasta pai do documento no Google Drive.

5\. Jornada do Professor na POC

5.1. Criação: O professor cria uma turma no Classroom pessoal e distribuir um "Documento  
Modelo".

5\.2\. Configuração: Pela Sidebar, define parâmetros como "Exigir Google Scholar" e  
"Alertas de Inserção Massiva".

5\.3\. Acompanhamento: Visualiza em tempo real o tempo de edição e alertas de mudança  
de tom ou colagens desproporcionais.

5.4. Intervenção: Dispara o Quiz de Autonomia quando necessário para validar a  
compreensão do aluno.

6\. Cronograma da POC (6 Meses)  
● Mês 1: Onboarding, instalação manual do Add-on e registro dos primeiros rascunhos.  
● Meses 2-5: Ciclos de tarefas regulares com monitoramento de evolução de estilo e  
letramento digital.  
● Mês 6: Consolidação de dados, análise de impacto no nível de autonomia dos alunos e  
relatório final.

7\. Limites Técnicos (Contas Pessoais)  
● Cotas de API: Máximo de 20.000 chamadas/dia por usuário (UrlFetch).  
● Participantes: Até 250 alunos por turma no Classroom pessoal.  
● Instalação: Requer ação manual do aluno no primeiro acesso (instalação via  
Marketplace não listado).

8\. Segurança e Privacidade (LGPD)  
● Dados anonimizados para análise de estilo.  
● Tráfego via HTTPS e autenticação via tokens de identidade do Google Script.  

---

## Anexo 2 - Lógica Heurística de Rastreio Prático (Metadados do Aluno / Item 2)

A captura de metadados comportamentais no Sidebar do aluno opera sob uma lógica heurística robusta sem a necessidade de depender do gatilho puro _onEdit_ (que não existe no Google Docs). O rastreamento contínuo das seguintes métricas (`behavioralMetrics`) ocorre em ciclos de 5 segundos:

1. **`activeFocusTimeMinutes`:** Deixamos de simular um relógio estático. A matemática atual utiliza os milissegundos precisos da classe global (`Date.now()`), calculando o incremento real focado do cursor.
2. **`pasteEvents` (Eventos de Colagem):** Se a diferença estrutural de caracteres no documento durante esse intervalo exato pular para algo superior a `50 caracteres` de uma vez, nosso Javascript entende que humanamente isso originou-se através de um comando copiar/colar (`ctrl+v`):
   - Ele incrementará o limitador `pasteData.count` e computará o total colado massivamente.
   - Fornece ao Endpoint um cálculo final para embasar a métrica **`avgCharsPerPaste`**.
3. **`typingSpeed` (Velocidade de Digitação):** O cenário contrário é considerado se a mudança temporal for inferior a 50 (indicando traços de digitação biológica normal contínua por tecla).
   - O Frontend passa a rastrear a proporção de conversão multiplicando pelo teto base de 60 segundos, cruzando sempre contra os "surtos efêmeros" do aluno para descobrir as sessões taticamente intensas (**`peakCharsPerMinute`**) informando de modo consistente a taxa geral (**`avgCharsPerMinute`**).

Este método garante a extração efetiva e em tempo real dos rastreios apontados no Payload do Item 2.

---

## Anexo 3 - Radar de Esforço e Biometria Profunda (Evolução POC)

Implementamos uma camada visual de auditoria e métricas refinadas para oferecer ao professor um "Raio-X" completo da autoria.

### 1. Radar de Esforço (Visual MiniMap)
- **Visualização Vertical**: O radar foi reorientado para a vertical para mimetizar a estrutura real da folha de papel.
- **Escala Dinâmica**: A altura de cada segmento do radar é proporcional ao tamanho real do parágrafo no documento, eliminando espaços vazios.
- **Sincronização de Scroll (Smart Scroll)**:
    - **Clique Localizador**: Ao clicar em um segmento colorido, o Google Docs rola instantaneamente para o trecho correspondente.
    - **Hover Debounced**: Ao repousar o mouse sobre o radar por 400ms, o documento navega automaticamente para o parágrafo ("Navegação por Radar").

### 2. Biometria Comportamental Avançada
Expandimos a captura de dados para além da velocidade de digitação, focando agora na **qualidade do processo**:

- **Edit Ratio (Índice de Revisão)**: Proporção entre caracteres deletados e adicionados. Alunos com escrita orgânica apresentam alta atividade de revisão (correções/ajustes), enquanto textos colados ou gerados por IA apresentam índice próximo de zero.
- **Idle Gaps (Detecção de Bloqueio)**: Monitoramento de intervalos de 5 minutos de inatividade total. Permite ao professor identificar alunos que estão "travados" no rascunho sem evolução (enviado ao retomar a escrita).
- **Detecção de Rearranjo Estrutural**: O sistema gera uma "assinatura digital" da ordem dos parágrafos. Se o aluno mover blocos grandes de texto de lugar, o sistema registra uma mudança estrutural (indicativo de edição madura ou reestruturação de conteúdo).

### 3. Melhorias de UX na Sidebar
- **Tooltips Flutuantes**: Pré-visualizações aparecem em balões "Noir" (fundo preto) posicionados dinamicamente à direita do radar, com cálculo de precisão em relação ao viewport.
- **Identificação Composta**: O `studentId` agora é uma chave única que amarra Professor, Turma, Aluno e Documento, garantindo rastreabilidade total no Backend.

---

## Anexo 4 - Dicionários de Dados e Contratos JSON (Dev 2)

Estes contratos definem a comunicação entre o Add-on (Apps Script) e o Backend (vía `triagem.cliv.app`).

### 1. Dados Nativos (Extração Pura do Doc)
`1-dados_nativos_addon.json`
```json
{
  "docId": "1uH2G_vB..._Exemplo_Id",
  "length": 1450,
  "wordCount": 240,
  "structureSignature": [120, 45, 800, 485],
  "fullTextChunk": "O tubarão é um animal fascinante..."
}
```

### 2. Dados Calculados (Biometria na Sidebar)
`2-dados_calculados_sidebar.json`
```json
{
  "behavioralMetrics": {
    "activeFocusTimeMinutes": 12.5,
    "idleGapCount": 1,
    "editRatio": "0.18",
    "structureChanges": 1,
    "charsAdded": 1450,
    "charsDeleted": 260,
    "pasteEvents": { "count": 1, "massiveInsertionsDetected": true, "avgCharsPerPaste": 450 },
    "typingSpeed": { "avgCharsPerMinute": 42, "peakCharsPerMinute": 58 },
    "isFinalSubmission": true
  }
}
```

### 3. Contexto de APIs Avançadas (Item 3)
`3-dados_apis_avancadas.json`
```json
{
  "studentContext": {
    "professorEmail": "professor@escola.com",
    "gradeLevel": "Turma 9A",
    "institutionId": "ESCOLA_COM"
  },
  "metadataHistory": { "revisionsCount": 24 }
}
```

### 4. Resposta do Backend (IA / NLP)
`4-dados_processados_backend.json`
```json
{
  "status": 200,
  "toneChangeDetected": true,
  "riskEvidence": "Mudança de tom detectada no parágrafo 3...",
  "pedagogicalAdvice": "Pergunte ao aluno como ele estruturou...",
  "quizStatus": "AVAILABLE",
  "quizData": [
    { "question": "...", "options": ["...", "..."], "answer": 0 }
  ],
  "sourceAnalysis": [
    { "url": "...", "isReliable": true, "status": "ACTIVE", "message": "..." }
  ]
}
```

---

## Anexo 5 - Auditoria de Código [CR] e Refatoração de Produção

Em 18/04/2026, o projeto passou por uma auditoria de qualidade sênior para garantir a escalabilidade do sistema.

### 🛡️ Melhorias de Resiliência Implementadas
1. **Polling Recursivo**: Substituição do `setInterval` por `setTimeout` recursivo no rastreio do aluno. 
   - *Explicação*: Evita que requisições se acumulem no Google Apps Script em caso de latência, garantindo uma única execução por vez.
2. **Imunidade de Papel (Professor)**: O sistema de segurança agora valida o e-mail do usuário logado contra o e-mail do professor. 
   - *Explicação*: Professores não são bloqueados pelo gatilho de submissão, permitindo auditoria contínua mesmo em documentos entregues.
3. **Radar com Debounce de 500ms**: A atualização do Mapa de Calor (Heatmap) foi otimizada para aguardar um silêncio operacional antes de processar o documento.
4. **Smart Scroll com Destaque**: A navegação pelo radar agora inclui uma seleção visual momentânea do parágrafo no Google Docs, melhorando a rastreabilidade do olhar do professor.
5. **Automação de Abertura**: O Radar de Esforço agora é disparado automaticamente ao abrir a visão do professor, eliminando etapas manuais.

### ✅ Estado Atual: **Pronto para Homologação**.
