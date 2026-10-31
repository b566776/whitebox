# Digest D5 — GTM e preço (rodada 1)

Nota de método: 18 chamadas (7 WebFetch ok, 3 404/redirect, 7 WebSearch). Fontes lidas na íntegra: 6; demais claims vêm de trechos de busca.

## Claims

### Canal Google (parceiros / Marketplace / Classroom)
- claim: Para revender Google for Education no Brasil o parceiro precisa se inscrever no Google Cloud Partner Advantage com engajamento "Sell"; o contrato é com a Google Cloud Brasil Computação e Serviço de Dados Ltda. | source: https://edu.google.com/intl/ALL_br/resources/get-started/find-a-partner/become-a-partner/ ; https://workspace.google.com/intl/pt-BR/terms/reseller/mca_br/ | publisher: Google for Education / Workspace | pub_date: unknown | accessed: 2026-10-31 | confidence: medium | class: channel
- claim: A trilha "Build" do Google for Education exige três integrações com Workspace for Education e/ou Classroom aprovadas pelo Google; oferece selo Google Partners, Partner Directory, sandbox e roadmaps sob NDA, suporte técnico e co-marketing/MDF "sujeito a disponibilidade"; inscrição via Partner Advantage escolhendo "Build" + "Google for Education". | source: https://edu.google.com/intl/ALL_br/resources/get-started/find-a-partner/become-a-partner/build/ | publisher: Google for Education | pub_date: unknown | accessed: 2026-10-31 | confidence: high | class: channel
- claim: Exemplos de parceiros Build: Screencastify, Classcraft, ManagedMethods — nenhum brasileiro; não há lista oficial atual de revendedores Google for Education no Brasil nos resultados. | source: idem ; https://www.baguete.com.br/noticias/ht-solutions-torna-se-parceira-do-google | publisher: Google / Baguete | pub_date: unknown | accessed: 2026-10-31 | confidence: medium | class: channel
- claim: Publicar no Google Workspace Marketplace exige OAuth verification para escopos sensíveis/restritos e security assessment adicional para escopos restritos; revisão da listagem "typically takes several days"; exige-se o menor conjunto de escopos possível. | source: https://developers.google.com/workspace/marketplace/about-app-review | publisher: Google Developers | pub_date: unknown | accessed: 2026-10-31 | confidence: high | class: marketplace
- claim: A doc oficial não informa custos do CASA nem regras de cobrança; para tiers pagos a listagem deve linkar página externa de preços — indicando cobrança fora do Marketplace. | source: idem | publisher: Google Developers | pub_date: unknown | accessed: 2026-10-31 | confidence: medium (inferência) | class: marketplace
- claim: Visibilidade de app é Pública ou Privada e a escolha é permanente; configuração define se todos os usuários ou só admins podem instalar; listagem exige site e logo próprios. | source: https://developers.google.com/workspace/marketplace/how-to-publish | publisher: Google Developers | pub_date: unknown | accessed: 2026-10-31 | confidence: high | class: marketplace
- claim: Admins do Workspace controlam add-ons via allowlist por OU/grupo; usuários perdem acesso quando o app sai da allowlist; alguns apps só podem ser instalados por administradores. | source: https://knowledge.workspace.google.com/admin/apps/manage-the-marketplace-app-allowlist-for-your-organization | publisher: Google Workspace Admin Help | pub_date: unknown | accessed: 2026-10-31 | confidence: high | class: platform-risk
- claim: Relatórios de originalidade do Classroom: gratuitos até 5 por turma no Fundamentals; ilimitados com comparação aluno-aluno nas licenças Teaching and Learning Upgrade e Education Plus. | source: https://edu.google.com/intl/en_ALL/products/originality/ | publisher: Google for Education | pub_date: unknown | accessed: 2026-10-31 | confidence: medium | class: platform-risk
- claim: Em janeiro de 2026 (Bett) o Google anunciou app Gemini dentro do Classroom; nenhuma fonte liga Gemini/originality reports a rastreamento de processo de escrita — risco de feature nativa concorrente direta não evidenciado. | source: https://www.educatorstechnology.com/2026/01/how-to-use-gemini-in-google-classroom.html | publisher: Educators Technology (terciário) | pub_date: 2026-01 | accessed: 2026-10-31 | confidence: low | class: platform-risk

