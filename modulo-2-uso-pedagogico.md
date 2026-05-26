# Módulo 2 — Uso Pedagógico do Whitebox

Conteúdo formatado para publicação como **Materiais** no Google Classroom.

---

## Material 2.1 — Recebendo e Configurando o Documento Modelo

**Título**: Primeiros passos: obtendo e validando seu Documento Modelo

Para começar a utilizar o Whitebox com seus alunos, você precisará de um **Documento Modelo** fornecido pelo administrador de tecnologia da sua escola. Este documento funciona como o "esqueleto" ou template oficial das atividades e já vem com as métricas do Whitebox programadas.

### 📋 O que fazer ao receber o link:
1. **Acesse o link** do Documento Modelo original (não edite nem escreva nele, pois serve de matriz).
2. **Crie uma cópia** ou use-o diretamente como anexo no Google Classroom (veja o Material 2.2).
3. **Verifique se o Whitebox está ativo**: no menu superior do Google Docs, vá em *Extensões > Whitebox > Abrir Painel*.
4. O painel deve abrir na lateral direita do documento. Se abrir com a mensagem "Bem-vindo ao Whitebox", o documento está pronto para uso.

### 💡 Auto-configuração e Tokens
Na maioria das vezes, a configuração é automática. Caso o painel solicite um token, insira o `SHARED_TOKEN` oficial da sua escola (solicite ao administrador de TI se necessário).

### 🛠️ Resolução de Problemas Comuns
*   **❓ Não vejo o menu "Whitebox" em "Extensões"**:
    *   *Causa:* O documento que você abriu não é um modelo com o Whitebox configurado, ou o add-on não está instalado na sua conta de professor.
    *   *Solução:* Solicite o link correto do Documento Modelo ao administrador.
*   **❓ Erro de Autorização (Multi-login / Múltiplas Contas)**:
    *   *Causa:* O Google Workspace às vezes se confunde quando você está logado em mais de uma conta Google no mesmo navegador.
    *   *Solução:* Faça login no navegador usando um perfil exclusivo para a sua conta institucional (ou use uma janela anônima para acessar o Classroom e o Docs). Na primeira execução do painel lateral, permita os escopos de segurança solicitados pelo Google Apps Script.

