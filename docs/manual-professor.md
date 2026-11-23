# Manual do professor do Whitebox

O Whitebox acompanha como cada aluno escreve o próprio texto no Google Docs (tempo ativo, sessões, colagens, ritmo de digitação) e ajuda você a conversar com ele sobre o processo, com perguntas socráticas geradas por IA. Ele não dá veredito de plágio: mostra evidências do processo. Cada professor usa a própria chave, do Gemini (começa com AIza… ou AQ.…) ou do Claude (começa com sk-ant-…). Ele pode informá-la no formulário de cadastro, no campo do Cofre, ou depois no painel do documento, na aba ⚙️ Config, clicando em 💾 Salvar Chave API. Se não informar nenhuma, o cadastro funciona, mas sem a análise por IA

Os nomes em **negrito** são os rótulos exatos que aparecem na tela.

**Antes de começar:** use um perfil de navegador logado **só** na sua conta de professor. Se outra conta Google estiver logada no mesmo perfil, o formulário e o painel podem usar a conta errada.

---

## 1. Cadastro

O cadastro é feito uma vez, por um formulário que o administrador do Whitebox envia a você.

1. Abra o link do e-mail "📝 Convite para cadastro no Whitebox - …" (ou o link que o administrador enviou por outro meio). O formulário se chama **Cadastro de Professor - …**.
2. Preencha **Seu Nome Completo** e **Instituição / Escola**.
3. A pergunta **Link do arquivo de Cofre (Google Drive)** é opcional. Ela serve para ativar a IA com a sua própria chave (veja abaixo). Se preferir, deixe em branco agora e cole a chave depois no painel (seção 3).
4. Clique em **Enviar**. Em instantes chega o e-mail "✅ Cadastro Aprovado - Whitebox".

### A chave de IA e o arquivo de Cofre

A "chave" é a chave de um serviço de inteligência artificial. Ela não tem relação com nenhum documento do Whitebox. São aceitas duas:

- **Google Gemini**: começa com `AQ.` (chaves novas) ou `AIza` (antigas). Entre em https://aistudio.google.com/app/apikey com uma conta Google e clique em **Create API key**.
- **Anthropic Claude**: começa com `sk-ant-`. Entre em https://console.anthropic.com, vá em **API Keys** e clique em **Create Key**. Exige cadastro e créditos na Anthropic.

Para usar o Cofre no formulário:

1. No computador, abra um editor de texto (o Bloco de Notas, por exemplo) e salve um arquivo `chave.txt` contendo **só** a chave, numa linha. Precisa ser **.txt**: um documento Google Docs não funciona.
2. Envie o `chave.txt` ao seu Google Drive, clique em **Compartilhar** e dê acesso de **Leitor** à conta indicada no formulário, ou escolha "Qualquer pessoa com o link".
3. Copie o link do arquivo e cole na pergunta.

Se o servidor não conseguir ler o arquivo, chega o e-mail "❌ Erro de Cadastro - Permissão do Cofre Drive (Whitebox)" e o cadastro **não** é feito: corrija o compartilhamento e responda o formulário de novo.

Se você deixar a pergunta em branco, o cadastro entra **sem IA**. Tudo funciona (métricas, relatório, distribuição), menos a análise por IA, até você colar a chave no painel.

## 2. Seu documento mestre

Depois do cadastro, o administrador gera o seu documento mestre e você recebe o e-mail "📦 Seu Sistema Whitebox está pronto!".

1. Abra o documento "Whitebox - Modelo Mestre (<seu e-mail>)" pelo link do e-mail. Ele aparece em **Compartilhados comigo** no seu Drive (o Whitebox não cria arquivos no seu Drive; tudo é compartilhado com você).
2. No menu **Whitebox**, clique em **Abrir Painel Whitebox**.
3. Aceite a autorização (documento atual, painel, e-mail, arquivos abertos com o app, envio de e-mail e Classroom).
4. O painel abre na visão **👩‍🏫 Professor**, com as abas **🔍 Auditoria**, **📤 Distribuir** e **⚙️ Config**.

Escreva no documento mestre o enunciado da atividade. É ele que será copiado para cada aluno.

## 3. Ativar a IA (aba ⚙️ Config)

Se você não enviou o Cofre no cadastro:

1. Na aba **⚙️ Config**, card **⚙️ Configurações**, cole a sua chave (Gemini `AQ.…`/`AIza…` ou Claude `sk-ant-…`). Se aparecer "❌ Erro ao salvar: CHAVE_FORMATO_INVALIDO", a chave não é de nenhum desses formatos.
2. Clique em **💾 Salvar Chave API**.

