Visão Geral do Produto  
\- Nome: AbastecAI  
\- Resumo: App mobile que unifica numa única interface o mapa de postos de combustível com nota de idoneidade (baseada em dados públicos ANP) e pontos de recarga elétrica (Open Charge Map \+ integrações). Uso sem login para MVP, foco em velocidade, confiabilidade dos dados e experiência simples para motoristas de combustão, elétricos e em transição.  
\- Problema que resolve: Fragmentação de fontes de informação; falta de um único mapa que combine dados regulatórios de qualidade de combustível e infraestrutura de recarga elétrica com atualização automática.  
\- Proposta de valor: confiança (nota baseada em dados oficiais), simplicidade (sem login), cobertura dupla (combustível \+ elétrico) e experiência móvel otimizada para decisões rápidas no trânsito.  
\- Métricas de sucesso (exemplos iniciais): DAU/MAU, tempo médio no mapa até traçar rota, taxa de retenção 7/30 dias, cobertura de postos com nota ANP, número de pontos de recarga visíveis, latência média das buscas \<300 ms.

Requisitos Funcionais (MoSCoW)

Must (imprescindíveis no MVP)  
\- M1: Mapa único com pins diferenciados por tipo (posto vs recarga) e cor por nota (0–5) para postos.  
\- M2: Toggle no topo: Combustível / Elétrico / Ambos.  
\- M3: Busca por localização atual (GPS) e por cidade/nome de lugar.  
\- M4: Ficha de detalhe de posto (bottom sheet): nome, CNPJ, endereço, bandeira, distribuidora declarada, nota 0–5, resumo de histórico de fiscalização últimos 5 anos, botão traçar rota, link para denúncia ANP.  
\- M5: Ficha de detalhe do ponto de recarga (bottom sheet): operador/rede, tipo de conector, potência (kW), endereço, botão traçar rota.  
\- M6: Filtros básicos: nota mínima (combustível) e tipo de conector (elétrico).  
\- M7: Sincronização periódica (job diário) das fontes: API Revendedores ANP, dados abertos de fiscalização/PMQC ANP, Open Charge Map. Dados consumidos no app apenas do banco próprio (cache), não em tempo real das APIs externas.  
\- M8: Performance: respostas de busca e carregamento do mapa dentro de um padrão aceitável (p.ex. \<300 ms para consultas no backend).  
\- M9: Sem login obrigatório para uso básico; apenas opt-in para futuras features.  
\- M10: Implementação de PostGIS para consultas geoespaciais e indexação adequada.

Should (importantes, possivelmente no MVP estendido)  
\- S1: Clusterização de pins em níveis de zoom.  
\- S2: Indicação de distância e tempo aproximado até o posto/ponto de recarga a partir da localização do usuário.  
\- S3: Cache local de última consulta para uso em áreas com conexão instável.  
\- S4: Painel administrativo rudimentar para gerenciar patrocínios (modo básico mesmo que sem vendas ativas).  
\- S5: Mensagens de origem das fontes no rodapé da ficha (ex.: “Dados: ANP — última atualização: 2026-05-12”).

Could (desejáveis / pós-MVP)  
\- C1: Login opcional para favoritos e notificações.  
\- C2: Avaliações de usuários como camada complementar à nota ANP.  
\- C3: Destaque pago/patrocinado no mapa e nas listagens.  
\- C4: Preço de combustível colaborativo (reportado por usuários).  
\- C5: Integração direta com operadoras de recarga para status em tempo real.  
\- C6: Rotas otimizadas por custo (combustível vs elétrico).  
\- C7: Painel B2B com dados agregados.

Won’t (não incluso nesta versão)  
\- W1: Funções complexas de pagamento/checkout em postos.  
\- W2: Suporte nativo para veículos com telemetria via OBD (fora do escopo inicial).  
\- W3: Integração com sistemas bancários/afinidade de pagamento no MVP.

