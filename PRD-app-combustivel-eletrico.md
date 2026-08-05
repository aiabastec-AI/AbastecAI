# PRD — AbastecAI
**App de Postos de Combustível + Pontos de Recarga Elétrica**
**Versão:** 1.0 · MVP

---

## 1. Visão Geral

App mobile que unifica em um único mapa duas buscas que hoje o motorista faz separadamente:

1. **Combustível** — localização de postos + nota de qualidade/idoneidade (baseada em dados públicos da ANP: fiscalização, PMQC, origem do combustível)
2. **Recarga elétrica** — localização de eletropostos, tipo de conector, status (quando disponível via API do operador)

**Problema que resolve:** o motorista de carro flex/combustão consulta preço no app A e reputação em outro lugar (ou não consulta); o motorista de EV usa o app da montadora ou o Google, sem cruzar com contexto de qualidade regulatória. Não existe hoje um app brasileiro que trate os dois mundos (transição energética) na mesma interface.

**Diferencial competitivo:** nota de idoneidade pública (dado que a ANP tornou público em jul/2026) + cobertura dupla combustível/elétrico num único app, mobile-first, rápido.

---

## 2. Objetivos

| Objetivo | Métrica de sucesso (6 meses pós-lançamento) |
|---|---|
| Validar demanda | 5.000 downloads orgânicos |
| Engajamento | 30% de usuários fazem ≥2 buscas/semana |
| Monetização inicial | 3 parcerias pagas com postos/redes de recarga |
| Qualidade de dados | 95% dos postos com nota ANP sincronizada e atualizada em ≤7 dias |

---

## 3. Público-alvo

- **Persona 1 — Motorista combustão/flex urbano:** quer economizar e não ser enganado (preço abusivo, combustível adulterado). Idade 25-55, classes B/C.
- **Persona 2 — Motorista EV early adopter:** já sofre com ansiedade de autonomia, quer confiabilidade de onde carregar. Classe A/B, alta familiaridade com apps.
- **Persona 3 — Motorista híbrido/em transição:** tem carro a combustão mas está pesquisando EV — o app "educa" essa transição ao mostrar as duas camadas juntas.

---

## 4. Escopo

### MVP (fase 1)
- Mapa único com toggle: Combustível / Elétrico / Ambos
- Busca por localização atual ou por cidade
- Ficha do posto: nota ANP, CNPJ, distribuidora, endereço, histórico resumido de fiscalização
- Ficha do ponto de recarga: operador, tipo de conector, potência, endereço (via Open Charge Map)
- Sem login
- Sem preço de combustível (a ANP não disponibiliza preço em tempo real por posto; ficar de fora do MVP evita dado errado)

### Fase 2
- Login opcional (favoritos, notificações)
- Avaliações próprias dos usuários (camada adicional à nota oficial da ANP)
- Espaço de destaque "patrocinado" no mapa/lista
- Status em tempo real de recarga (via API de redes parceiras, se conveniado)

### Fase 3
- Preço colaborativo de combustível (usuários reportam, tipo Waze)
- Rotas otimizadas por menor custo total (combustível vs. elétrico)
- Programa de parceria B2B com redes de postos e montadoras (dado agregado anonimizado)

### Fora de escopo (por ora)
- Pagamento dentro do app
- Reserva de vaga de recarga
- Integração direta com o carro (telemetria)

---

## 5. Funcionalidades detalhadas (MVP)

### 5.1 Onboarding
- Pedido de permissão de localização (com fallback: digitar cidade)
- Sem cadastro — direto pro mapa

### 5.2 Mapa principal
- Pin colorido por nota ANP (vermelho → verde), igual ao próprio app oficial, para familiaridade
- Pin distinto (ícone de raio) para pontos de recarga
- Toggle superior: [Combustível] [Elétrico] [Ambos]
- Cluster de pins quando zoom out

### 5.3 Ficha do posto (combustível)
- Nome, endereço, CNPJ, bandeira/distribuidora
- Nota 0–5 (espelhando metodologia ANP)
- Origem do combustível (distribuidora real vs. bandeira exibida)
- Histórico de autuações (resumo, últimos 5 anos)
- Botão "Traçar rota"
- Botão "Denunciar" → linka pro canal oficial da ANP (não reinventar o fluxo de denúncia)

### 5.4 Ficha do ponto de recarga
- Operador/rede
- Tipo de conector (Tipo 2, CCS, CHAdeMO)
- Potência (kW)
- Status (se disponível via API do parceiro; senão, omitir campo em vez de mostrar errado)
- Botão "Traçar rota"

### 5.5 Busca e filtros
- Buscar por cidade
- Filtro por nota mínima (combustível)
- Filtro por tipo de conector (elétrico)

---

## 6. Stack Técnica

### Mobile
- **React Native (Expo)** — recomendado por: 1 codebase iOS/Android, comunidade grande, deploy rápido, fácil achar dev BR. Alternativa: Flutter (também válido, escolha por preferência de time).

