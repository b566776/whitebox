# Whitebox Client - Guia do Professor

Este guia detalha como os professores interagem com o Add-on Whitebox para gerenciar tarefas e monitorar o progresso dos alunos.

## 📋 Configuração Inicial
Antes de começar, certifique-se de que o Add-on está corretamente vinculado ao **Brain Proxy** da sua instituição.
1.  **Abrir Barra Lateral**: Menu `Whitebox` > `Abrir Painel Whitebox`.
2.  **Autenticação**: Se solicitado, insira o `SHARED_TOKEN` fornecido pelo seu administrador.
    > [!NOTE]
    > O token é o mesmo utilizado para configurar o servidor e garante que seus logs sejam enviados para o banco de dados correto da instituição.
3.  **Chave de API**: Na aba "Configurações", você pode registrar sua própria chave de API Gemini. Esta chave é armazenada com segurança em seu "Cofre" (Drive Vault) pessoal via servidor.

## 🚀 Integração com o Classroom
O Add-on permite que você publique o "Doc Mestre" (Modelo Mestre) atual diretamente em um curso do Classroom.
- **Publicação**: Selecione um curso e um título para a tarefa. O sistema criará cópias individuais para cada aluno, cada uma automaticamente "ativada com Whitebox".
- **Rastreabilidade**: O `assignmentId` e o `courseId` são incorporados nos novos documentos para garantir que a telemetria seja registrada no contexto correto.

## 🧠 Autonomia Pedagógica
Os professores podem personalizar o Auditor de IA para cada tarefa:
- **Nível de Rigor**: Defina a estrita conformidade da IA (`Baixo`, `Médio`, `Alto`).
- **Instruções Personalizadas**: Forneça contexto específico (ex: "Analise o uso de fontes históricas neste texto").
- **Perguntas Socráticas**: As perguntas geradas pela IA são projetadas para desafiar o pensamento do aluno com base em seu processo de escrita específico.

## 📊 Monitorando o Progresso do Aluno
- **Status em Tempo Real**: Veja quais alunos têm foco ativo em seus documentos.
- **Indicadores de Risco**: Monitore o CPM (Caracteres por Minuto) e as contagens de eventos de colagem diretamente da barra lateral ou do painel institucional.

## 📤 Distribuição de Modelos (Levas)
A aba **Distribuir** permite que você envie o documento atual como uma tarefa para seus alunos:
1.  **Título e Instruções**: Defina como a tarefa aparecerá no Classroom.
2.  **Prazo**: Defina data e hora limite para a entrega.
3.  **Seleção de Turmas**: O sistema lista suas turmas ativas. Você pode selecionar múltiplas turmas simultaneamente.
4.  **Acompanhamento**: Após clicar em "Distribuir Levas", uma barra de progresso mostrará o status da criação em cada turma.
5.  **Cópia Individual**: Cada aluno receberá sua própria cópia (modo `STUDENT_COPY`), já vinculada ao sistema de auditoria Whitebox.

---
*Documentação gerada via metodologia BMAD.*