Histórias de Usuário (com critérios de aceitação)

1\) Usuário — Encontrar posto confiável  
\- Como motorista de carro flex, quero ver postos próximos classificados por nota ANP para escolher onde abastecer com menor risco.  
\- Critérios de aceitação:  
  \- No mapa, ao filtrar Combustível, aparecem apenas pins de postos com cores por nota.  
  \- Posso aplicar filtro de nota mínima (ex.: \>=3).  
  \- Ao tocar no pin, abre ficha com CNPJ, nota e resumo de fiscalizações.  
  \- Botão “Traçar rota” abre app de navegação padrão com destino preenchido.

2\) Usuário — Localizar ponto de recarga  
\- Como motorista de veículo elétrico, quero ver pontos de recarga próximos com tipo de conector e potência para planejar recarga.  
\- Critérios:  
  \- No modo Elétrico ou Ambos, pins de recarga aparecem com ícone de raio.  
  \- Filtro por tipo de conector funciona (ex.: CCS, CHAdeMO).  
  \- Ficha mostra potência em kW e operador.

3\) Usuário — Uso sem cadastro  
\- Como usuário casual, quero usar o app sem criar conta para minimizar fricção.  
\- Critérios:  
  \- A navegação do mapa, busca e visualização de fichas funcionam sem login.  
  \- A tentativa de favoritar ou ativar notificações solicita login/registro.

4\) Administrador (produto) — Atualização de dados diária  
\- Como administrador, quero que os dados ANP e Open Charge Map sejam sincronizados diariamente para manter a base atualizada.  
\- Critérios:  
  \- Job rodando cron diário, logs de execução e alertas em caso de falha.  
  \- Versão anterior dos dados mantida até sucesso do job (rollback/fallback).

Estrutura de Páginas / Telas (fluxo e componentes principais)  
\- Tela Principal (Mapa)  
  \- Topbar: logo pequeno, toggle (Combustível / Elétrico / Ambos), botão de filtros, botão de busca.  
  \- Mapa interativo (Mapbox) com pins e clusterização.  
  \- FAB (botão flutuante) “Minha localização” (centraliza GPS).  
  \- Bottom overlay: listagem rápida de resultados próximos (horizontal scroll) — cada card com nome, distância, nota/potência, botão ir.

\- Tela de Busca  
  \- Campo de busca com sugestões (autocompletar por cidade/nome de posto/ponto).  
  \- Resultados listados com distância.

\- Bottom Sheet — Ficha de Detalhe de Posto  
  \- Header: nome, bandeira, nota 0–5 (big), distância.  
  \- Corpo: endereço, CNPJ, distribuidora real, resumo fiscalizações (últimos 5 anos, principais eventos), botão traçar rota, link denúncia ANP, botão compartilhar.  
  \- Ações secundárias: favoritar (desabilitado sem login), reportar preço (future).

\- Bottom Sheet — Ficha de Ponto de Recarga  
  \- Header: operador, ícone de conector, potência (kW), distância.  
  \- Corpo: endereço, tipo de conector(s), status (se disponível), botão traçar rota, compartilhar.

\- Tela de Filtros (modal)  
  \- Combustível: nota mínima slider (0–5), bandeira (checkbox).  
  \- Elétrico: tipo(s) de conector (checkbox), potência mínima.  
  \- Botões: Aplicar / Limpar.

\- Tela de Configurações (leve)  
  \- Preferências (unidades, modo escuro automático), créditos das fontes, política de privacidade / LGPD.

\- Painel Admin (futuro)  
  \- Upload/gestão de patrocinados, logs de ingestão, dashboards de uso.

Design e Interações

Visual e identidade  
\- Tema padrão: dark mode.  
\- Paleta:  
  \- Base escura (grafite a preto) para fundo do mapa/áreas UI.  
  \- Acento Combustível: tom quente (âmbar/laranja).  
  \- Acento Elétrico: tom frio (ciano/verde-azulado).  
  \- Gradiente nota: vermelho (0) → amarelo (2–3) → verde (5) para os pins de nota.  