## 4. Distribuir a atividade para a turma (aba 📤 Distribuir)

Antes, crie a turma no Google Classroom e convide os alunos.

1. No documento mestre, aba **📤 Distribuir**, em **Turmas do Classroom**, clique em **🔄 Atualizar**. Suas turmas aparecem.
2. Preencha **Título da Atividade**, **Prazo (opcional)** e **Instruções (opcional)**.
3. Selecione a turma e clique em **📤 Distribuir Levas**. A barra de progresso chega ao fim.
4. No Classroom, a atividade aparece na turma. Cada aluno recebe a própria cópia do documento.

> **Problema conhecido.** Hoje o **📤 Distribuir Levas** termina com "⚠️ Distribuição falhou" e `Classroom API retornou 404`. Até a correção, crie a atividade direto no Classroom: na turma, **Atividades** > **Criar** > **Atividade**, **Adicionar** > **Google Drive**, escolha o documento mestre (em **Compartilhados comigo**), troque o anexo para **Fazer uma cópia para cada aluno** e clique em **Atribuir**. O Classroom nomeia cada cópia "<nome do aluno> - <nome do arquivo>".

**Não peça ao aluno para apagar o texto do modelo.** O Whitebox guarda quem é o professor no começo do documento. Se o aluno apagar esse começo, as métricas dele deixam de ser enviadas. Peça que ele escreva abaixo do enunciado.

**O que o aluno faz.** Na primeira vez, o aluno abre o painel pelo menu **Whitebox > Abrir Painel Whitebox** e aceita a autorização. Depois disso, o painel abre sozinho a cada vez que ele abre a cópia dele. O Whitebox só registra com o painel aberto: se o aluno fechar o painel, nada é registrado até ele abrir de novo. Quando **você** abre a cópia de um aluno, o painel não abre sozinho, para que a sua escrita não seja registrada como dele. Cópias distribuídas antes dessa função continuam abrindo só pelo menu, e no celular não há painel.

## 5. Acompanhar e auditar (aba 🔍 Auditoria)

1. Abra a **cópia de um aluno** em uma aba própria (pelo Drive, ou no Classroom pelo ícone de abrir em nova aba ao lado do nome do arquivo; a tela de correção do Classroom não mostra o menu **Whitebox**) e abra o painel pelo menu. Na primeira vez em **cada** cópia, o Google pede **Autorização obrigatória**: cada cópia tem o próprio script. Ele abre na visão **👩‍🏫 Professor**, porque a cópia sabe quem é o professor dela.
2. O card **📋 Relatório de processo** mostra um bloco por aluno: minutos ativos, sessões, palavras, colagens, caracteres adicionados e apagados, ritmo (CPM), última atividade e se o trabalho foi entregue. Os números são os mesmos que o aluno vê. Clique em **Atualizar** para recarregar.
3. Para conversar com o aluno sobre um trecho, selecione o trecho e clique em **Analisar Trecho Selecionado**. Aparece uma orientação socrática com uma pergunta sugerida. O Whitebox não mostra risco nem veredito.
4. Se a opção estiver disponível, envie ao aluno as perguntas do **📝 Desafio de Autonomia**. Ele responde no painel dele.
5. O seletor no topo do painel troca entre **👩‍🏫 Professor** e **🧑‍🎓 Aluno**, para você ver o que o aluno vê.

No documento mestre, o card **📋 Relatório de processo** diz "Nenhuma atividade registrada ainda para este documento": os dados ficam nas cópias dos alunos.

## 6. Problemas comuns

- **Aparece "Sem acesso ao Drive deste documento"**: acontece em alguns documentos por causa da permissão mínima de acesso ao Drive. Métricas, relatório, análise e distribuição continuam funcionando; só o nome da turma e a detecção retroativa de colagem ficam indisponíveis.
- **"Não foi possível carregar o relatório (Licença inativa...)"** ou o painel abre como aluno: o seu cadastro está inativo ou com outro e-mail. Fale com o administrador.
- **`HTTP 503 … high demand` na análise**: o modelo do Gemini está sobrecarregado. Tente mais tarde ou peça ao administrador para trocar o modelo.
- **`Classroom API retornou 403` na aba Distribuir**: feche o painel, abra de novo e aceite a autorização do Classroom.
- **O link da planilha no e-mail de cadastro pede acesso**: é esperado. A planilha de logs fica com o administrador; você vê os dados pelo painel.
