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

- [x] **Migration SQL aplicada no projeto real** (`qefkolxhktkzryzcvnfq`) em 2026-08-06 — confirmado via query: 8 tabelas criadas, todas com RLS ativo. Como o MCP conectado não tem acesso a esse projeto (conta diferente da pessoal), foi aplicada diretamente via **Supabase Management API** (`POST /v1/projects/{ref}/database/query`), usando um Personal Access Token da conta aiabastec-AI (`SUPABASE_ACCESS_TOKEN` no `.env.local`, escopo: conta inteira, não só este projeto). Esse token fica guardado pra aplicar migrations futuras sem precisar pedir de novo — é assim que devo rodar SQL nesse projeto daqui pra frente, nunca pedindo pro usuário rodar manualmente.
- [x] **Dev client nativo — confirmado funcionando de ponta a ponta** em 2026-08-06 (usuário viu a tela do AbastecAI rodando no emulador). Ver seção 7 abaixo pro procedimento completo.
- [x] Navegação entre telas — implementada via `expo-router` em 2026-08-06: mapa (`app/index.tsx`), busca, filtros, config, ficha de posto (`posto/[id]`) e ficha de recarga (`recarga/[id]`). Todas ainda consultam **dados mockados hardcoded** nos próprios arquivos, não o Supabase — é o próximo passo depois que a ingestão de dados estiver rodando de verdade.
- [x] **Edge Function `sync-anp` — primeira sincronização real rodando** (ver seção 8). Cadastro de postos (nome, CNPJ, endereço, localização, distribuidora) via API Revendedores da ANP. Nota ANP (0-5) e histórico de fiscalização ainda **não** entram nessa função — não existe API pública pra isso (só CSV de fiscalização/PMQC, sem metodologia de cálculo documentada; a nota só existe dentro do app oficial "ANP com Vc – Postos", lançado em jul/2026). Fica como pendência separada.
- [x] **Edge Function `sync-ocm` — primeira sincronização real rodando** em 2026-08-07 (ver seção 8). 1.607 pontos de recarga em todo o Brasil, 39 operadores.
- [x] Telas do app conectadas aos dados reais do Supabase (2026-08-07) — mapa, ficha de posto e ficha de recarga.
- [x] Cron diário rodando `sync-anp` e `sync-ocm` automaticamente (2026-08-07, ver seção 10).
- [x] Filtros (nota mínima / tipo de conector) aplicados de ponta a ponta (2026-08-06): a tela `filtros.tsx` e o `FiltrosContext` já existiam, e a RPC (`postos_proximos`/`pontos_recarga_proximos`, migration `20260807130000_filtros_geo_rpc.sql`) já aceitava os parâmetros, mas `src/lib/postos.ts`/`recarga.ts` não os repassavam e `app/index.tsx` não lia o contexto — faltava só essa ligação. Agora `app/index.tsx` lê `useFiltros()` e recarrega os pontos (usando o último centro consultado, sem mover o mapa) toda vez que o filtro muda.
- [x] Busca por nome/cidade (2026-08-06) — `busca.tsx` era só a interface (input sem lógica). Agora `buscarPostosPorTexto`/`buscarPontosRecargaPorTexto` (`src/lib/postos.ts`/`recarga.ts`) fazem `ilike` em nome/razão social/cidade, com debounce de 350ms e mínimo de 2 caracteres na tela. Resultado é uma lista combinada (combustível + elétrico) que navega direto pra `posto/[id]`/`recarga/[id]` ao tocar — o helper `termoParaIlike` (`src/lib/textoBusca.ts`) sanitiza o termo digitado pra não quebrar a sintaxe do `.or()` do PostgREST.
- [x] Normalizar o campo `uf` de `pontos_recarga` (2026-08-08) — levantamento real (`select distinct uf, count(*) from pontos_recarga`) mostrou que a Open Charge Map devolve muito mais sujeira do que só "nome completo vs. sigla": maiúsculas/minúsculas misturadas, acento faltando, espaços sobrando, nome em inglês ("Federal District"), nome de região metropolitana ("Região Metropolitana de Campina Grande"), formato "cidade - UF"/"cidade/UF", e até nome de cidade sozinho sem nenhuma sigla junto ("Camocim", "brasileia") — 90 valores distintos sujos no total, cobrindo os 807 registros não-nulos existentes. A função `normalizarUf` em `supabase/functions/sync-ocm/index.ts` resolve isso na origem: extrai sigla de sufixo tipo "- BA"/"/PI", aceita sigla de 2 letras já limpa, e senão casa por palavra-chave (removendo acento, lowercase, checando as pistas mais longas primeiro pra "mato grosso do sul" não cair em "mato grosso") — testada contra os 90 casos reais antes do deploy. A migration `20260808090000_normalizar_uf_pontos_recarga.sql` corrigiu os registros já gravados (mapeamento explícito dos mesmos 90 valores, aplicado via Management API). Depois do deploy, rodei o `sync-ocm` de novo pra confirmar que os dados novos já chegam limpos — `select ... where uf !~ '^[A-Z]{2}$'` voltou vazio.
- [x] Cluster de pins + pin distinto pro elétrico (2026-08-08, PRD seção 5.2) — os pins eram `PointAnnotation` individuais (um componente React por ponto), o que não agrupa em zoom out e não escala bem com muitos pontos. Reescrevi `app/index.tsx` pra usar `Mapbox.ShapeSource` (GeoJSON) com `cluster` nativo do Mapbox GL — `CircleLayer` pros clusters (raio cresce em degraus conforme `point_count`) e pros pins individuais (cor por `nota_anp` no combustível, ciano fixo no elétrico), mais um `SymbolLayer` com "⚡" sobreposto nos pins de recarga pra diferenciar visualmente do posto (evita precisar de um asset de ícone novo/rebuild nativo — `ShapeSource`/`CircleLayer`/`SymbolLayer` já vêm no `@rnmapbox/maps` já linkado). Tocar num cluster chama `getClusterExpansionZoom` e anima a câmera pro zoom de expansão; tocar num pin individual navega pra ficha, igual antes.
- [x] Onboarding com permissão de localização + fallback de cidade (2026-08-08, PRD seção 5.1) — antes o mapa só centralizava em São Paulo por padrão e só pedia localização se o usuário tocasse no FAB manualmente. Agora, no mount, `app/index.tsx` checa `Location.getForegroundPermissionsAsync()` (sem abrir diálogo do sistema): se já concedida de uma sessão anterior, centraliza direto na localização atual; senão, mostra um overlay pedindo permissão, com "Agora não" pra pular (mantém sem cadastro, como o PRD exige) e um fallback de digitar cidade. O fallback usa a API REST de Geocoding do Mapbox direto (`src/lib/geocoding.ts`, mesmo token `pk.` já usado pelo mapa, sem SDK novo) pra resolver o nome digitado em coordenadas.
- [ ] `admin/` (Next.js) — fase 2, não é prioridade agora.

