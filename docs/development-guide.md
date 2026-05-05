# Manual do Desenvolvedor - Operações Whitebox

## 1. Ambiente de Desenvolvimento Local

O Whitebox é gerenciado usando `clasp` (Command Line Apps Script Projects) para permitir controle de versão e edição local.

### 1.1. Instalação
```bash
npm install -g @google/clasp
clasp login
```

### 1.2. Estrutura do Projeto
- `/whitebox-client`: Código-fonte para o Add-on.
- `/whitebox-server`: Código-fonte para o Web App Proxy.
- `/docs2`: Documentação técnica.

---

## 2. Fluxo de Deploy

### 2.1. Server Proxy
1.  Navegue até `whitebox-server/`.
2.  `clasp push` para sincronizar o código.
3.  Implantar como **Web App**:
    - **Executar como**: Eu (Admin).
    - **Acesso**: Qualquer pessoa (Autenticado via `SHARED_TOKEN`).
4.  Copie a URL do Web App para configuração do cliente.

### 2.2. Client Add-on
1.  Navegue até `whitebox-client/`.
2.  `clasp push`.
3.  Configurar **Propriedades do Script**:
    - `BRAIN_PROXY_URL`: URL da implantação do servidor.
    - `SHARED_TOKEN`: Token gerado durante o provisionamento do servidor.

---

## 3. Procedimentos de Teste

### 3.1. Test Runner Automatizado
O Whitebox inclui um framework de testes customizado e leve em `TestRunner.gs`.
- **Execução**: Execute a função `runAllTests()` a partir da IDE do Apps Script.
- **Cobertura**: Inclui validação de e-mail, parsing de JSON, lógica de limite de taxa (rate limit) e integridade de esquema.

### 3.2. Testes de Fumaça Manuais
1.  **Auto-Provisionamento**: Visite a URL do Web App do servidor pela primeira vez (*); ele deve criar a Planilha Admin Global e mostrar o token.

(*) Se for solicitado um token vá nas Configurações do Script server; No menu lateral esquerdo, clique no ícone de engrenagem (Configurações do Projeto). Desça até a seção Propriedades do Script. Localize a propriedade chamada SHARED_TOKEN. O valor ao lado dela é o token que você deve inserir na tela.

2.  **Sincronização de Telemetria**: Abra um Doc com Whitebox ativado, digite algum texto e verifique se uma nova linha aparece na planilha de log do professor.
3.  **Análise de IA**: Use o botão de análise da barra lateral e verifique a resposta socrática.

---

## 4. Manutenção

### 4.1. Migrações de Esquema
Se você adicionar uma nova coluna a qualquer planilha do banco de dados:
1.  Incremente `SCHEMA_VERSION_ATUAL` em `Constants.gs`.
2.  Adicione uma função de migração em `SchemaManager.gs`.
3.  Execute `executarMigracoes(token)` a partir do Painel Admin.

### 4.2. Rotação de Log & Cache
- O sistema usa `CacheService` para tarefas do Classroom (TTL de 6h).
- `LockService` é usado durante o provisionamento para evitar condições de corrida.
