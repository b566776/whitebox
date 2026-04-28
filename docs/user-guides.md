# Guia de Operação: Whitebox

Este guia descreve os passos necessários para cada perfil de usuário dentro do ecossistema Whitebox.

---

## 🛡️ 1. Guia do Administrador (Escola/TI)

O Administrador é responsável pela infraestrutura central e pela geração de convites para os professores.

### Setup Inicial (Uma única vez)
1. Abra o editor do Apps Script no projeto `whitebox-server`.
2. Execute a função `setupFormularioSemente()` no arquivo `FormOnboarding.gs`. Isso criará o template base de inscrição.
3. Certifique-se de que o e-mail administrativo tem permissão de leitura nos arquivos que os professores compartilharão.

### Gerando Novos Convites (Levas)
1. Acesse o **Dashboard Admin** do Whitebox.
2. Na seção **Gerar Onboarding de Professores**, dê um nome para a leva (ex: "Turma de Letras 2026") e defina uma data limite.
3. Clique em **Gerar Link de Inscrição Segura**.
4. Copie o link do Google Forms gerado e envie para os professores interessados.

### Monitoramento
- Acompanhe a aba **Assinaturas** na Planilha Global para ver quem já se cadastrou e o status da chave API.
- Utilize os **Mapas de Calor** no Dashboard para visualizar o engajamento institucional.

---

## 👨‍🏫 2. Guia do Professor

O professor gerencia suas próprias turmas e garante a autonomia pedagógica de suas chaves de IA.

### Onboarding e Segurança (Sua Chave API)
1. **Crie sua Chave:** Acesse o [Google AI Studio](https://aistudio.google.com/) e gere uma API Key para o Gemini.
2. **Crie o Cofre:** Vá ao seu Google Drive e crie um arquivo de texto chamado `whitebox_auth.txt`. Cole sua chave lá dentro e salve.
3. **Compartilhe:** Clique em "Compartilhar" no arquivo e adicione o e-mail da sua instituição (ex: `admin@escola.com`) apenas como **Leitor**.
4. **Cadastre-se:** Abra o link do Formulário enviado pelo Admin, preencha seus dados e cole o link do seu arquivo `whitebox_auth.txt`.

### Distribuindo Atividades (Google Classroom)
1. No Dashboard do Whitebox, vá em **Integração Google Classroom**.
2. Selecione sua turma, dê um título para a atividade (ex: "Redação sobre IA").
3. Clique em **Publicar no Google Classroom**. O sistema criará cópias individuais para cada aluno automaticamente.

### Acompanhamento
- Cada professor recebe um link para sua **Planilha de Logs Individual**. Nela, você pode ver em tempo real o "Radar de Esforço" de cada aluno e configurar as instruções específicas que a IA deve dar para cada tarefa.

---

## 🎓 3. Guia do Aluno

O aluno utiliza o Whitebox de forma transparente dentro do ambiente que já conhece.

### Realizando a Atividade
1. Acesse o **Google Classroom** e abra o documento da atividade atribuída pelo professor.
2. O Add-on **Whitebox** aparecerá automaticamente na barra lateral (ou via menu Extensões).
3. Escreva seu texto normalmente. O sistema registra o processo de escrita para garantir a autoria.

### Finalizando o Trabalho
1. Quando terminar o texto, clique no botão **Finalizar Trabalho** na barra lateral do Whitebox.
2. O sistema processará sua telemetria e o "Radar de Esforço".
3. Você receberá um feedback imediato (Aura) e a análise socrática da IA (se ativada pelo professor).
4. O trabalho será marcado como concluído para o professor.