## 8. ETL — Edge Function `sync-anp`

Criada em 2026-08-06. Consome a **API Revendedores da ANP**, que é pública e não exige autenticação:
`https://revendedoresapi.anp.gov.br/v1/combustivel?uf=SP&numeropagina=N` (5.000 registros/página, doc oficial: manual PDF em `gov.br/anp/.../api-revendedores-manual-usuario.pdf`).

- Filtra por UF (default `SP`), pagina até o fim, faz upsert em `postos` por `cnpj`.
- Registros sem latitude/longitude válida na fonte são **pulados**, não inseridos (a coluna `localizacao` é `NOT NULL`) — contabilizados em `registros_pulados`.
- A API só devolve o campo `distribuidora`, sem diferenciar bandeira exibida de distribuidora real — por ora `bandeira` e `distribuidora_atual` recebem o mesmo valor.
- Cada rodada grava uma linha em `sync_logs` (tabela criada na migration `20260806130000_sync_logs.sql`) com contagem de lidos/gravados/pulados e status — é assim que dá pra acompanhar o resultado de cada sync sem entrar no dashboard.
- Secret da função: `PROJECT_SECRET_KEY` (a `SUPABASE_SECRET_KEY` do `.env.local`, setada via `supabase secrets set`) — nome customizado pra não colidir com o `SUPABASE_URL` que a Edge Function já recebe automaticamente.
- Deploy feito com `supabase functions deploy sync-anp --project-ref qefkolxhktkzryzcvnfq --use-api --no-verify-jwt` — a flag `--use-api` bundla no servidor da Supabase em vez de usar Docker local (que não está instalado nesta máquina).
- `--no-verify-jwt` porque é um job administrativo/cron, não uma rota chamada pelo app — invocação manual/teste:
  ```bash
  curl -X POST "https://qefkolxhktkzryzcvnfq.supabase.co/functions/v1/sync-anp" -H "Content-Type: application/json" -d '{"uf":"SP"}'
  ```