\- Tipografia:  
  \- Fonte legível para corpo; fonte condensada para números (nota, distância, kW).  
\- Ícones: traço fino, consistentes, com variação de cor por contexto.

Interações de mapa e UX  
\- Toggle visível no topo para troca imediata de contexto; animação sutil ao alternar cores do UI.  
\- Pins interativos: toque abre bottom sheet com transição deslizante.  
\- Clusterização: ao agrupar pins, badge mostra quantidade; tocar cluster dá zoom automático.  
\- Bottom sheet: suporta pull-down para fechar; scroll interno se conteúdo extenso.  
\- Performance: pré-carregamento das tiles e cache de última busca; carregamento progressivo de pins por bounding box.  
\- Feedbacks: loaders minimalistas ao atualizar dados, toast para falhas de sincronização.

Considerações Técnicas

Arquitetura e stack recomendados  
\- Mobile: React Native (Expo) — builds iOS/Android.  
\- Backend: Supabase (Postgres gerenciado) com extensão PostGIS para geoespatial.  
\- Map: Mapbox SDK (permite custom styling e dark theme).  
\- Jobs de sincronização: Supabase Edge Functions agendadas (cron diário).  
\- Painel administrativo: Next.js (Vercel) planejado para fases seguintes.  
\- Observability: Sentry (erros), Prometheus/Logtail (logs), Alertas via Slack/email.

Modelos de dados e integrações  
\- Tabela postes\_postos:  
  \- id, cnpj, nome, bandeira, distribuidora, geom (geometry POINT, SRID 4326), nota\_anp (numeric), dt\_atualizacao, resumo\_fiscalizacao (jsonb), dados\_brutos (jsonb).  
\- Tabela recarga\_pontos:  
  \- id, uuid\_openchargemap, operador, endereços, conectores (jsonb), potencia\_kw, geom, dt\_atualizacao, status (nullable), dados\_brutos.  
\- Índices: GiST/GIN em geom para consultas por raio; índices em cnpj, dt\_atualizacao.  
\- ETL:  
  \- Pipeline: consumir APIs externas via Edge Function \-\> normalizar \-\> validar (checagens de consistência, geocoding fallback se necessário) \-\> inserir/atualizar banco.  
  \- Manter camada de auditoria: timestamp, número de registros, hash da fonte.  
  \- Fallback: manter cópia anterior dos dados até ETL ser concluído com sucesso (atomicidade via transações).  
\- Caching:  
  \- Cache de nível DB para queries frequentes; cache HTTP/Redis para endpoints que servem lista/mapa.  
  \- Cache no app (AsyncStorage/SQLite) para última view.  
\- Segurança e compliance:  
  \- Uso mínimo de PII (CNPJ e dados públicos). Mesmo assim, preparar política LGPD: tratar dados pessoais apenas quando houver login; registrar base legal (consentimento) para futuras features.  
  \- Armazenamento seguro de chaves (Mapbox, Open Charge Map) em backend; não embutir em cliente.  
  \- Rate limits e retry expondo circuit breaker no job.  
\- Dependências de terceiros e riscos:  
  \- Confirmar requisitos de autenticação/token da API Revendedores ANP antes do desenvolvimento do ETL.  
  \- Verificar cobertura do Open Charge Map e termos de uso/licença.  
\- Testes e QA:  
  \- Testes automatizados: unitários (JS/TS), integração do ETL, testes E2E do app com Detox/Appium.  
  \- Testes geoespaciais: validar que queries por raio retornam corretos em bordas (equador, ferrovias, estradas).

Roadmap (Fases)

