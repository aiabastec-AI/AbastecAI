# Arquitetura e Decisões Técnicas — AbastecAI

Este documento existe pra registrar **o que foi decidido, por quê, e o que falta** — tanto pra quem for programar quanto pra qualquer sessão de IA que continue o projeto depois. Baseado nos dois PRDs (`PRD  AbastecAI.md` e `PRD-app-combustivel-eletrico.md`), que convergem no mesmo stack.

Última atualização: 2026-08-06.

---

## 1. Stack decidida

| Camada | Escolha | Justificativa |
|---|---|---|
| Mobile | **React Native + Expo** | 1 codebase iOS/Android, build via EAS, comunidade grande, recomendado nos dois PRDs. |
| Backend/DB | **Supabase (Postgres) + PostGIS** | Geolocalização nativa (raio, distância), Auth pronta pra fase 2, Edge Functions pros jobs. Projeto dedicado ao AbastecAI (ver `.env.local`). |
| Mapa | **Mapbox** | Dark mode customizável com controle total de estilo (glow nos pins, paleta própria) — Google Maps SDK é mais limitado nisso. Tier gratuito cobre bem o MVP (~50k MAU grátis nos SDKs mobile). |
| Painel admin | **Next.js na Vercel** — **fase 2, não no MVP** | Desacoplado do app mobile; só compartilha o banco Supabase. Projeto Vercel já reservado (ver `.env.local` / `.vercel/project.json`), fica parado sem custo até chegar a hora. |
| Observability | Sentry (erros) + logs do Supabase | Free tier suficiente pro MVP. |
| Jobs de sincronização | Supabase Edge Functions, cron 1x/dia | Consome API Revendedores ANP + dados de fiscalização/PMQC + Open Charge Map. App nunca chama essas APIs externas direto — só lê do banco (cache). |

## 2. Por que monorepo (1 repo só)

Só faria sentido separar em repos diferentes se times diferentes cuidassem de cada parte, ou se as release cadences fossem realmente independentes. Não é o caso aqui — é mais simples manter tudo junto e compartilhar o schema do banco num lugar só.

## 3. Estrutura de pastas (planejada)

```
AbastecAI/
├── app/            ← app Expo (React Native). É o MVP, começa por aqui.
├── admin/          ← painel Next.js. Pasta reservada, vazia até a fase 2.
├── supabase/       ← migrations SQL + Edge Functions dos jobs de sync (ANP, Open Charge Map)
├── ARQUITETURA.md  ← este arquivo
├── PRD  AbastecAI.md
├── PRD-app-combustivel-eletrico.md
├── .env.local      ← credenciais locais (Supabase, Vercel, Mapbox) — nunca commitado
├── .gitignore
└── .vercel/project.json
```

`app/` e `admin/` são apps independentes, cada um com seu próprio `package.json` — não precisa de workspace tooling (pnpm/turborepo) enquanto só existir o `app/`. Se algum dia os dois precisarem compartilhar código (ex.: tipos do banco), aí sim vale revisitar.

## 4. Fases do projeto

- **Fase 1 (MVP — agora)**: só `app/` (Expo). Mapa, fichas de posto/recarga, sem login. Ver seção 4-5 do `PRD-app-combustivel-eletrico.md`.
- **Fase 2**: `admin/` (Next.js) entra em cena — login opcional, patrocínios, avaliações. Schema do banco já tem essas tabelas modeladas desde a fase 1 (`usuarios`, `favoritos`, `avaliacoes_usuario`, `patrocinios`).
- **Fase 3**: preço colaborativo, rotas por custo, B2B — sem stack nova, é sobre as mesmas camadas.

## 5. Credenciais e onde vivem

Nenhuma chave real fica neste arquivo nem em código commitado. Tudo em `.env.local` na raiz (git-ignored) — **fonte única**, o `app/` nunca tem seu próprio `.env`:

