# WhiteBox - Google Docs Add-on

## O que é o WhiteBox?
O WhiteBox é uma ferramenta inteligente criada para o ambiente educacional do Google Workspace. Ele se integra perfeitamente ao **Google Docs** na forma de um painel lateral (Add-on) cuja missão é abrir a "caixa-preta" do processo da escrita. 

Ao rastrear metadados como  tempo de foco, rítmo de digitação e comportamentos massivos de cópia e cola, o WhiteBox fornece aos educadores as **evidências da construção do aluno**, desmistificando intervenções de IA Generativa. A ideia não é atuar como uma punição ("caça às bruxas"), mas sim como um escudo que confere mérito ao estudante que se esforçou, fomentando relatórios práticos para a mediação pedagógica em sala de aula de maneira justa!

---

## 👩‍🏫 Passo a Passo: Para os Professores

**1. Acesso à Ferramenta na POC (Contas Pessoais)**
* Como nesta fase as escolas não contam com assinatura _Google Workspace for Education_, o uso inicial é focado em **contas pessoais de e-mail** (do professor e do aluno). Sendo o produto um MVP, **o sistema não estará listado na loja de complementos do Google (Marketplace)**.
* Ao invés disso, trabalharemos via _Scripts Embutidos_ (Container-bound). O professor receberá um arquivo **"Documento Modelo"** da nossa equipe que já contém toda a inteligência do WhiteBox injetada. 

**2. Criação Rápida da Atividade**
1. O Professor(a) acessa o seu **Google Classroom** (Sala de Aula) pessoal.
2. Cria a atividade aninhando nela aquele **"Documento Modelo"** recebido com o script embutido, em vez de criar um Documento em branco.
3. **Importante:** Marque a opção de distribuição como **"Fazer uma cópia para cada aluno"**. Essa é a mágica do Workspace: a cópia que chegará pro aluno herdará todos os rastreios embutidos no seu documento modelo!

**3. Entendendo Onde Estão as Evidências**
1. Como **Professor(a)**, ao abrir o documento entregue por um **Aluno(a)**, o WhiteBox reconhecerá automaticamente a qual turma e estudante aquele texto pertence. Com isso, o painel lateral exibirá para você um resumo comportamental exclusivo daquela entrega, focando sempre em ilustrar perfeitamente para você o nível de esforço e originalidade daquele Aluno na produção do conteúdo. 
2. Se o Professor dispor de uma chave_API, a IA atestará (ex: *"Mudança brusca de estilo e complexidade detectada"* ou *"80% das palavras foram produto de colagens massivas do teclado"*). E na própria tela da ferramenta, lhe oferecerá dicas _"sócraticas"_ de quais os próximos passos pedagógicos você pode engajar com o aluno específico na devolutiva.

**4. ⚠️ A Regra de Ouro Pedagógica (Ativação Passiva)**
Por bloqueios rigorosos de privacidade e antivírus do sistema web do Google, nenhum rastreador de conteúdo no formato _Add-on_ consegue rodar e "vigiá-lo" oculto assim que o documento é aberto. Ou seja, você precisará firmar um contrato pedagógico com a sua turma.
Sempre instrua a sua sala no envio da atividade:
* *"Turma, ao abrirem a nossa Redação pelo Classroom, vão imediatamente no menu **Extensões > WhiteBox > Abrir Painel** para disparar o modo prova. Na primeira vez, aparecerá o pop-up de permissão de segurança da sua conta, clique em 'Permitir'. Se o painel da ferramenta não estiver aberto enquanto vocês digitam, seu processo não gerará pontuação/evidência de esforço. Lições entregues sem métricas geradas no painel não serão pontuadas. O WhiteBox é uma ferramenta de proteção ao mérito do aluno. O WhiteBox só funciona em computadores, não em celulares. O Whitebox respeita a privacidade do aluno e não coleta dados pessoais.

---

## 🎓 Passo a Passo: Para os Alunos