Fase 1 — MVP (8–12 semanas)  
Objetivo: lançar versão pública core com mapa, dados ANP e Open Charge Map, experiência sem login.  
Entregáveis:  
\- Mapa principal com toggle (Combustível/Elétrico/Ambos) e pins.  
\- Busca por GPS e por cidade/nome.  
\- Fichas de detalhe de posto e ponto de recarga (bottom sheets).  
\- Filtros básicos (nota mínima, tipo de conector).  
\- Backend: Supabase/PostGIS, ETL diário para ANP e Open Charge Map (Edge Function).  
\- Infra de observability básica e logs; testes básicos E2E.  
\- Design: dark theme, paleta dual, assets de icons.  
KPIs iniciais:  
\- Tempo de carregamento do mapa \<1s em 4G; latência backend \<300 ms.  
\- Cobertura: \>80% dos postos das capitais com dados ANP disponíveis; presença mínima de pontos de recarga em capitais/rodovias.  
Riscos mitigados:  
\- Validar token/limitação da API ANP antes de começar ETL.  
\- Implementar fallback local caso Open Charge Map não cubra região.

Fase 2 — Crescimento e engajamento (12–20 semanas)  
Objetivo: aumentar retenção e preparar monetização leve.  
Entregáveis:  
\- Login opcional (email/social), favoritos e histórico.  
\- Avaliações/feedbacks de usuários (como camada complementar; cada avaliação marcada como “usuário reportado”).  
\- Notificações push (favoritos, alertas).  
\- Painel administrativo básico para gestão de patrocinados e revisão de reports.  
\- Implementação de patrocinados (visualização e regras de exibição no mapa/lista) como MVP comercial.  
\- Melhorias de performance (caching adicional, otimização de queries).  
KPIs:  
\- Taxa de conversão para login (semmandatory) 10% dos usuários ativos.  
\- Crescimento de MAU conforme estratégia ASO/parcerias.  
Riscos mitigados:  
\- Processo de moderação para evitar abuso em avaliações; políticas claras.

Fase 3 — Escala e B2B (16–24 semanas)  
Objetivo: ampliar valor comercial e recursos avançados.  
Entregáveis:  
\- Integração direta com operadoras de recarga para status em tempo real (parcerias).  
\- Preço colaborativo de combustível (reportes dos usuários \+ validação heurística).  
\- Rotas otimizadas por custo (algoritmo que compara custo estimado de combustão vs elétrico para trajeto).  
\- Painel B2B com dados agregados/anonimizados para redes e montadoras (contrato comercial).  
\- Plano freemium: assinatura para recursos avançados (alertas, rotas por custo, favoritos ilimitados).  
\- Rede de anúncios leve e controle de qualidade do patrocinado.  
KPIs:  
\- Receita MRR inicial (meta conservadora) via patrocinados e assinaturas.  
\- SLA de disponibilidade \>99% para endpoints críticos.  
Riscos:  
\- Necessidade de volume de usuários para tornar patrocinados atrativos; executar growth hacks e parcerias.  
\- Questões contratuais e de privacidade para venda de dados — preparar termos e compliance.

Considerações finais operacionais (sem conclusão)  
\- Equipe inicial recomendada: 1 PM/PO, 1-2 devs fullstack (React Native \+ backend Supabase/Edge Functions), 1 engenheiro de dados/infra para ETL/PostGIS, 1 designer UI/UX, 1 QA; possibilidade de contratar outsourcer para integrações (Mapbox).  
\- Planejar comunicação clara nas stores: “Dados públicos da ANP e Open Charge Map — uso sem login” para reduzir dúvidas sobre autoridade e origem das informações.  
\- Checklist pré-lançamento: confirmar política de uso das APIs externas; validar token ANP; revisar LGPD; testes de performance em áreas reais (rodovias, capitais).  
\- Plano de monitoramento pós-lançamento: alertas para falha de ETL, monitoramento de latência do mapa e taxas de erro do app; rotinas de suporte para denúncias e correção de dados críticos.  
