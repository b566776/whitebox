# Whitebox Client - Guia do Professor

Este guia detalha como os professores interagem com o Add-on Whitebox para gerenciar tarefas e monitorar o progresso dos alunos.

## 📋 Configuração Inicial

1.  **Auto-Configuração**: Na maioria dos casos, o Add-on se auto-configurará usando metadados invisíveis injetados pelo servidor durante a criação do documento.
2.  **Abrir Barra Lateral**: Vá ao menu `Whitebox` > `Abrir Painel Whitebox`.
3.  **Configuração Manual (primeiro uso)**: Se aparecer o erro `BRAIN_PROXY_URL não configurada`, use o assistente:
    - No menu `Whitebox` > **`⚙️ Configurar Conexão`**
    - Siga as instruções em 2 passos: URL do servidor e SHARED_TOKEN
    - O sistema valida a conexão automaticamente antes de salvar

> 📖 Guia completo: [Configuração de Conexão](setup-conexao.md)

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