**1. Aceitando a Tarefa Transparente**
1. Ao acessar uma atividade do seu professor no Google Classroom e abrir o seu arquivo de texto, o Aluno verá que pode focar no que importa e começar a desenvolver o seu texto.
2. O "WhiteBox " opera de forma protetiva registrando o seu verdadeiro processo construtivo.

**2. Apoiando a Produção Limpa**
1. O Aluno pode abrir o painel lateral do nosso Add-on clicando no ícone dentro do Docs para checar seus pômordos.
2. De tempos em tempos (se o Aluno efetivamente estiver teclando e criando novos conteudos), o sistema calcula matematicamente a sua biometria de teclado. Não é o texto gravado pronto no final que importará apenas, é o tempo gasto de foco contínuo — criando uma comprovação genuína contra IAs automatizadoras de que você efetivamente redigiu sua obra do zero.

---

## 🛠 Guia Técnico: Criação do "Documento Modelo"
Para que o WhiteBox funcione sem depender da Loja Pública do Google, utilizamos a técnica de **Script Embutido** (*Container-bound script*). Aqui está o detalhamento de como preparar esse arquivo mestre:

### 1. Preparação Manual (Caso não use CLASP)
1. Crie um novo **Google Docs** em branco.
2. Vá em **Extensões > Apps Script**.
3. No editor que abrir, crie dois arquivos:
   - `Código.gs`: Cole o conteúdo do arquivo de lógica do servidor.
   - `Sidebar.html`: Cole o conteúdo da interface visual.
4. Clique em **Configurações do Projeto** (ícone de engrenagem) e marque a opção "Mostrar arquivo de manifesto 'appsscript.json' no editor".
5. No arquivo `appsscript.json`, cole as configurações de escopo e permissões.
6. Salve o projeto com o nome "WhiteBox Core".

### 2. Preparação via Desenvolvedor (Usando CLASP)
Se você tem os arquivos localmente e quer injetá-los em um novo documento:
1. Abra o novo Google Doc e vá em **Extensões > Apps Script**.
2. Clique no ícone de **Engrenagem (Configurações do Projeto)** e copie o seu **ID do Script**.
3. No seu computador, abra o arquivo `.clasp.json` e substitua o campo `"scriptId"` pelo novo ID copiado.
4. Execute `clasp push`. Os códigos serão enviados para o projeto vinculado a esse novo documento.

### 3. A "Mágica" da Replicação
Quando o Professor anexa esse documento específico no **Google Classroom** e seleciona **"Fazer uma cópia para cada aluno"**:
* O Google cria uma cópia física do arquivo para cada estudante.
* **O código Apps Script vai junto na cópia.** 
* Cada aluno passa a ter sua própria instância do Add-on, que se comunica com o Backend (planilha "hitebox - Painel do Professor)

---

## ⚠️ Atenção às Limitações Atuais (Dispositivos Móveis)
A arquitetura do Google Docs possui barreiras importantes que você precisa conhecer:
* **Uso exclusivo por Computador:** Funcionalidades de rastreamento via painel lateral (*Add-ons*) da própria Google ainda **não funcionam** nos aplicativos de celular/tablet (Android/iOS). Portanto, se os alunos tentarem realizar e abrir os trabalhos utilizando seus **telefones móveis**, o aplicativo nativo do Docs do celular não "acordará" o WhiteBox e o rastreamento comportamental não ocorrerá corretamente. 
* _(Dica: Para o rastreio fluir corretamente com o aluno, oriente-os a abrirem as lições num navegador de computador/desktop)._

---

## 🛠 Informação aos Desenvolvedores / Analytics
Para assegurar privacidade e eficiência sem quebras com APIs excessivas, toda batida capturada na interface envia pacotes assíncronos ao motor de Machine Learning utilizando uma "Identidade Tripla" formatada baseada rigidamente nos laços de compartilhamento e pastificações do Google Workspace. A representação interna dos `Payloads` fluem via POST amarrados sob a semântica: `[E-mail do Professor] + [Turma/Classroom] + [E-mail do Aluno] + [ID do Documento]`.