### Preços de referência
- claim: UEM (PR) contratou Turnitin Feedback Studio "plano intermediário" anual por ~R$ 60 mil para 3 mil usuários (≈ R$ 20/usuário/ano), processo conduzido pela Biblioteca Central com gestão da PRPPG. | source: https://www.parana.pr.gov.br/aen/Noticia/UEM-investe-em-software-para-detectar-e-inibir-plagio-academico-nos-trabalhos | publisher: AEN Paraná | pub_date: 2024-06 | accessed: 2026-10-31 | confidence: high | class: pricing
- claim: UFGD prorrogou por 12 meses a licença Turnitin Similarity com reajuste de 6,24%, R$ 19.422,41/ano (aditivo 24/2022, 2023). | source: https://files.ufgd.edu.br/arquivos/arquivos/78/CONTRATOS-PRAD/Contratos%20Vigentes/Aditivo%20(24-2022)%201%20-%20licen%C3%A7a%20de%20software%20-%20TURNITIN.pdf | publisher: UFGD | pub_date: 2023 | accessed: 2026-10-31 | confidence: medium | class: pricing
- claim: UnB tem Contrato Turnitin nº 904/2025 (manual docente BCE 2025); UFFS contratou por inexigibilidade (SUCL 2022-0002) — via típica é inexigibilidade/fornecedor exclusivo. | source: https://repositorioadm.unb.br/wp-content/uploads/tainacan-items/12810/24500/Manual_-Docentes_Turnitin_2025_BCE_UnB-1.pdf ; https://site-antigo-2025.uffs.edu.br/atos-normativos/inexigibilidade-de-licitacao/sucl/2022-0002/@@download/anexo2 | publisher: UnB / UFFS | pub_date: 2025 / 2022 | accessed: 2026-10-31 | confidence: low | class: sales-cycle
- claim: Kami: Basic grátis; Pro US$ 12/mês ou US$ 85/ano; Work US$ 25/mês ou US$ 220/ano; Teacher US$ 149; School or District "custom" via cotação — sem venda institucional via Marketplace. | source: https://www.kamiapp.com/pricing/ | publisher: Kami | pub_date: 2026-10 | accessed: 2026-10-31 | confidence: high | class: pricing
- claim: Brisk Teaching não publica preço institucional ("custom, based on enrollment and number of accounts"); individual ~US$ 99,99/ano segundo agregadores. | source: https://www.briskteaching.com/schools-and-districts ; https://www.briskteaching.com/zh/plans | publisher: Brisk Teaching | pub_date: unknown | accessed: 2026-10-31 | confidence: medium | class: pricing

### Canais alternativos, associações e ciclo de vendas
- claim: O relatório 2024 da ABMES menciona o "ABMES Vitrine", plataforma que destaca IES associadas e parceiros estratégicos; não há tabela de patrocínio para edtechs encontrada. | source: https://abmes.org.br/public/arquivos/documentos/Relatorio-das-acoes-realizadas-em-2024.pdf | publisher: ABMES | pub_date: 2025 | accessed: 2026-10-31 | confidence: low | class: channel
- claim: O investimento em edtechs brasileiras caiu para US$ 33,8 mi em 2023, um terço de 2022. | source: https://startups.com.br/pesquisas/brasil-lidera-mercado-latam-de-edtechs-e-movimenta-us-475m-em-10-anos/ | publisher: Startups.com.br | pub_date: unknown | accessed: 2026-10-31 | confidence: medium | class: other
- claim: Nenhuma fonte com benchmarks de ciclo de vendas, CAC ou conversão piloto→contrato para edtechs B2B em IES brasileiras; só uma tese (Metodista) apontando distanciamento entre necessidades das IES e soluções das edtechs. | source: https://repositorio.metodista.br/handle/123456789/589 | publisher: Universidade Metodista de SP | pub_date: unknown | accessed: 2026-10-31 | confidence: low | class: sales-cycle

## Leads worth chasing
- CASA (App Defense Alliance) custos/tiers: decisivo porque escopos de Docs/Drive podem ser "restritos".
- Classroom add-ons: confirmar exigência de Teaching & Learning Upgrade / Education Plus do lado da instituição.
- "Admin install Marketplace apps for your organization" para instalação domain-wide por OU.
- Preços Revision History / Draftback para escolas (per-seat vs per-enrollment).
- Tabela de patrocínio Fórum Semesp / CBESP 2026.
- Preços Plataforma A/Sagah e proctoring em contratos públicos.
- Entrevistas de fundadores (Jacad, Lyceum/TOTVS, Layers, Árvore) sobre ciclo e sazonalidade.

## Looked for and could not find
- Custo, níveis e prazos do CASA em fonte primária.
- Confirmação explícita de que o Marketplace não processa pagamentos.
- Requisito de edição Workspace para Classroom add-ons (URLs 404).
- Lista atual de revendedores Google for Education no Brasil.
- Contrato Turnitin no PNCP com valor.
- Preços em BRL de proctoring e ARPU por aluno de software para IES.
- Benchmarks de ciclo de vendas, CAC, conversão piloto→contrato.
- Estudos de caso de GTM de edtechs brasileiras em IES.
- Anúncio do Google com rastreamento de processo de escrita.

## Queries run
1 about-app-review (ok); 2 classroom add-ons overview (404); 3 parceiros Google for Education Brasil; 4 Turnitin PNCP; 5 brisk pricing (404); 6 kami pricing (ok); 7 Gemini Classroom originality 2026; 8 ciclo de vendas edtech IES; 9 classroom add-ons (404); 10 security-assessment (sem CASA); 11 how-to-publish (ok); 12 support.google.com 6089179 (redirect); 13 Build partner (ok); 14 Brisk school license; 15 AEN UEM (ok); 16 Semesp ABMES patrocínio; 17 allowlist (ok).