### Backend / Banco
- **Supabase (free tier no MVP)**
 - Postgres + **PostGIS** (extensão geoespacial — habilitar no Supabase, já vem disponível)
 - Auth do Supabase pronta para quando entrar login (fase 2)
 - Edge Functions para os jobs de sincronização periódica

### Fontes de dados (jobs agendados, não em tempo real)
- **API Revendedores da ANP** → dados cadastrais + georreferenciados dos postos
- **Dados abertos ANP** (fiscalização/PMQC) → cálculo da nota
- **Open Charge Map API** (gratuita) → pontos de recarga
- Job roda 1x/dia (cron via Supabase Edge Function ou GitHub Actions) e faz upsert no banco

### Mapa
- **Mapbox** (tema customizável, melhor para dark mode/design autoral) ou Google Maps SDK (mais familiar, mas customização visual mais limitada). Recomendo Mapbox pelo controle de estilo visto o direcionamento de design abaixo.

### Infra / Deploy
- App: build via Expo EAS → lojas
- Painel admin (gestão de parcerias/patrocínio, fase 2): Next.js na Vercel
- Monitoramento: Supabase logs + Sentry (free tier) para crash report

---

## 7. Schema do Banco de Dados (PostgreSQL + PostGIS)

```sql
-- Habilitar extensão geoespacial
create extension if not exists postgis;

-- ========== COMBUSTÍVEL ==========

create table postos (
  id uuid primary key default gen_random_uuid(),
  cnpj text unique not null,
  razao_social text not null,
  nome_fantasia text,
  bandeira text,               -- marca comercial exibida
  distribuidora_atual text,    -- origem real do combustível (últimos 6 meses)
  endereco text,
  cidade text,
  uf text,
  localizacao geography(Point, 4326) not null,
  situacao_cadastral text,     -- ativo, suspenso, cancelado
  data_autorizacao date,
  nota_anp numeric(2,1),       -- 0.0 a 5.0
  ultima_sincronizacao timestamptz default now(),
  patrocinado boolean default false,   -- reservado p/ monetização futura
  created_at timestamptz default now()
);

create index idx_postos_localizacao on postos using gist (localizacao);
create index idx_postos_cidade on postos (cidade, uf);

create table fiscalizacoes (
  id uuid primary key default gen_random_uuid(),
  posto_id uuid references postos(id) on delete cascade,
  tipo text,                   -- qualidade_combustivel, quantidade_bomba, preco_abusivo
  resultado text,               -- conforme, nao_conforme
  data_fiscalizacao date,
  peso_na_nota numeric(3,2),   -- conforme metodologia ANP (mais recente = mais peso)
  descricao text,
  created_at timestamptz default now()
);

create index idx_fiscalizacoes_posto on fiscalizacoes (posto_id);

-- ========== RECARGA ELÉTRICA ==========

create table redes_recarga (
  id uuid primary key default gen_random_uuid(),
  nome text not null,          -- EVIO, Zletric, Shell Recharge etc.
  api_disponivel boolean default false,
  website text
);

create table pontos_recarga (
  id uuid primary key default gen_random_uuid(),
  rede_id uuid references redes_recarga(id),
  nome text,
  endereco text,
  cidade text,
  uf text,
  localizacao geography(Point, 4326) not null,
  tipo_conector text[],        -- ['Tipo 2', 'CCS', 'CHAdeMO']
  potencia_kw numeric(6,2),
  status text,                 -- disponivel, ocupado, offline, desconhecido
  fonte text,                  -- 'open_charge_map' ou nome da API parceira
  ocm_id text,                 -- id externo no Open Charge Map, p/ deduplicação
  patrocinado boolean default false,
  ultima_sincronizacao timestamptz default now(),
  created_at timestamptz default now()
);

create index idx_recarga_localizacao on pontos_recarga using gist (localizacao);
create index idx_recarga_cidade on pontos_recarga (cidade, uf);

-- ========== USUÁRIOS (fase 2, deixar modelado desde já) ==========

create table usuarios (
  id uuid primary key default gen_random_uuid(),
  auth_id uuid references auth.users(id),  -- integração com Supabase Auth
  nome text,
  created_at timestamptz default now()
);

create table favoritos (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid references usuarios(id) on delete cascade,
  posto_id uuid references postos(id),
  ponto_recarga_id uuid references pontos_recarga(id),
  created_at timestamptz default now(),
  check (posto_id is not null or ponto_recarga_id is not null)
);

create table avaliacoes_usuario (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid references usuarios(id) on delete cascade,
  posto_id uuid references postos(id),
  ponto_recarga_id uuid references pontos_recarga(id),
  nota integer check (nota between 1 and 5),
  comentario text,
  created_at timestamptz default now()
);

-- ========== MONETIZAÇÃO (fase 2/3, reservado) ==========

create table patrocinios (
  id uuid primary key default gen_random_uuid(),
  posto_id uuid references postos(id),
  ponto_recarga_id uuid references pontos_recarga(id),
  empresa_contratante text,
  data_inicio date,
  data_fim date,
  valor_mensal numeric(10,2),
  ativo boolean default true
);
```