**Primeira rodada (SP), 2026-08-06:** 8.411 registros lidos, 6.964 gravados (539 cidades), 1.447 pulados por falta de coordenada. Validado com dados reais no banco (endereço, distribuidora, ponto geográfico batendo com o estado de SP).

## 9. ETL — Edge Function `sync-ocm`

Criada em 2026-08-07. Consome a **Open Charge Map API** (`https://api.openchargemap.io/v3/poi/`), que exige API key gratuita (conta dedicada do AbastecAI em openchargemap.org, key em `.env.local` → `OPENCHARGEMAP_API_KEY`).

- Filtra por `countrycode` (default `BR`), busca até `maxresults` (default 5.000 — a API não pagina por offset nesse endpoint, só limita o total).
- Antes de gravar os pontos, faz upsert dos operadores (`OperatorInfo.Title`) em `redes_recarga` por `nome`, pra resolver o `rede_id` de cada ponto.
- Upsert em `pontos_recarga` por `ocm_id` (constraint única adicionada na migration `20260807090000_recarga_unique_constraints.sql`, junto com unique em `redes_recarga.nome` — nenhuma das duas existia na migration original).
- `tipo_conector` guarda os títulos de `ConnectionType.Title` de cada conexão do POI; `potencia_kw` é o maior `PowerKW` entre as conexões do ponto.
- `status` é derivado de `StatusType.IsOperational` (`disponivel` / `offline` / `desconhecido`) — a API não expõe ocupação em tempo real, só se o ponto está operacional.
- Mesmo secret `PROJECT_SECRET_KEY` da `sync-anp`; secret adicional `OPENCHARGEMAP_API_KEY`.
- Deploy e invocação seguem o mesmo padrão da `sync-anp` (`--use-api`, `--no-verify-jwt`).

**Primeira rodada (BR), 2026-08-07:** 1.607 registros lidos e gravados (0 pulados), 39 operadores, cobrindo o Brasil inteiro — não bateu no `maxresults`, então é provável que seja a cobertura completa da OCM no país hoje.

## 7. Ambiente de build nativo Android (local, 2026-08-06)

**O projeto foi movido de `C:\...\OneDrive\Área de Trabalho\AbastecAI` para `G:\dev\AbastecAI`.** OneDrive (sincronização + o acento em "Área de Trabalho") corrompe silenciosamente a etapa de cópia de template do `expo prebuild` — confirmado por teste A/B (mesmo projeto, mesmo comando, só funcionou fora do OneDrive). **Todo trabalho a partir de agora acontece em `G:\dev\AbastecAI`.** A pasta antiga no OneDrive foi apagada.

Ferramentas instaladas nesta máquina, sem precisar de admin/instalador (tudo portátil):
- **JDK 17 (Temurin)**: `C:\Users\gabon\dev-tools\jdk17-extracted\jdk-17.0.20+8`
- **Android SDK**: `C:\Users\gabon\dev-tools\android-sdk` — usa a **nova CLI `android`** (não a `sdkmanager` antiga, que está deprecada nessa versão do SDK). Pacotes instalados: `platform-tools`, `platforms;android-35/36`, `build-tools;35.0.0/36.0.0`, `emulator`, `system-images;android-35;google_apis;x86_64`.
- **Emulador**: AVD `medium_phone` (perfil de celular médio, API 36 com Play Store) já criado.

