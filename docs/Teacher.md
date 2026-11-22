# Whitebox Client - Guia do Professor

Este guia detalha como os professores interagem com o Add-on Whitebox para gerenciar tarefas e monitorar o progresso dos alunos.

*** explicar aqui o conseito e como funciona um Add-on

## 📋 Configuração Inicial

0.  **Pré-requisito — Cadastro**: Seu e-mail precisa estar cadastrado pelo administrador (formulário de onboarding). Sem o cadastro sua licença de uso do WhiteBox não estará ativada; o painel do WhiteBox abre somente no modo aluno e as funções de professor (análise de IA, chave de API, distribuição) estarão desabilitadas. Cada professor pode utilizar uma chave API de acesso a IA para produzir perguntas socrasticas sobre os trabalhos enviados pelos alunos; está chave API pode ser propria ou formecida pela Instituição de ensino; voce pode utiliza a IA Gemini do Google ou da IA do Claude. Você poderá informá-la quando do preenchimento do formulário de cadastro (Onboarding), no campo do Cofre, ou depois no painel do documento texto, na aba ⚙️ Config, clicando em 💾 Salvar Chave API. Se não informar nenhuma chave API, o cadastro funciona, mas sem a análise por IA.

*** inserir aqui texto que fale sobre o documento Modelo Mestre (sem distribuição)

1.  **Auto-Configuração**: Ao distribuir um documento texto para um novo trabalho academico, o servidor grava nele o seu email (professor responsável); é assim que o painel reconhece você nas cópias para cada aluno. Em qualquer documento sem designação (por exemplo, seu documento mestre, ainda não distribuição), o painel reconhece você pelo cadastro. Na primeira abertura, o Google pede sua autorização, incluindo acesso às suas turmas do Classroom (usado pela aba **Distribuir**), e aos arquivos do Drive abertos com o Whitebox. Se os escopos mudarem em uma nova versão, o Google pede a autorização de novo.
    - Se aparecer o aviso **"Sem acesso ao Drive deste documento"** no topo do painel, o Google não liberou o documento para o add-on: o nome da turma e a detecção retroativa de colagem ficam indisponíveis, mas métricas, análise e distribuição continuam funcionando.
2.  **Abrir Barra Lateral**: Vá ao menu `Whitebox` > `Abrir Painel Whitebox`.
3.  Não há nada mais a configurar. 

## 🚀 Integração com o Classroom
O Add-on permite que você publique o "Doc Mestre" (Modelo Mestre) atual diretamente em um curso do Classroom.
- **Publicação**: Selecione um curso e um título para a tarefa. O sistema criará cópias individuais para cada aluno, cada uma automaticamente "ativada com Whitebox". Essas informações são incorporados nos novos documentos para garantir a rastreabilidade e o registro da telemetria no contexto correto.

## 🧠 Autonomia Pedagógica
Os professores podem personalizar o Auditor de IA para cada tarefa:
- **Nível de Rigor**: Defina a estrita conformidade da IA (`Baixo`, `Médio`, `Alto`).
- **Instruções Personalizadas**: Forneça contexto específico (ex: "Analise o uso de fontes históricas neste texto").
- **Perguntas Socráticas**: As perguntas geradas pela IA são projetadas para desafiar o pensamento do aluno com base em seu processo de escrita específico.

## 📊 Monitorando o Progresso do Aluno
- **Status em Tempo Real**: Veja quais alunos têm foco ativo em seus documentos.
- **Indicadores de Risco**: Monitore o CPM (Caracteres por Minuto) e as contagens de eventos de colagem diretamente da barra lateral ou do painel institucional.

### 📋 Relatório de processo
No topo da aba **Auditoria**, o card **Relatório de processo** mostra, para cada aluno do documento, o que já foi registrado no servidor: minutos ativos, número de sessões, palavras (última contagem), colagens, caracteres adicionados e apagados, CPM médio e pico, última atividade e se houve entrega final. Não há veredito: são só as medidas. Use **Atualizar** para recarregar. O aluno vê exatamente o mesmo bloco, só o dele.

## 📤 Distribuição dos arquivos texto para os alunos (Levas)
A aba **Distribuir** permite que você envie o documento atual como uma tarefa para seus alunos:
1.  **Título e Instruções**: Defina como a tarefa aparecerá no Classroom.
2.  **Prazo**: Defina data e hora limite para a entrega.
3.  **Seleção de Turmas**: O sistema lista suas turmas ativas. Você pode selecionar múltiplas turmas simultaneamente.
4.  **Acompanhamento**: Após clicar em "Distribuir Levas", uma barra de progresso mostrará o status da criação em cada turma.
5.  **Cópia Individual**: Cada aluno receberá sua própria cópia (modo `STUDENT_COPY`), já vinculada ao sistema de auditoria Whitebox.

---
*Documentação gerada via metodologia BMAD.*
