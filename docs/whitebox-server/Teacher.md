# Whitebox Server - Guia Técnico do Professor

Este guia explica a infraestrutura do lado do servidor que suporta o fluxo de trabalho pedagógico do professor.

## 📁 Registro de Logs Descentralizado
Ao contrário dos sistemas centralizados, o Whitebox particiona os dados para dar aos professores total propriedade:
- **Sua Planilha**: Cada professor tem uma planilha do Google dedicada chamada `Whitebox - Log Professor (Email)`.
- **Transparência**: Toda a telemetria dos alunos, pontuações de risco e respostas de IA para suas classes são armazenadas aqui.
- **Autonomia**: Você pode excluir ou arquivar seus logs a qualquer momento sem afetar outros usuários.

## 🤖 Configuração de IA & Autonomia
O servidor concede a você autonomia sobre como a IA interage com seus alunos:
- **Config_Pedagogica**: Esta aba em sua planilha pessoal permite definir o rigor e as instruções específicas de IA para cada tarefa do Classroom.
- **Hierarquia de Chaves**: O servidor verifica seu "Cofre do Drive" pessoal (um arquivo de texto compartilhado com o servidor) em busca de uma chave de API Gemini antes de usar qualquer fallback institucional.

## 🎓 Serviço de Integração com o Classroom
O servidor orquestra o link entre seus documentos e a API do Google Classroom:
- **Mapeamento Automático**: Quando um aluno abre um documento, o servidor tenta encontrar a qual tarefa do Classroom ele pertence, garantindo que as métricas sejam arquivadas corretamente.
- **Gestão de Coursework**: O servidor lida com a publicação de "Modelos Mestre" como cópias individuais dos alunos através do endpoint `publishToClassroom`.

---
*Documentação gerada via metodologia BMAD.*