**Exemplo de query geoespacial (postos num raio de 5km):**
```sql
select nome_fantasia, nota_anp,
  ST_Distance(localizacao, ST_MakePoint(:lng, :lat)::geography) as distancia_m
from postos
where ST_DWithin(localizacao, ST_MakePoint(:lng, :lat)::geography, 5000)
order by distancia_m
limit 50;
```

---

## 8. Design — Direcionamento Visual

### Referências analisadas

**GWM (app do carro, ex: Ora 03/Haval)** — força: linguagem "automotive-tech": dark mode como padrão, cards com cantos levemente arredondados, tipografia condensada/técnica, acentos em azul/ciano ou laranja neon, ícones minimalistas de traço fino, muita ênfase em dado numérico grande (%, km, kW) como elemento visual central.

**Ipiranga (app Km de Vantagens / posto)** — força: paleta quente vermelho/amarelo, alto contraste, linguagem mais "popular"/calorosa, botões grandes e arredondados, foco em conveniência do dia a dia (cupom, desconto).

**Outras referências que valem puxar:**
- **Tesla app** — dark mode extremo, tipografia grande e limpa, uso de branco/cinza sobre preto puro, animações sutis de transição — ótimo para a camada "elétrico"
- **PlugShare / A Better Route Planner** — referência direta de categoria (recarga), útil para padrões de UX já validados (filtro de conector, indicador de disponibilidade)
- **iFood / 99** — referência brasileira de app de geolocalização com altíssima usabilidade em rede 4G instável e baixo custo cognitivo — vale copiar os padrões de loading/skeleton e busca

### Direção recomendada para o app

Dado que o app vive entre dois mundos (combustão tradicional + elétrico moderno), a saída elegante é **um único design system neutro e "tech", que muda sutilmente de acento de cor conforme o modo selecionado** — em vez de tentar imitar Ipiranga (quente/popular) OU GWM (frio/tech) o tempo todo.

**Paleta:**
- Base: Dark mode como padrão (`#0D0F12` fundo, `#171A1F` cards) — remete ao GWM/Tesla, transmite "tecnologia confiável"
- Acento modo Combustível: laranja/âmbar `#FF7A1A` (herda calor do universo Ipiranga sem copiar a marca)
- Acento modo Elétrico: ciano/verde-azulado `#2FD9C4` (remete a energia limpa, comum em toda a categoria EV)
- Nota 0-5: manter o gradiente vermelho→verde igual ao app da ANP (não reinventar — o usuário já associa essa cor a "qualidade do posto")

**Tipografia:**
- Display/números grandes: uma fonte condensada tipo **Space Grotesk** ou **Inter Tight** — números de nota, kW, distância ganham destaque visual, como no cluster digital de um carro
- Corpo: **Inter** (legibilidade alta em telas pequenas, gratuita, ótima em português)

**Componentes-chave:**
- Cards com cantos arredondados médios (12-16px) — não totalmente quadrado (frio demais) nem muito arredondado (infantil demais)
- Toggle Combustível/Elétrico como pill switch no topo, com a cor de acento mudando ao trocar — é o momento de maior identidade visual do app
- Pins do mapa com glow sutil na cor de acento (efeito leve de neon, sem exagerar) — reforça sensação "tech" do GWM/Tesla
- Bottom sheet (ficha do posto/ponto) puxando de baixo pra cima, com blur no fundo — padrão iOS/Material moderno, familiar pro usuário BR de iFood/99

**Ícones:** traço fino (outline), não preenchido — reforça o lado "tech" e combina com dark mode.

---

## 9. Monetização (recapitulando decisões já discutidas)

1. Destaque patrocinado no mapa/lista (postos e redes de recarga pagam)
2. Ads leves (fase 2, se necessário complementar receita)
3. Freemium (favoritos ilimitados, alertas, rotas por custo — fase 3)
4. Dados agregados anonimizados B2B (fase 3, após volume)
5. Afiliados (cartão combustível, seguro auto)

---

## 10. Riscos e Mitigações

| Risco | Mitigação |
|---|---|
| API da ANP mudar formato/ficar instável | Job de sync desacoplado, com fallback pros dados abertos em CSV/JSON do portal |
| Open Charge Map ter cobertura fraca no Brasil | Complementar manualmente pontos de recarga críticos no lançamento; abrir depois para sugestão da comunidade |
| Confusão de marca com o app oficial da ANP | Deixar claro no onboarding/sobre que os dados são públicos e oficiais, mas o app é independente |
| Baixo volume inicial pra negociar patrocínio | Focar em crescimento orgânico via ASO + parcerias com influenciadores de carro elétrico antes de vender mídia |

---

## 11. Próximos passos sugeridos

1. Validar tecnicamente o acesso à API Revendedores da ANP (cadastro/token, se exigir)
2. Prototipar o job de sincronização (ANP + Open Charge Map → Supabase)
3. Criar protótipo navegável (Figma ou direto em React Native) do mapa + ficha, já na direção visual acima
4. Desenvolver identidade de marca do AbastecAI (logo, ícone de app, paleta aplicada)
5. Rodar teste fechado com 20-30 usuários (grupo de motoristas EV + grupo tradicional) antes do lançamento público