Duas pegadinhas de ambiente que já foram resolvidas, documentando pra não perder tempo de novo:
1. **Certificado do Avast**: o Avast faz inspeção SSL, e o certificado raiz dele não estava na keystore do JDK portátil, quebrando qualquer download via Java (Gradle, Maven). Corrigido importando o certificado do Windows pra dentro do cacerts do JDK (`keytool -importcert`, alias `avast-ssl-scan`). Se reinstalar o JDK, precisa refazer isso.
2. **RN 0.86 mudou onde fica o template nativo**: `react-native` sozinho não tem mais a pasta `template/` (removida do pacote a partir da 0.86). É preciso ter `@react-native-community/template` instalado como devDependency também — já está no `package.json` do `app/`.

**Env vars pra definir toda sessão nova de terminal:**
```bash
export ANDROID_HOME="C:\Users\gabon\dev-tools\android-sdk"
export JAVA_HOME="C:\Users\gabon\dev-tools\jdk17-extracted\jdk-17.0.20+8"
export PATH="$JAVA_HOME/bin:$ANDROID_HOME/platform-tools:$PATH"
```

**`npx expo run:android` (rodado de dentro de `app/`) trava na etapa de instalar o APK (`installDebug`) — sempre.** O build (`assembleDebug`) sempre terminou certo (~90MB), mas a instalação via Gradle simplesmente não retorna (esperamos até 1h numa das tentativas). Causa exata não identificada — meu palpite é o daemon do Gradle enroscando ao tentar falar com o adb depois de um build longo, mas não vale mais tempo investigar já que o contorno abaixo é rápido e 100% confiável.

**Procedimento que funciona, passo a passo:**
1. Ligar o emulador sozinho, sem rodar mais nada em paralelo até ele terminar de bootar:
   ```bash
   "$ANDROID_HOME/cmdline-tools/latest/bin/android.exe" emulator start medium_phone
   ```
2. **Não tocar em adb/emulator enquanto isso roda** — comandos concorrentes atrapalham a detecção do próprio device (causou timeouts falsos várias vezes).
3. Depois que o emulador estiver pronto, buildar (pode deixar travar na instalação e cancelar — o APK já vai ter sido gerado):
   ```bash
   cd app && npx expo run:android
   ```
4. Instalar o APK manualmente, direto via adb (rápido, nunca travou):
   ```bash
   adb install -r android/app/build/outputs/apk/debug/app-debug.apk
   adb shell am start -n com.abastecai.app/.MainActivity
   ```
5. Subir o Metro à parte (o `run:android` que travou não deixou o dele no ar):
   ```bash
   npx expo start
   ```
6. Configurar o túnel de porta e mandar o app conectar direto no Metro (evita precisar navegar manualmente na tela do Dev Launcher):
   ```bash
   adb reverse tcp:8081 tcp:8081
   adb shell am start -a android.intent.action.VIEW -d "abastecai://expo-development-client/?url=http%3A%2F%2Flocalhost%3A8081"
   ```

Isso foi validado de ponta a ponta em 2026-08-06 — usuário confirmou a tela do AbastecAI (dark mode, indicadores ✓ Supabase/✓ Mapbox) rodando no emulador `medium_phone`.

### Pegadinhas adicionais descobertas em 2026-08-07 (validação do mapa com dados reais)

1. **`npx expo run:android` trava com um prompt interativo se a porta 8081 já estiver ocupada.** Não é o "Skipping dev server" (esse é inofensivo) — é um segundo prompt, bem mais tarde no build (`Input is required... Use port 8082 instead?`), que nunca recebe resposta porque o processo roda sem TTY. Sintoma: build para de progredir silenciosamente por tempo indefinido, sem erro. Fix: `netstat -ano | grep ":8081.*LISTENING"` antes de rodar, matar qualquer processo velho na porta (`Stop-Process -Id <pid> -Force`).

