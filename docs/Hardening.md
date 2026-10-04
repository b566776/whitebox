# Whitebox Server - Auditoria de Hardening & Segurança

Este documento detalha as camadas de segurança e os patches de robustez implementados para proteger a infraestrutura Whitebox.

## 🛡️ Hardening de API & Autenticação
- **`validateAdminAccess`**: Todas as funções administrativas (licenciamento, seeding, distribuição) são protegidas por uma verificação obrigatória de `SHARED_TOKEN`. Tentativas não autorizadas disparam um erro 401.
- **Handshake do Cliente**: O Painel Admin captura o token na primeira sessão bem-sucedida e impõe seu uso para todas as operações subsequentes que alteram o estado do sistema.
- **Autenticação do Cliente via OAuth**: O add-on envia o `oauthToken` do usuário; o servidor o valida junto ao Google e usa o e-mail verificado. O `SHARED_TOKEN` é exclusivo do Admin e não existe no cliente nem nos metadados do documento. Rotação: `rotacionarSharedToken()` em `AdminSetup.gs`.
- **URL do Servidor Fixa**: O `oauthToken` só é enviado para `BRAIN_PROXY_URL`, constante da biblioteca. O assistente "Configurar Conexão" foi removido: ele permitia a qualquer usuário gravar outra URL nas propriedades (compartilhadas por todos os documentos) e receber os tokens dos demais.
- **Validação de Papel no Servidor**: As rotas de professor (`analisar`, `registrar_chave`, `listar_turmas_professor`, `criar_leva_template`) exigem que o e-mail verificado seja o próprio `professorEmail` e tenha cadastro `Ativo` na aba `Assinaturas`. Alunos só alcançam `logar_metricas` e `ping`.
- **Sem Auto-Cadastro**: `registrar_chave` não cria mais professores; antes, qualquer conta podia se registrar como professor ativo salvando uma chave.
- **Papel na Interface (Role Detection)**: No cliente, `'teacher'` exige ser o professor designado no documento ou ser dono do arquivo com resposta `ATIVO`/`INATIVO` do servidor. Ser dono da cópia gerada pelo Classroom não basta. Esse papel só controla a interface; a garantia é a validação no servidor.

## 🧵 Proteção de Concorrência & Condição de Corrida
- **`LockService`**: Implementação de travas (locks) em nível de script nas rotas `doGet` (provisionamento) e `onProfessorFormSubmit` (onboarding). Isso evita a corrupção de dados ou a criação de recursos duplicados durante requisições simultâneas.
- **Operações Atômicas**: Garantia de que o registro do professor e a criação da planilha sejam tratados como blocos atômicos para manter a integridade do banco de dados.

## 🏗️ Robustez & Integridade do Sistema
- **Gestão de Esquema**: O módulo `SchemaManager.gs` realiza a validação de cabeçalhos antes de cada leitura/escrita, garantindo que edições manuais nas planilhas não quebrem o sistema.
- **Inicialização Segura**: A lógica de provisionamento agora reutiliza planilhas e estruturas existentes, permitindo re-implantações seguras ou reinicializações do servidor.
- **Parsing de JSON Robusto**: Implementação de multi-estratégia para extração de JSON para lidar com respostas da IA (qualquer provedor) que podem conter formatação Markdown ou texto adicional.

## 📡 Limite de Taxa (Rate Limiting) & Gestão de Cotas
- **Emulação de Token Bucket**: O sistema limita as requisições de análise por aluno/hora usando `CacheService` para evitar o esgotamento da cota da API de IA.
- **Chaves de IA fora da URL e da Planilha**: As chaves vão em cabeçalhos HTTP (nunca na URL, que aparece em logs), e chaves individuais reconhecidas (Gemini, Claude) ficam nas Script Properties, não na planilha. A chave Gemini legada não é enviada a outro provedor.
- **Validação de E-mail**: Validação estrita baseada em regex para todas as entradas de e-mail para evitar injeção ou corrupção de planilhas.

---
*Documentação gerada via metodologia BMAD.*
