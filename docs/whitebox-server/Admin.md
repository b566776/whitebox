# Whitebox Server - Manual do Administrador

Este manual cobre a implantação, configuração e gestão diária da infraestrutura do Whitebox Server.

## 🚀 Implantação Inicial & Auto-Provisionamento
O Whitebox foi projetado para uma configuração inicial "Zero-Config":
1.  **Implantar como Web App**: Publique o projeto `whitebox-server`.
2.  **URL de Acesso**: Visite a URL do Web App publicada em seu navegador.
3.  **Configuração Automática**: Se nenhum `ADMIN_SPREADSHEET_ID` for encontrado, o servidor irá:
    - Criar a **Planilha Admin Global**.
    - Gerar um `SHARED_TOKEN` seguro.
    - Mover todos os recursos para uma pasta organizada `/whitebox` em seu Drive.
    - Exibir os detalhes da configuração na tela.

## 👥 Gestão de Professores & Licenças
Os administradores gerenciam o ciclo de vida do professor através do **Painel Admin**:
- **Registro**: Os professores podem ser adicionados manualmente ou através das "Levas de Onboarding" automatizadas.
- **Licenciamento**: Alterne o status entre `Ativo` e `Inativo` para conceder ou revogar o acesso ao proxy.
- **Distribuição de Recursos**: O botão "Distribuir Template" clona o **Doc Mestre** e concede acesso de editor ao professor específico.

## 📦 "Levas" de Onboarding (Onboarding em Lote)
Para integrar grupos de professores (ex: uma nova turma de semestre):
1.  **Gerar Leva**: Use o Painel para criar um Formulário Google temporário.
2.  **Definir Prazo**: Defina quando o formulário deixará de aceitar respostas.
3.  **Fluxo Automatizado**: Conforme os professores enviam o formulário:
    - Uma planilha de log pessoal é criada.
    - Sua chave Gemini (se fornecida) é validada.
    - Eles recebem um e-mail automatizado com os detalhes de sua configuração.

## 📊 Inteligência Global
O Painel Admin fornece mapas de calor (heatmaps) de alto nível:
- **Visão Institucional**: Médias de pontuação de integridade de todos os professores registrados.
- **Visão do Curso**: Telemetria agregada pelo ID do Curso no Classroom.
- **Alertas**: Identificação de clusters de atividades de alto risco.

---
*Documentação gerada via metodologia BMAD.*