2. **Avast bloqueia HTTPS no emulador, não só no JDK.** Já era sabido que o Avast quebra download via Java (seção acima, certificado importado no keystore do JDK). Descobri que o mesmo problema existe no **emulador Android**: toda chamada de rede (Mapbox `config_service`, fetch do Supabase) falha com `ERR_CERT_AUTHORITY_INVALID` / `SSLHandshakeException: Trust anchor for certification path not found`. O fix usado foi desativar temporariamente o Avast Shields ("Avast shields control" → "Disable for 10 minutes") direto na bandeja do sistema. Se for preciso rodar isso com frequência, vale investigar importar o certificado do Avast no trust store do sistema do emulador (precisa `-writable-system` + remount), mas desativar temporariamente resolve pro dia a dia.

3. **GPU padrão do emulador (`gfxstream`/auto) quebra a renderização do Mapbox GL.** Com o Avast desativado, a chamada de rede funcionava mas o mapa continuava aparecendo como um retângulo escuro liso, sem tiles nem pins — sem nenhum erro no lado JS. O logcat mostrava `emuglGLESv2_enc: ... GL error 0x501 condition [!isShaderOrProgramObject]`, indicando problema na tradução OpenGL do emulador (comum em GPUs mais antigas/menos compatíveis, como a GeForce MX110 desta máquina). Fix: reiniciar o emulador forçando renderização por software:
   ```bash
   emulator -avd medium_phone -gpu swiftshader_indirect
   ```
   Isso resolve o problema visual, mas deixa o emulador **bem mais pesado e lento** (a GPU vira 100% CPU-bound) — o processo `qemu-system-x86_64` passou a consumir ~4GB de RAM e CPU muito alta. Em modo software, até `adb exec-out screencap` demora dezenas de segundos. Vale a pena só quando precisa mesmo confirmar visualmente; para desenvolvimento do dia a dia, testar num device físico é bem mais rápido.

**Resultado final, 2026-08-07:** com esses três fixes aplicados, o mapa carregou tiles reais de São Paulo com pins reais do banco (postos cinza — sem nota ANP ainda — e pontos de recarga em ciano), confirmando o pipeline completo Edge Functions → Supabase → RPC geoespacial → app funcionando de ponta a ponta.

## 10. Cron diário das sincronizações

Criado em 2026-08-07 (migration `20260807110000_cron_sync_jobs.sql`). Usa **pg_cron + pg_net**, extensões nativas do Postgres/Supabase — sem depender de nada externo (GitHub Actions, etc.), como o PRD já previa ("Edge Functions agendadas").

**Atualizado em 2026-08-07 (migration `20260807120000_cron_secret_e_cobertura_nacional.sql`):**

- **Cobertura nacional:** `sync-anp` agora roda uma vez por UF (27 jobs, `sync-anp-ac` … `sync-anp-to`), escalonados de 2 em 2 minutos entre 06:00 e 06:52 UTC (03:00–03:52 em Brasília) pra não competir por rede/CPU. `sync-ocm-diario` roda às 07:00 UTC (Open Charge Map já devolve o Brasil inteiro numa chamada só, não precisa de loop por UF).
- **Autenticação:** as duas Edge Functions continuam com `--no-verify-jwt` (são chamadas pelo cron, não por usuário logado), mas agora exigem o header `x-cron-secret` batendo com `CRON_SYNC_SECRET` (secret da função) — sem ele, `401`. O valor vive em `.env.local` (`CRON_SYNC_SECRET`) e também no **Supabase Vault** (`vault.create_secret`, nome `cron_sync_secret`) — é de lá que o `net.http_post` do cron lê o header, então o valor real nunca aparece em texto puro no arquivo de migration nem no histórico do git.
- Cada execução (de cada UF, e da recarga) grava sua própria linha em `sync_logs` — mesmo mecanismo de auditoria descrito na seção 8.
- Consultar/gerenciar os jobs: `select * from cron.job;` e `select * from cron.job_run_details order by start_time desc limit 20;` — a segunda tabela mostra se cada rodada teve sucesso.
- Pra trocar o secret no futuro: `select vault.update_secret((select id from vault.secrets where name = 'cron_sync_secret'), '<novo-valor>');` **e** `supabase secrets set CRON_SYNC_SECRET=<novo-valor> --project-ref qefkolxhktkzryzcvnfq` (os dois lados precisam ficar em sincronia).