- 🔗 [Documento Modelo Oficial da Escola](https://docs.google.com/document/d/12XWtB6UawhTpWmm3dReb2gSJu7ErVcpV3p67d2vrgeI/edit) — *Link real do template configurado com o script Whitebox*
- 🎥 [Vídeo: Configurando o Whitebox pela primeira vez (2 min)](https://youtube.com)

---

## Material 2.2 — Criando Atividades no Classroom com o Whitebox

**Título**: Como distribuir atividades Whitebox no Google Classroom

Agora que você tem o Documento Modelo validado, é hora de enviá-lo para seus alunos. A criação da atividade segue o fluxo normal do Classroom, mas com um detalhe crítico.

### 🚶‍♂️ Passo a Passo para Publicação:
1. Acesse o **Google Classroom** e selecione a turma desejada.
2. Vá na aba **Atividades** e clique em **Criar > Atividade**.
3. Defina o **Título** da atividade (ex: *Redação Dissertativa - Tema: Tecnologia e Sociedade*).
4. Escreva as instruções no campo correspondente (não se esqueça de adicionar as orientações do Whitebox — veja o Material 2.5).
5. Clique no botão de anexo do **Google Drive**.
6. Selecione o **Documento Modelo** do Whitebox.
7. 🚨 **PASSO CRÍTICO:** No menu de permissões ao lado do arquivo anexado, mude de "Os alunos podem visualizar o arquivo" para **"Fazer uma cópia para cada aluno"**.
8. Configure a data de entrega, pontuação e tópico pedagógico normalmente.
9. Clique em **Criar atividade**.

> **⚠️ Atenção Máxima:**
> Se você esquecer de marcar a opção "Fazer uma cópia para cada aluno", os alunos tentarão editar o mesmo arquivo ou apenas visualizarão o modelo. O Whitebox precisa que cada aluno tenha o seu próprio arquivo individual para gerar telemetria separada e independente.

**Recursos de Apoio**:
- 🔗 [Central de Ajuda Google: Como anexar arquivos no Classroom](https://support.google.com/edu/classroom/answer/6020285)
- 🎥 [Vídeo: Criando atividades com cópia individual no Classroom (3 min)](https://youtube.com)

---

## Material 2.3 — Interpretando as Métricas e Alertas

**Título**: Diagnóstico pedagógico: entendendo a telemetria de escrita

Uma vez que os alunos comecem a escrever com o painel aberto, os dados de progresso começam a chegar. Você pode ver as métricas individualmente na lateral do documento do aluno ou na Planilha de Heatmap (Visão Consolidada).

### 🔍 Matriz de Diagnóstico Pedagógico
Use a matriz abaixo para converter os números frios do Whitebox em diagnóstico pedagógico prático:

| Cenário de Telemetria | Diagnóstico Técnico | Ação Pedagógica Sugerida |
| :--- | :--- | :--- |
| **CPM: 100–300**<br>Colagens: Poucas/Nulas<br>Foco: Compatível com o texto | **Escrita Natural**<br>O aluno redigiu o texto diretamente no Google Docs, no ritmo esperado de formulação de ideias. | Validar a autoria e focar o feedback estritamente no conteúdo gramatical e argumentativo. |
| **CPM: > 500**<br>Colagens: Elevadas<br>Foco: Muito curto (segundos) | **Possível Cópia/Cola**<br>Grandes blocos de texto foram colados de uma vez no documento (IA ou fontes externas). | Abordar o aluno de forma acolhedora. Perguntar se ele usou rascunho externo ou se teve dificuldades com a proposta. |
| **CPM: < 80**<br>Colagens: Zero<br>Foco: Muito longo | **Dificuldade de Fluxo**<br>O aluno escreve muito lentamente, sugerindo bloqueio criativo, insegurança ou digitação lenta. | Apoiar o aluno no desenvolvimento das ideias. Oferecer suporte extra na estrutura do parágrafo. |
| **CPM: Zero**<br>Colagens: Zero<br>Foco: Zero (Texto Pronto) | **Ausência de Registro**<br>O aluno realizou o trabalho sem abrir o painel lateral do Whitebox ou colou tudo de uma vez sem a extensão ativada. | Solicitar que o aluno refaça a atividade (ou parte dela) com o painel devidamente ativado e aberto. |

### 🟢🟡🔴 Código de Cores no Heatmap
A planilha gerada pelo administrador exibe os alunos em um mapa térmico:
- **Verde**: Processo de escrita autoral consistente.
- **Amarelo**: Sinais de alerta (ex: CPM elevado em um parágrafo específico ou colagens de citações curtas).
- **Vermelho**: Inconsistências graves (ex: texto completo inserido por colagem externa).

**Recursos de Apoio**:
- 📊 [Acesse a Planilha de Heatmap (exemplo real)](https://docs.google.com/spreadsheets/d/...)
- 📄 [Manual Completo das Métricas do Whitebox](https://docs.google.com/document/d/...)

---

## Material 2.4 — Auditoria com IA e Perguntas Socráticas

**Título**: Feedback enriquecido com Inteligência Artificial

Caso o Whitebox da sua escola esteja conectado à **API do Google Gemini**, você terá acesso ao botão **"Analisar"** no painel do professor (dentro do documento do aluno). Este recurso lê as métricas temporais e o texto final para gerar um parecer.

### 🤖 O que a IA fornece ao professor:
1.  **Parecer Pedagógico**: Um texto de análise interna para o professor, cruzando a redação final com o comportamento de escrita (ex: *"O parágrafo 3 exibe uma variação brusca de vocabulário e estilo que coincide com um evento de colagem. Recomenda-se diálogo"*).
2.  **Perguntas Socráticas**: Questionamentos personalizados para o professor fazer ao aluno para motivá-lo a explicar seu próprio texto e verificar seu nível de autonomia.

### 💬 Exemplos Práticos de Abordagem Socrática:
*   *Para o aluno que colou um trecho:*  
    > "No terceiro parágrafo, você usou uma argumentação excelente sobre bioética. Você pode explicar, com suas próprias palavras, a relação entre as ideias desse trecho?"
*   *Para o aluno com escrita fragmentada:*  
    > "Notei que você levou um tempo considerável formulando a introdução. Quais foram os seus principais desafios para iniciar a redação desse tema?"

### ⚙️ Níveis de Rigor Pedagógico
Você pode ajustar o nível de rigor no painel do professor:
*   **Baixo**: Focado em desenvolvimento da escrita e suporte (adequado para séries iniciais).
*   **Médio**: Equilíbrio padrão entre análise textual e consistência de autoria.
*   **Alto**: Análise detalhada de autoria (indicado para redações oficiais ou avaliações de alta relevância).

---

## Material 2.5 — Orientações para os Alunos

**Título**: Instruções para a turma sobre o uso do Whitebox

*Professor: copie o modelo abaixo e publique-o no campo de instruções da atividade do Google Classroom.*

---

### 📌 Orientações importantes para a nossa atividade de Redação:

Olá, turma! 

Esta atividade utiliza o **Whitebox**, uma ferramenta integrada ao Google Docs que ajuda a registrar e valorizar o seu **processo de criação e escrita**.

**O que você precisa fazer:**
1. Abra o documento da atividade pelo **computador** (computador desktop ou notebook. O Whitebox não é compatível com celulares ou tablets).
2. Antes de começar a digitar, clique no menu superior em: **Extensões > Whitebox > Abrir Painel**.
3. Na primeira vez, clique em "Continuar" para conceder as autorizações necessárias da sua conta escolar.
4. **Mantenha o painel do Whitebox aberto na lateral direita** durante todo o tempo em que estiver escrevendo seu texto. Se você fechar o painel, o sistema pausará o registro e o tempo de escrita não será computado.

**O que o Whitebox monitora?**
- Apenas o tempo gasto escrevendo ativamente no Google Docs e a velocidade natural de digitação.
- Ele **NÃO** grava sua webcam, **NÃO** tira prints da sua tela e **NÃO** monitora outras abas do seu navegador. O processo é totalmente seguro e respeita sua privacidade.

> **⚠️ Atenção:** Redações entregues sem o registro de escrita (com tempo ou dados zerados devido ao painel fechado) precisarão ser justificadas ou refeitas em sala de aula.

**5. Como entregar a sua tarefa concluída:**
*   **Método 1 (Direto pelo Google Docs):** No canto superior direito da tela do seu Google Docs, clique no botão **"Entregar"** (ao lado de 'Compartilhar').
*   **Método 2 (Pelo Google Classroom):** Acesse a página da atividade no Classroom, localize a caixa **"Seu trabalho"** no canto direito e clique no botão **"Entregar"** para confirmar o envio.

Dúvidas sobre o funcionamento? Me procurem antes do prazo de entrega! Bom trabalho a todos!

---

**Recursos de Apoio**:
- 🔗 [Guia do Aluno em PDF](https://docs.google.com/document/d/exemplo-guia-aluno-pdf/edit) — *Link para o manual do estudante*
- 📄 [Termos de Uso do Aluno](https://docs.google.com/document/d/exemplo-termos-uso-aluno/edit) — *Link para o documento de Termos de Uso*

---

## Material 2.6 — Atividade Síncrona de Simulação (Laboratório de Perfis)

**Título**: Atividade Prática: Simulação dos Perfis de Escrita (15 min)

Esta é uma atividade prática e síncrona de 15 minutos projetada para capacitar professores no reconhecimento prático dos três perfis principais de escrita que o Whitebox rastreia.

### 🏃‍♂️ Dinâmica do Laboratório (15 Minutos)

O ministrante da capacitação (ou você mesmo ao testar) dividirá os professores participantes em três grupos distintos de simulação. Todos deverão produzir um texto sob o tema:

> **📝 Enunciado da Atividade:**
> *“Faça um resumo curto (1 parágrafo) do último filme que você assistiu.”*

#### 👥 Divisão dos Grupos de Teste:

1.  **Grupo 1 — Escrita Orgânica (Escrita Autoral Pura):**
    *   **Instrução:** Escreva o resumo do filme digitando de forma totalmente manual e original, direto na página do Google Docs.
    *   **Resultado esperado no Whitebox:** Status Verde 🟢, CPM natural (100–300) e 0 eventos de colagem.

2.  **Grupo 2 — Escrita Híbrida (Com auxílio de IA):**
    *   **Instrução:** Comece a escrever o resumo do filme de forma manual. No meio da redação, abra uma IA (Gemini ou ChatGPT), peça para ela reescrever ou completar algumas frases, e cole esses fragmentos no seu documento.
    *   **Resultado esperado no Whitebox:** Status Amarelo 🟡, CPM oscilante e pequenos eventos de colagem de trechos.

3.  **Grupo 3 — Cópia e Cola Direta (Bypass/Plágio de IA):**
    *   **Instrução:** Vá diretamente para a IA, peça para ela escrever o resumo do filme completo, copie o texto inteiro gerado e cole de uma só vez no Google Docs.
    *   **Resultado esperado no Whitebox:** Status Vermelho 🔴, tempo de foco ativo zerado (ou pouquíssimos segundos) e um evento de colagem massiva.

---

### 📊 Análise Pós-Atividade e Entrega

Ao final dos 15 minutos, cada participante deverá entregar seu documento.

> **📥 Como os participantes devem enviar o documento pronto (no papel de alunos):**
> Como a atividade foi configurada com a opção **"Fazer uma cópia para cada aluno"**, o Google Classroom gerará automaticamente o seu documento individual de trabalho na seção **"Seu trabalho"** (no canto superior direito ou lateral).
> Siga estas etapas simples para entregar:
> 1. Acesse a tarefa correspondente ao *"Laboratório Prático Whitebox"* no Google Classroom.
> 2. No painel lateral direito, clique no documento já anexado com o seu nome para abri-lo.
> 3. Realize o exercício (certificando-se de abrir o painel lateral em *Extensões > Whitebox > Abrir Painel*) e, ao terminar, clique em **"Entregar"** diretamente na página da atividade no Classroom ou no botão **"Entregar"** no canto superior direito do Google Docs.

Após as entregas, o professor mediador deve abrir a **Planilha de Heatmap** ou os painéis de auditoria do professor e convidar todos a observarem como o Whitebox expôs de forma cirúrgica e visual cada um dos três perfis simulados (Verde, Amarelo e Vermelho).

> **💡 Insight Pedagógico:**
> Esta simulação serve para mostrar aos professores que a ferramenta não busca punir, mas sim dar visibilidade ao esforço autoral e abrir espaço para o diálogo formativo sobre o uso ético da inteligência artificial.

**Recursos de Apoio**:
- 🔗 [Documento Modelo para o Laboratório](https://docs.google.com/document/d/12XWtB6UawhTpWmm3dReb2gSJu7ErVcpV3p67d2vrgeI/edit) — *Link para o Google Doc de template do Whitebox*
- 🎥 [Vídeo Tutorial: Analisando Perfis em Tempo Real](https://youtube.com/watch?v=analise-perfis)