- `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY` — projeto Supabase dedicado ao AbastecAI (`qefkolxhktkzryzcvnfq`). **A `SECRET_KEY` nunca deve ir pro app mobile** — só serve pra Edge Functions/backend, que rodam fora do bundle do cliente.
- `VERCEL_PROJECT_ID`, `VERCEL_ORG_ID` — projeto Vercel dedicado, reservado pra quando `admin/` existir
- `MAPBOX_ACCESS_TOKEN` (`pk.…`, público, seguro no cliente) e `RNMAPBOX_MAPS_DOWNLOAD_TOKEN` (`sk.…`, secreto, só usado em build) — conta dedicada ao AbastecAI

`app/app.config.js` é uma **config dinâmica** (não `app.json` estático): ele faz `dotenv.config()` apontando pro `.env.local` da raiz, e separa os dois mundos:
- **Client-safe** (`extra` do Expo config → lido em runtime via `expo-constants`): `supabaseUrl`, `supabasePublishableKey`, `mapboxAccessToken`.
- **Build-only** (nunca embutido no bundle JS): `RNMAPBOX_MAPS_DOWNLOAD_TOKEN` é lido direto de `process.env` pelo plugin nativo do `@rnmapbox/maps` durante o build/prebuild — **não** passar via opção do plugin (`RNMapboxMapsDownloadToken` está deprecado e gravaria o valor em `gradle.properties`, mais exposto do que precisa).

## 6. Estado do scaffold (`app/`)

Criado em 2026-08-06 com `create-expo-app` (template `blank-typescript`, SDK 57). O que já existe:

- `App.tsx` — tela placeholder com tema dark (`#0D0F12`) e indicador visual de que Supabase/Mapbox carregaram a config corretamente (sem mostrar segredo nenhum na tela).
- `app.config.js` — config dinâmica descrita na seção 5.
- `src/lib/supabase.ts` — client do Supabase (`persistSession: false`, porque o MVP não tem login; trocar por storage adapter tipo `@react-native-async-storage/async-storage` quando a fase 2/login chegar).
- Dependências instaladas: `@supabase/supabase-js`, `@rnmapbox/maps`, `expo-constants`, `expo-dev-client`, `react-dom` + `react-native-web` (pra rodar no navegador durante o dev).
- Validado: `npx expo config --json` resolve as env vars corretamente; `expo start --web` compila e serve o bundle sem erro; **confirmado visualmente pelo usuário no navegador** em 2026-08-06 (tela dark, título "AbastecAI", indicadores ✓ Supabase / ✓ Mapbox).
- `supabase/migrations/20260806120000_initial_schema.sql` — schema completo do PRD (postos, fiscalizações, redes/pontos de recarga, usuários, favoritos, avaliações, patrocínios) + RLS em todas as tabelas (o PRD não especificava isso; sem RLS a chave `publishable` teria acesso total de leitura/escrita no banco).

### Pendências em aberto

- [ ] **Migration SQL ainda não foi aplicada no projeto Supabase real** (`qefkolxhktkzryzcvnfq`) — o MCP conectado não tem acesso a esse projeto (conta diferente da pessoal), então precisa ser rodada manualmente pelo usuário no SQL Editor do dashboard, colando o conteúdo do arquivo de migration.
- [ ] **Mapa ainda não renderiza de verdade.** `@rnmapbox/maps` tem código nativo — não roda no app Expo Go, e a versão web (`expo start --web`, já validada) não suporta essa lib. Pra testar o `MapView` de verdade, falta gerar um **dev client** (`npx expo prebuild` + `npx expo run:android`, ou build via EAS) — isso exige Android Studio/SDK instalado localmente (ainda não instalado nessa máquina — sem `ANDROID_HOME`/`adb`) ou build na nuvem via EAS (exige `eas login`). Decisão adiada pelo usuário em 2026-08-06; por ora seguimos sem o mapa nativo.
- [ ] Navegação entre telas (mapa, busca, ficha de posto/recarga, filtros — ver seção "Estrutura de Páginas" do PRD) ainda não existe; só tem a tela placeholder única.
- [ ] `admin/` (Next.js) — fase 2, não é prioridade agora.
