# Arquitetura e Decisões Técnicas — AbastecAI

Este documento existe pra registrar **o que foi decidido, por quê, e o que falta** — tanto pra quem for programar quanto pra qualquer sessão de IA que continue o projeto depois. Baseado nos dois PRDs (`PRD  AbastecAI.md` e `PRD-app-combustivel-eletrico.md`), que convergem no mesmo stack.

Última atualização: 2026-08-09.

---

## 1. Stack decidida

| Camada | Escolha | Justificativa |
|---|---|---|
| Mobile | **React Native + Expo** | 1 codebase iOS/Android, build via EAS, comunidade grande, recomendado nos dois PRDs. |
| Backend/DB | **Supabase (Postgres) + PostGIS** | Geolocalização nativa (raio, distância), Auth pronta pra fase 2, Edge Functions pros jobs. Projeto dedicado ao AbastecAI (ver `.env.local`). |
| Mapa | **Google Maps** (trocado de Mapbox em 2026-08-09, ver seção 14) | Prioridade virou estabilidade/familiaridade ("o simples que dá certo") sobre o visual customizável do Mapbox — o usuário já usa Google Maps/Waze no dia a dia. `react-native-maps` no nativo, `@vis.gl/react-google-maps` na web. |
| Web/PWA | **Reaproveita o `app/` (Expo Router, `web.output: "single"`)** | Landing page (`index.web.tsx`) + mapa web (`mapa.tsx`) + PWA instalável, deploy na Vercel (`app-two-wine-64.vercel.app`) — mesmo banco Supabase do mobile, sem duplicar histórico/favoritos entre plataformas. Ver seção 14. |
| Painel admin | **Next.js na Vercel** | Desacoplado do app mobile (projeto Vercel próprio, ainda não criado — decisão pausada, ver seção 14.5); só compartilha o banco Supabase. Domínio `abastec-ai.vercel.app` já reservado pra ele. |
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

- **Fase 1 (MVP)**: `app/` (Expo). Mapa, fichas de posto/recarga, sem login. Concluída — ver seção 4-5 do `PRD-app-combustivel-eletrico.md`.
- **Fase 2 (núcleo pronto em 2026-08-08)**: login opcional + favoritos + avaliações no mobile, `admin/` (Next.js) com patrocínios + moderação, **nota ANP real** (fórmula oficial replicada + histórico de fiscalização, ver seção 13) e um refresh visual (tema dia/noite automático, localização em tempo real, navegação, ver seção 12) — ver seção 11 pro núcleo original e o que ainda falta (notificações push de verdade, confirmação de e-mail real).
- **Fase 3**: preço colaborativo, rotas por custo, B2B — sem stack nova, é sobre as mesmas camadas.
- **Pré-lançamento (2026-08-09)**: redesign visual completo (glass panels, tipografia própria, tema dia/noite mantido), migração do mapa pra Google Maps, versão web/PWA com landing page (deploy na Vercel), e código de login Google preparado nos dois apps — ver seção 14. Falta configurar as credenciais OAuth reais e resolver os itens de loja (EAS build, contas de desenvolvedor, política de privacidade) antes de publicar.

## 5. Credenciais e onde vivem

Nenhuma chave real fica neste arquivo nem em código commitado. Tudo em `.env.local` na raiz (git-ignored) — **fonte única**, o `app/` nunca tem seu próprio `.env`:

- `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY` — projeto Supabase dedicado ao AbastecAI (`qefkolxhktkzryzcvnfq`). **A `SECRET_KEY` nunca deve ir pro app mobile** — só serve pra Edge Functions/backend, que rodam fora do bundle do cliente.
- `VERCEL_PROJECT_ID`, `VERCEL_ORG_ID` — projeto Vercel reservado pro `admin/` (`abastec-ai.vercel.app`); o app público tem seu próprio projeto separado, ver seção 14.4.
- `GOOGLE_MAPS_ANDROID_API_KEY`, `GOOGLE_MAPS_IOS_API_KEY`, `GOOGLE_MAPS_WEB_API_KEY` — 3 chaves separadas (projeto GCP `abastecai`, conta `aiabastec@gmail.com`), cada uma restrita por API (Maps SDK Android/iOS/JS) **e** por aplicativo desde 2026-08-09 (Android por `package_name`+SHA-1 do keystore de debug, iOS por bundle ID, Web por `allowedReferrers`) — ver seção 14.1. `MAPBOX_ACCESS_TOKEN`/`RNMAPBOX_MAPS_DOWNLOAD_TOKEN` ficaram só como resíduo histórico no `.env.local`, não são mais usados em nenhum código.
- Google Cloud SDK (`gcloud`) instalado nesta máquina em `C:\Users\gabon\dev-tools\google-cloud-sdk\google-cloud-sdk\bin\gcloud.cmd` — não está no PATH, sempre chamar pelo caminho absoluto.

`app/app.config.js` é uma **config dinâmica** (não `app.json` estático): ele faz `dotenv.config()` apontando pro `.env.local` da raiz (com um segundo `dotenv.config()` apontando pro `.env` **dentro de** `app/` como fallback, pra deploys "achatados" tipo Vercel que só sobem essa pasta), e separa os dois mundos:
- **Client-safe** (`extra` do Expo config → lido em runtime via `expo-constants`): `supabaseUrl`, `supabasePublishableKey`, `googleMapsWebApiKey`.
- **Build-only** (nunca embutido no bundle JS): `androidGoogleMapsApiKey`/`iosGoogleMapsApiKey` são passados como opção do plugin `react-native-maps` no `app.config.js` — ficam só no manifest nativo (`AndroidManifest.xml`/`Info.plist`), gerados no `expo prebuild`, nunca no bundle JS.

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
- [x] ~~**BUG conhecido: mapa fica preto em celular físico Samsung com GPU Xclipse**~~ — era específico do `@rnmapbox/maps` (renderização GL própria via ANGLE/Vulkan). Com a migração pro Google Maps em 2026-08-09 (seção 14), o mapa passou a usar o SDK nativo do Google (`react-native-maps`/`PROVIDER_GOOGLE`), que não tem esse histórico de bug — mas **ainda não foi validado num device físico de verdade** depois da troca. Não dar como resolvido até testar num aparelho real (idealmente o mesmo Galaxy A56 que reproduzia o problema).
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

### Pegadinhas adicionais descobertas em 2026-08-07 à noite (segunda rodada de testes)

4. ~~**Emulador com janela crasha nesta máquina: falta o módulo `opengl32sw.dll` no SDK.**~~ **RESOLVIDO em 2026-08-07 à noite** — reinstalando o componente `emulator` do zero (`sdkmanager "emulator"`, depois de apagar a pasta `emulator/` antiga; é preciso apagar mesmo, senão o `sdkmanager` acha o pacote "já instalado" e não baixa nada de novo) o problema sumiu. Na investigação: o arquivo `opengl32sw.dll` que a mensagem de erro citava **nem existe nesta versão do SDK** (37.1.11, Qt6) — é resíduo de um fallback legado que nem é mais usado; não era essa a causa raiz. O motivo real do crash ficou sem explicação definitiva (suspeita: algum arquivo da instalação anterior estava corrompido/incompleto), mas a reinstalação resolveu por completo — voltou a abrir com janela normalmente, sem crash, sem precisar de `-no-window`. Atalho criado na área de trabalho (`AbastecAI - Emulador Android.lnk` → `emulator.exe -avd medium_phone`) pro usuário abrir sozinho. Se o crash voltar no futuro, repetir o procedimento: apagar `android-sdk/emulator/` e rodar `sdkmanager "emulator"` de novo.
5. **Procedimento validado de teste em device físico Android (Samsung), USB:**
   - Ativar "Opções do desenvolvedor": `Configurações → Sobre o telefone → Informações do software → tocar 7x em "Número da versão"`.
   - **Em Samsung, "Depuração USB" às vezes só aparece depois que o cabo já está conectado em modo "Transferência de arquivos"** (não "Apenas carregamento") — troca o modo pela notificação de USB que aparece ao conectar. Se ainda não aparecer, usar a busca do app Configurações ("depuração usb") em vez de vasculhar o menu manualmente.
   - Depois de autorizado (`adb devices` mostra o serial como `device`, não `unauthorized`/`offline`), rodar `npx expo run:android` de novo com o device físico conectado — o Expo CLI detecta e builda pra arquitetura certa automaticamente (rebuild native leva ~15min mesmo com cache do Gradle quente, porque a arquitetura muda de x86_64 pra arm64-v8a).
   - **`adb reverse tcp:8081 tcp:8081` cai sozinho quando a tela do celular bloqueia/desbloqueia** — se o dev client mostrar `ConnectException: Failed to connect to localhost/127.0.0.1:8081` mesmo com o Metro rodando, reconfigurar o reverse (`adb reverse --remove-all` seguido de `adb reverse tcp:8081 tcp:8081`) resolve. Dá pra confirmar que o túnel está de pé de verdade testando de dentro do device: `adb shell "toybox netcat -w 2 127.0.0.1 8081"`.
   - Abrir o app direto pelo `adb shell am start -n com.abastecai.app/.MainActivity` é mais confiável que esperar o deep link automático do `expo run:android` abrir sozinho.
6. **BUG real encontrado nesse device físico (não é só ambiente de teste): mapa fica preto, sem tiles nem pins, num Galaxy A56 (GPU Samsung Xclipse 540, ANGLE/Vulkan)** — documentado como pendência na seção 4 acima. Onboarding e resto da UI funcionam normal; só a renderização do Mapbox GL falha silenciosamente (GL inicializa, mas nunca carrega estilo/tiles, sem log de erro nenhum). No emulador (software rendering) o mesmo build funciona. Suspeita: incompatibilidade conhecida entre Mapbox GL Native e GPUs Exynos/Xclipse via ANGLE.

**Resultado final, 2026-08-07:** com esses três fixes aplicados, o mapa carregou tiles reais de São Paulo com pins reais do banco (postos cinza — sem nota ANP ainda — e pontos de recarga em ciano), confirmando o pipeline completo Edge Functions → Supabase → RPC geoespacial → app funcionando de ponta a ponta.

## 10. Cron diário das sincronizações

Criado em 2026-08-07 (migration `20260807110000_cron_sync_jobs.sql`). Usa **pg_cron + pg_net**, extensões nativas do Postgres/Supabase — sem depender de nada externo (GitHub Actions, etc.), como o PRD já previa ("Edge Functions agendadas").

**Atualizado em 2026-08-07 (migration `20260807120000_cron_secret_e_cobertura_nacional.sql`):**

- **Cobertura nacional:** `sync-anp` agora roda uma vez por UF (27 jobs, `sync-anp-ac` … `sync-anp-to`), escalonados de 2 em 2 minutos entre 06:00 e 06:52 UTC (03:00–03:52 em Brasília) pra não competir por rede/CPU. `sync-ocm-diario` roda às 07:00 UTC (Open Charge Map já devolve o Brasil inteiro numa chamada só, não precisa de loop por UF).
- **Autenticação:** as duas Edge Functions continuam com `--no-verify-jwt` (são chamadas pelo cron, não por usuário logado), mas agora exigem o header `x-cron-secret` batendo com `CRON_SYNC_SECRET` (secret da função) — sem ele, `401`. O valor vive em `.env.local` (`CRON_SYNC_SECRET`) e também no **Supabase Vault** (`vault.create_secret`, nome `cron_sync_secret`) — é de lá que o `net.http_post` do cron lê o header, então o valor real nunca aparece em texto puro no arquivo de migration nem no histórico do git.
- Cada execução (de cada UF, e da recarga) grava sua própria linha em `sync_logs` — mesmo mecanismo de auditoria descrito na seção 8.
- Consultar/gerenciar os jobs: `select * from cron.job;` e `select * from cron.job_run_details order by start_time desc limit 20;` — a segunda tabela mostra se cada rodada teve sucesso.
- Pra trocar o secret no futuro: `select vault.update_secret((select id from vault.secrets where name = 'cron_sync_secret'), '<novo-valor>');` **e** `supabase secrets set CRON_SYNC_SECRET=<novo-valor> --project-ref qefkolxhktkzryzcvnfq` (os dois lados precisam ficar em sincronia).

## 11. Fase 2 — Login, favoritos, avaliações e painel admin (2026-08-07/08)

Implementado numa sessão só, com o usuário fora do teclado (autorização prévia pra trabalhar sozinho). Testado de ponta a ponta — mobile no emulador, admin via script Playwright headless (Chrome já instalado na máquina, `playwright-core` instalado só no scratchpad, não é dependência do projeto).

### 11.1 Supabase Auth

- `external_email_enabled` já vinha `true` por padrão no projeto — não precisou habilitar nada.
- **`mailer_autoconfirm` ligado via Management API** (`PATCH /config/auth`) pra cadastro não depender de e-mail de confirmação durante o desenvolvimento (o serviço de e-mail padrão do Supabase é limitado a 2/hora, não dá pra depender dele pra testar). **Pendência real antes de lançar em produção:** desligar isso e configurar SMTP próprio, ou trocar o fluxo de cadastro pra magic link/OAuth — cadastro sem confirmação de e-mail não é aceitável pra usuários reais.
- RLS de `usuarios`/`favoritos`/`avaliacoes_usuario` **já existia desde a migration inicial da fase 1** (alguém já tinha modelado isso adiantado) — só precisou confirmar que estava certo, não teve que escrever do zero.
- Migration `20260807140000_fase2_moderacao_e_patrocinios.sql`: colunas `reportado`/`oculto` em `avaliacoes_usuario` (moderação esconde sem apagar) e policy de leitura pública de `patrocinios` só quando `ativo = true` e dentro do período (`data_inicio`/`data_fim`).
- Migration `20260807150000_admin_usuarios.sql`: tabela `admin_usuarios` (`auth_id` → `auth.users`), RLS ativo sem nenhuma policy — só acessível via `SUPABASE_SECRET_KEY`, nunca pela chave publishable.

### 11.2 App mobile (`app/`)

- `src/lib/supabase.ts`: trocado `persistSession: false` por `AsyncStorage` (`@react-native-async-storage/async-storage`, dependência nativa nova — **precisou rebuild nativo completo**, não só reload JS).
- `src/lib/auth.ts` + `src/lib/AuthProvider.tsx`: contexto de auth no mesmo padrão do `FiltrosContext` (contexto separado + provider), com `entrar`/`cadastrar`/`sair`. Cadastro cria a linha em `usuarios` automaticamente (`buscarOuCriarUsuario`), vinculando por `auth_id`.
- `app/login.tsx`: entrar/cadastrar num só componente com toggle de modo — sem tela separada de cadastro.
- `src/lib/social.ts`: helpers de favoritos (`alternarFavorito`, `buscarFavoritos`) e avaliações (`salvarAvaliacao` faz upsert manual — um usuário só tem uma avaliação por lugar, sem constraint de banco pra isso, só lógica no client).
- `src/components/BotaoFavorito.tsx` e `src/components/SecaoAvaliacoes.tsx`: componentes compartilhados entre `posto/[id].tsx` e `recarga/[id].tsx` — sem login, mostram "Entrar pra favoritar/avaliar" e levam pro `/login`.
- `app/favoritos.tsx`: lista os favoritos (busca `postos` e `pontos_recarga` separado, sem join complexo).
- `app/config.tsx`: mostra estado de login/logout e link pra favoritos.
- **Testado de verdade no emulador**: cadastro, login, sessão persistindo entre reaberturas do app, favoritar (toggle), avaliar (nota + comentário), tudo escrevendo no banco real e respeitando RLS.

### 11.3 Painel admin (`admin/`)

Criado do zero com `create-next-app` (Next.js 16.3.0, TypeScript, Tailwind, App Router, `--src-dir`). **Atenção**: essa versão do Next.js tem mudanças que não estão no treinamento de nenhum modelo de IA ainda — o próprio `AGENTS.md` gerado pelo scaffold avisa pra ler a doc local em `node_modules/next/dist/docs/` antes de escrever código. A mudança que mais mordeu: **`middleware.ts` virou `proxy.ts`** (função exportada se chama `proxy`, não `middleware`) — não cheguei a usar proxy/middleware nessa implementação (fiz o gate de auth direto no layout do grupo protegido), mas fica registrado pra quando precisar.

- `next.config.ts`: mesmo padrão do `app/app.config.js` — carrega o `.env.local` da raiz via `dotenv`, nunca um `.env.local` próprio do `admin/`. Só `SUPABASE_URL`/`SUPABASE_PUBLISHABLE_KEY` (via `NEXT_PUBLIC_*`) vão pro bundle do cliente; `SUPABASE_SECRET_KEY` fica só em `process.env`, lido direto no server (nunca referenciado em client component).
- `src/lib/supabase/browser.ts` (client component), `server.ts` (lê sessão via cookies, `@supabase/ssr`), `admin.ts` (client com a secret key, `import "server-only"` no topo pra garantir em build time que nunca vaza pro bundle do cliente).
- **Autenticação do admin reaproveita o mesmo Supabase Auth do app mobile** — não é um sistema separado. O que decide se alguém é admin é ter uma linha em `admin_usuarios`, não ter conta.
- **Bootstrap do primeiro admin**: a primeira conta criada pelo formulário de cadastro do `admin/` vira admin automaticamente (`cadastrarAction` checa `count(*) from admin_usuarios`; se for zero, insere). Cadastros seguintes ficam sem acesso até um admin existente liberar manualmente via SQL — **não existe UI de convite/promoção ainda**, é a próxima coisa a fazer se precisar de mais de um admin.
- `src/lib/auth.ts` (server): `verificarSessaoAdmin()` (com `cache()` do React, evita repetir a query em toda a árvore de componentes) e `exigirSessaoAdmin()` (redireciona pro `/login` se não for admin válido) — chamado no `layout.tsx` do grupo `(painel)`, que engloba tudo exceto `/login`.
- `/patrocinios`: busca de posto/ponto de recarga por nome/cidade **sem nenhum client component nem JS** — é tudo via `searchParams` na URL (`?busca=...&tipo=...&id=...`) e Server Actions em `<form action={...}>`. Funciona igual a uma SPA pro usuário, mas é só HTML+forms por baixo.
- `/avaliacoes`: lista todas as avaliações (mais recentes primeiro), botão "Ocultar"/"Reexibir" (não apaga, só marca `oculto`) e "Remover" (apaga de vez).
- **Bug real encontrado e corrigido**: o `globals.css` gerado pelo `create-next-app` tem uma regra `body { background: var(--background) }` **fora de qualquer `@layer`**. No Tailwind v4, regras sem `@layer` sempre vencem regras dentro de `@layer` (inclusive as classes utilitárias do Tailwind), não importa a ordem nem a especificidade — isso fazia o fundo do app renderizar branco mesmo com `bg-[#0D0F12]` no `<body>` do `layout.tsx`. Removido esse bloco do `globals.css` inteiro (o admin é dark-only por design, não precisa da variável de tema claro/escuro automático do boilerplate).
- **Testado de ponta a ponta via script Playwright** (headless, apontando pro Chrome já instalado): cadastro (bootstrap de admin), login, dashboard com contadores reais, busca+seleção+criação de patrocínio, pausar patrocínio, ocultar avaliação — todas as mutações confirmadas direto no banco via Management API, não só pela tela.
- Servidor de dev deixado rodando (`npx next dev`, porta 3000) — `http://localhost:3000/login`. Conta de teste: `admin.teste@abastecai.dev` / `senhaadmin123` (criada durante o teste, é o admin bootstrap).

### 11.4 Exibição de patrocínio no mapa/lista (2026-08-08)

PRD fase 2: "visualização e regras de exibição no mapa/lista" — a RLS de leitura pública de `patrocinios` ativos já existia (seção 11.1), faltava o app mobile realmente usar isso.

- `src/lib/patrocinios.ts`: `buscarIdsPatrocinados(idsPostos, idsPontos)` — uma query só (`.or()` combinando os dois filtros `in`), devolve um `Set<string>` de IDs patrocinados. Não lança erro pra fora de propósito nos call sites (`.catch(() => {})`) — patrocínio é decoração visual, nunca deve travar a tela principal se falhar.
- `app/index.tsx`: depois de carregar postos/pontos de recarga, busca quais IDs estão patrocinados e guarda num `Set` no state. O `paraFeatureCollection` genérico virou parametrizável por um objeto de propriedades (antes só cor), incluindo `patrocinado: boolean` em cada feature GeoJSON.
- Estilo do pin patrocinado: anel mais grosso (`circleStrokeWidth: 3` vs `2`) e dourado (`#F5A623`) em vez de branco — usando expressão Mapbox `["case", ["==", ["get","patrocinado"], true], ..., ...]` nas duas `CircleLayer` (postos e recarga). Postos patrocinados também ganham uma `SymbolLayer` com "★" sobreposta (recarga já usa o espaço do símbolo pro "⚡", então só o anel dourado diferencia lá, sem sobrepor dois ícones).
- `posto/[id].tsx` e `recarga/[id].tsx`: badge "★ Patrocinado" (fundo dourado) logo abaixo do nome/bandeira, buscando o status individual do lugar.
- `busca.tsx`: resultado patrocinado ganha um "★ " na frente do nome na lista.
- **Validado visualmente**: criei um patrocínio temporário pra um posto no Brás/SP, confirmei o anel dourado + estrela no pin do mapa (dando zoom na região) e o badge na ficha via deep link, depois apaguei o registro de teste.

### 11.5 Notificações push (2026-08-08)

PRD fase 2: "Notificações push (favoritos, alertas)". Escopo que decidi cobrir: **infraestrutura de token + envio manual pelo admin** (broadcast ou só pra quem favoritou um lugar específico). **Não** implementei gatilho automático (ex.: detectar mudança de nota num posto favoritado e notificar sozinho) — isso exigiria um sistema de detecção de mudança nos jobs de sync, escopo bem maior.

- `expo-notifications` instalado (módulo nativo — **precisou rebuild**). Plugin configurado no `app.config.js` com ícone/cor pro Android.
- Migration `20260808100000_push_token.sql`: coluna `expo_push_token` em `usuarios`.
- `src/lib/pushNotifications.ts`: `registrarPushToken(usuarioId)` — pede permissão (se ainda não concedida), pega o token do Expo e salva no banco. **Nunca lança erro pra fora** — só loga um warning — porque isso roda automaticamente toda vez que o `AuthProvider` detecta uma sessão ativa (login ou sessão restaurada), e não pode travar o app se falhar.
- `admin/src/lib/actions/push-actions.ts`: `enviarNotificacaoAction` — busca os tokens (todos os usuários, ou só quem tem favorito num posto/ponto específico via join com `favoritos`) e manda em lotes de 100 pro endpoint da Expo (`https://exp.host/--/api/v2/push/send`). Tela `/notificacoes` no admin reaproveita o mesmo componente de busca de posto/ponto do `/patrocinios` (`src/lib/buscarAlvos.ts`, extraído pra ficar compartilhado entre as duas telas).
- **Pendência real pra push funcionar de verdade**: testei no emulador e confirmei que o app **não crasha** e loga um warning claro:
  ```
  Não foi possível registrar push token: [Error: Unable to get Firebase Messaging instance. Did you configure `googleServicesFile` path in app config? ... Default FirebaseApp is not initialized]
  ```
  No Android, o Expo push token depende de **Firebase Cloud Messaging** por baixo — falta (1) criar um projeto Firebase, baixar o `google-services.json` e apontar `android.googleServicesFile` no `app.config.js`, e (2) rodar `eas init` (vincula o projeto a uma conta Expo, gera o `projectId` que `getExpoPushTokenAsync` pede). Nenhum dos dois eu consigo fazer sozinho — dependem da sua conta Firebase/Expo. Testei o fluxo de envio do admin mesmo assim: com `expo_push_token` sempre nulo, ele responde corretamente "Nenhum usuário com push registrado pra esse alvo" em vez de travar ou dar erro solto.

### 11.6 O que ficou pra depois

- [ ] **Confirmação de e-mail real** — hoje `mailer_autoconfirm=true` só pra facilitar teste. Antes de qualquer lançamento público, configurar SMTP e desligar isso (ou trocar por magic link/OAuth).
- [ ] **Push notifications de verdade** — falta projeto Firebase (`google-services.json`) + `eas init` (conta Expo), ver seção 11.5. A infra (token, salvar no banco, tela de envio no admin) já está pronta e testada, só falta essas duas peças externas.
- [ ] **Gatilho automático de alerta** (ex.: "sua nota do posto favoritado mudou") — hoje só dá pra mandar notificação manualmente pelo admin, não existe detecção automática de mudança.
- [ ] **UI de convite/promoção de admin** — hoje só dá pra virar admin sendo o primeiro cadastro ou via SQL manual (`insert into admin_usuarios (auth_id) values (...)`).
- [ ] Conta de teste do mobile (`teste.fase2@abastecai.dev` / `senha123456`) e do admin (`admin.teste@abastecai.dev` / `senhaadmin123`) ficaram no banco de propósito — servem de login de exemplo. Os dados fake que elas geraram (patrocínio, avaliação, favorito de teste) foram removidos do banco.

## 12. Refresh visual, localização em tempo real e navegação (2026-08-08)

Feito numa sessão de testes reais do app — você trouxe um protótipo paralelo feito no Google AI Studio (`aiabastec-AI/AbastecAI-Google`, repo privado, acesso concedido via colaborador) como inspiração visual, mais uma lista de ajustes de UX depois de usar o app de verdade no emulador.

### 12.1 Tema claro/escuro automático

- `app/src/theme.ts`: `colors` estático virou `darkColors`/`lightColors` (mesmas chaves; só fundo/card/texto/borda mudam — cores de marca e de nota ficam iguais nos dois temas, é identidade visual/semântica, não deveria mudar com o horário).
- `app/src/lib/ThemeProvider.tsx` (novo): decide `claro` (6h–18h, horário local do device) vs `escuro` na montagem, reavalia quando o app volta do background (`AppState`). Todos os componentes/telas migraram de `import { colors } from "theme"` (estático) pra `useTheme()` (hook) — inclui mover `StyleSheet.create` de escopo de módulo pra dentro do componente via `useMemo(() => criarEstilos(colors), [colors])`, já que os estilos agora dependem de um valor que muda em runtime.
- `app/app/index.tsx`: `styleURL` do Mapbox também troca entre `light-v11`/`dark-v11` conforme o tema.

### 12.2 Mapa: pins squircle, localização em tempo real, escala corrigida

- **Pins individuais** (postos/pontos de recarga) trocaram de `CircleLayer` pra `SymbolLayer` com um ícone SDF ("squircle", retângulo bem arredondado) — `app/assets/map/pin-squircle.png`, gerado por um script Node descartável (só `zlib`, sem lib nova) — registrado via `<Mapbox.Images>` e tingido por feature via `iconColor: ["get","cor"]`. Clusters continuam `CircleLayer` (formato certo pra contagem agregada).
- **`<Mapbox.UserLocation>`** (nativo do `@rnmapbox/maps`) adicionado ao `MapView` — pontinho azul com pulso que atualiza sozinho com o GPS, igual Google Maps/Waze/iFood. Não precisa de código de polling nem de permissão extra (usa a mesma permissão que o onboarding já pedia via `expo-location`); se a permissão não foi concedida, simplesmente não desenha nada.
- **Barra de escala do Mapbox** (`scaleBarEnabled`) vem, por padrão, grudada no canto superior esquerdo — por cima de tudo, inclusive da status bar — e em milhas. Reposicionada via `scaleBarPosition={{ top: 168, left: 16 }}` (embaixo do toggle/Buscar/Filtros) e `scaleBarUnits="metric"`.
- **Toggle do topo** trocou de texto pra só ícones (`@expo/vector-icons`, `MaterialCommunityIcons` — biblioteca nova instalada nesta sessão via `npx expo install`; não tem módulo nativo próprio, só precisou de rebuild porque `expo-font`, do qual depende, ainda não estava linkado no projeto Android — confirmado que basta rebuild normal, não precisa de `expo prebuild`).
- **Lista horizontal de cards** embaixo do mapa (`app/src/components/CardResultadoProximo.tsx`) — é o "bottom overlay" que o PRD original já previa (listagem rápida de resultados próximos) e nunca tinha sido implementado. Fundo tintado na cor de marca por tipo (laranja combustível / ciano elétrico), respeita o mesmo filtro Combustível/Elétrico/Ambos do toggle.

### 12.3 Navegação: botão de voltar universal

Nenhuma tela modal (`busca`, `filtros`, `config`, `login`, `favoritos`, ficha de posto/recarga) tinha um jeito visível de voltar — só gesto de arrastar pra baixo ou o botão físico do Android. `app/src/components/BotaoVoltar.tsx` (novo): seta de voltar renderizada no fluxo normal (não floating) como primeiro item de cada tela, `router.back()` com fallback pra `router.replace("/")` se não houver pilha de navegação. Adicionado nas 7 telas modais; o mapa (tela principal) não recebe, não faz sentido "voltar" dali.

### 12.4 Pegadinha de teste (não é bug do app)

A bolha flutuante do menu de desenvolvedor do Expo (círculo azul com engrenagem, "Tools") pode aparecer sobreposta a elementos do nosso app durante teste no emulador/device — **só existe em build de desenvolvimento**, some completamente no app publicado de verdade. Já apareceu sobreposta ao FAB de localização numa sessão de teste; não precisa de nenhum ajuste de código pra isso.

## 13. Nota ANP e histórico de fiscalização (2026-08-08)

Fechou o maior gap identificado contra o PRD (itens Must M1/M4: pin colorido por nota, resumo de fiscalização na ficha) — até aqui `postos.nota_anp` era sempre `null` porque nenhum job alimentava esse dado.

### 13.1 A fórmula oficial

A ANP não publica API nem fórmula pronta, mas você trouxe a página de metodologia do app oficial **"ANP com Vc – Postos"** (validada contra um posto real, `AUTO POSTO VITOHARY LTDA`, CNPJ `65457780000149`):

```
desconto = 2 × infrações (vício qualidade/quantidade, últimos 2 anos)
         + 1 × infrações (vício qualidade/quantidade, 2–5 anos)
         + 1 × amostras PMQC não conformes (últimos 2 anos)
         + 0,5 × amostras PMQC não conformes (2–5 anos)

nota = 5 − round(desconto)
nota = 0  se posto inativo/interditado, ou se desconto > 5
nota = clamp(nota, 0, 5)
```

**Decisão de produto**: posto sem nenhum registro (fiscalização ou amostra) nos últimos 5 anos fica com `nota_anp = null` ("ainda não fiscalizado") em vez de assumir nota 5 automática — a fórmula pura daria 5 pra ausência de dado, mas isso passaria falsa impressão de "verificado" pra maioria dos ~180 mil postos do Brasil que nunca foram testados. A ficha do posto (`app/app/posto/[id].tsx`) mostra um badge explícito "Ainda não fiscalizado" nesse caso, não só um "—" ambíguo.

Implementada como função SQL `recalcular_nota_anp(p_posto_id uuid)` (migration `20260808110000`) e uma versão em lote `recalcular_notas_lote(p_posto_ids uuid[])` (migration `20260808120000` — o loop roda dentro do Postgres numa chamada só, porque chamar a função individualmente por RPC pra cada posto de um sync nacional estourava o limite de recurso do worker da Edge Function).

### 13.2 Fontes de dados

1. **PMQC** (qualidade do combustível) — JSON público, mensal:
   `https://www.gov.br/anp/pt-br/centrais-de-conteudo/dados-abertos/arquivos/pmqc/{ano}/pmqc_{ano}_{mes}.json`
   - **Pegadinha real**: a ANP não manteve um padrão de nome de arquivo estável — meses recentes usam `pmqc_2026_06.json` (underscore), mas jul–dez/2025 usam `pmqc-2025-12.json` (hífen), e alguns meses de 2024 nem têm o ano no nome. `supabase/functions/sync-pmqc/index.ts` tenta os dois padrões conhecidos antes de desistir; ainda existem lacunas históricas (meses em formato não mapeado) que não valeu a pena perseguir um por um.
   - `CNPJ` no JSON vem **pontuado** (`63.117.677/0001-24`) — precisa normalizar (só dígitos) pra bater com `postos.cnpj`, que é salvo sem pontuação.
   - Backfill de ~29 meses reais já rodado (2022–2026, com lacunas nos meses cujo padrão de nome ainda não foi mapeado).

2. **Ações de Fiscalização do Abastecimento** (infrações de qualidade E quantidade — o PMQC só cobre qualidade) — planilha XLSX bruta, **não** uma API:
   `https://www.gov.br/anp/.../dados-fisc-a-partir-2019.xlsx` (~15,5 MB, 233.266 linhas, coluna `Segmento Fiscalizado = "Revenda de Combustíveis"` é o recorte relevante).
   - **Download bloqueado pra requisição direta** (403, proteção anti-bot do gov.br) — só funciona simulando uma sessão de navegador real (`curl` com cookie da página + header `Referer`, ver comentário no topo de `scripts/backfill-fiscalizacao.js`).
   - **Arquivo grande demais pra uma Edge Function** — já confirmado na prática (o `sync-pmqc` estourou o limite de recurso do worker num arquivo bem menor, 4,5 MB, antes do fix do recálculo em lote). Por isso o processamento roda **local** (Node + lib `xlsx`), não como Edge Function.
   - Colunas: `UF, Município, Bairro, ENDEREÇO, CNPJ/CPF, Agente Econômico, Segmento Fiscalizado, DATA DO DF, Número do Documento, Procedimento de Fiscalização, Resultado`. Uma "fiscalização" (evento, chave = `Número do Documento`/DF) pode ter várias linhas de "Resultado" — cada uma vira uma `infração` só se `Procedimento de Fiscalização = "Auto de Infração"` **e** o texto do `Resultado` bater com uma lista de palavras-chave de vício de qualidade/quantidade (não existe coluna de classificação pronta — é heurística, documentada em `scripts/backfill-fiscalizacao.js`; a ANP não publica o dicionário de classificação).

### 13.3 Modelo de dados

`fiscalizacoes` (redesenhada — estava sempre vazia, sem risco de migrar dado) separa **evento de fiscalização** de **infração encontrada** (uma fiscalização pode não ter infração nenhuma):
- `fiscalizacoes`: `id, posto_id, numero_df (unique), data_fiscalizacao, tipo_convenio, fiscalizacao_campo`.
- `infracoes` (nova): `id, fiscalizacao_id → fiscalizacoes, classificacao ('vicio_qualidade'|'vicio_quantidade'), descricao, componente_df`. Unique em `(fiscalizacao_id, descricao)` (migration `20260808130000`) — sem isso, rodar o backfill de novo duplicaria infração.
- `amostras_pmqc` (nova): `id, posto_id, amostra_id_externo (unique, é a chave numérica do próprio JSON da ANP), data_coleta, produto, conforme, ensaios jsonb`.

### 13.4 Sincronização

- **`sync-pmqc`** (Edge Function, `supabase/functions/sync-pmqc/`): mesmo padrão de `sync-anp`/`sync-ocm` (sync_logs, `PROJECT_SECRET_KEY`, `--use-api --no-verify-jwt`, cron com `x-cron-secret`). Cron mensal, dia 1º, sincroniza o **mês anterior** (migration `20260808140000`).
- **`scripts/backfill-fiscalizacao.js`**: roda fora do Supabase (ver 13.2). Idempotente (upsert por `numero_df`/`(fiscalizacao_id, descricao)`, seguro rodar de novo). Lê `SUPABASE_URL`/`SUPABASE_SECRET_KEY` do `.env.local` localmente ou de `process.env` no CI.
- **`.github/workflows/backfill-fiscalizacao.yml`**: automatiza o script acima via GitHub Actions (cron mensal, dia 2, roda fora do Supabase então não tem os mesmos limites de recurso, e consegue rodar o `curl` com sessão de navegador sem problema). Precisa dos secrets `SUPABASE_URL` e `SUPABASE_SECRET_KEY` cadastrados no repositório (Settings → Secrets and variables → Actions) — já configurados.

### 13.5 Resultado do backfill inicial e validação

233.266 linhas da planilha processadas → 124.736 relevantes (últimos 5 anos, segmento certo) → **52.978 fiscalizações** e **4.654 infrações** carregadas, afetando **21.684 postos**. PMQC: ~29 meses reais, milhares de amostras.

**Validado ponta a ponta** contra o caso real que você trouxe da tela do app oficial: `AUTO POSTO VITOHARY LTDA` fechou em nota **5.0**, 2 fiscalizações (DF `703693` e `686619`, mesmas datas), 0 infrações, 3 amostras conformes (mesmas datas/produtos) — bate exatamente.

### 13.6 UI

- `app/app/posto/[id].tsx`: badge de nota maior/destacado (fundo translúcido na cor da faixa); quando `nota_anp` é `null`, mostra "Ainda não fiscalizado" em vez de "—" solto; card "Histórico de fiscalização" com resumo (`X fiscalizações · Y infrações · Z amostras`) e lista real por data/DF.
- `app/src/lib/postos.ts`: `buscarFiscalizacoesDoPosto` (sempre vazia) virou `buscarHistoricoFiscalizacao` (join `fiscalizacoes`+`infracoes`, mais `amostras_pmqc` separado).

### 13.7 O que ficou pra depois

- [ ] Lacunas históricas do PMQC — meses cujo padrão de nome de arquivo ainda não foi mapeado (ver 13.2) continuam sem sincronizar. Não bloqueia o essencial (a fórmula olha 5 anos, e a maior parte do período recente já está coberta), mas cobertura não é 100%.
- [ ] Classificação de infração (vício de qualidade/quantidade) é heurística por palavra-chave — pode errar em casos de fraseado que eu não previ. Revisar a lista em `scripts/backfill-fiscalizacao.js` se a nota de algum posto específico parecer errada.
- [ ] `sync-fiscalizacao` (a planilha XLSX) só atualiza via GitHub Actions mensal — se o layout do gov.br mudar (nova proteção anti-bot, URL diferente), o workflow quebra silenciosamente até alguém notar (não tem alerta configurado).

## 14. Redesign visual, Google Maps, versão web/PWA e login Google (2026-08-09)

Sessão de pré-lançamento: antes de publicar nas lojas, o usuário pediu uma versão web/PWA (com landing page mostrando as telas do mobile), deploy na Vercel usando o mesmo banco Supabase, e preparação do login Google. No meio do caminho, decidimos trocar o mapa de Mapbox pra Google Maps — o usuário priorizou estabilidade e familiaridade ("o simples que dá certo") sobre o visual mais customizável do Mapbox.

### 14.1 Migração Mapbox → Google Maps

- `@rnmapbox/maps`/`mapbox-gl` removidos; `src/lib/mapbox.ts` deletado. Entram `react-native-maps` (nativo) + `react-native-map-clustering` (clustering — a lib nativa não tem clustering embutido, diferente do `ShapeSource cluster` do Mapbox) + `@vis.gl/react-google-maps` (só na web, via `app/mapa.tsx`, separado do `index.tsx` nativo porque `react-native-maps` não roda em navegador).
- Pins customizados via `<Marker>` com View React (`src/components/PinMapa.tsx`, squircle colorido por nota + ícone de raio/estrela) no nativo; ícone SVG data-URI gerado em runtime (`src/lib/pinSvg.ts`) na web, porque `@vis.gl/react-google-maps` sem Map ID não aceita `AdvancedMarker` com JSX.
- Tema claro/escuro do mapa virou 2 arrays JSON de `customMapStyle` (`src/lib/googleMapStyle.ts`), mesmo formato pro nativo e pra web.
- 3 chaves de API separadas (Android/iOS/Web, projeto GCP `abastecai`, conta `aiabastec@gmail.com`), cada uma restrita por API desde a criação **e por aplicativo desde 2026-08-09**: Android por `package_name=com.abastecai.app` + SHA-1 do keystore de **debug** (`5e8f16062ea3cd2c4a0d547876baa6f38cabf625`), iOS por bundle ID (`com.abastecai.app`), Web por `allowedReferrers` (`app-two-wine-64.vercel.app` + hosts de dev local). **Pendência real**: a restrição Android usa o SHA-1 de debug porque ainda não existe build de produção assinada (EAS não foi iniciado) — precisa adicionar o SHA-1 de produção (Play App Signing) nessa mesma chave antes de publicar, senão o mapa quebra silenciosamente no APK/AAB de release.
- Validado no emulador Android: clustering expande corretamente ao tocar, cores por nota corretas, tema claro/escuro aplicado. **Não validado ainda em device físico** — era exatamente o cenário que expunha o bug de tela preta do Mapbox (seção 6), então vale confirmar que sumiu de verdade.

### 14.2 Redesign visual

- Novo sistema de design (glass panels translúcidos, tipografia própria via `@expo-google-fonts/inter`+`space-grotesk`, tokens de "glow" por tipo/nota) aplicado nas 9 telas do app, a partir de 3 mockups gerados no Stitch (Google) que o usuário trouxe como referência. Mantidos de propósito: tema claro/escuro automático por horário (já existente), toggle de contexto só com ícones (sem texto).
- Arquivos novos principais: `src/typography.ts`, `src/lib/fonts.ts`, `src/components/GlassPanel.tsx`, `AnelNota.tsx`, `PillToggle.tsx`. `src/theme.ts` ganhou campos novos (`surfaceGlass*`, `glow*`) de forma aditiva, sem quebrar nada que já lia `ThemeColors`.

### 14.3 Versão web/PWA

- Reaproveita o `app/` (Expo Router) em vez de um site separado — maximiza reuso do redesign. Resolução de arquivo por plataforma do Expo Router (`.web.tsx` sobrepõe `.tsx` no build web) resolve a divergência de mapa nativo vs. web sem esforço extra de roteamento.
- `app/index.web.tsx` (landing page: hero, prints reais do emulador emolduradas, CTA "Usar no navegador" → `/mapa`, badges de loja "em breve") e `app/mapa.tsx` (mapa web funcional, dados reais do Supabase, sem clustering — deliberadamente fora de escopo).
- `src/lib/pushNotifications.ts` ganhou guard `Platform.OS === "web"` (expo-notifications não roda em navegador).
- PWA: `public/manifest.json`, `public/sw.js` (service worker network-first, cacheia só o "app shell" — HTML/JS/CSS/ícones —, **não** sincroniza dados do Supabase offline; deixado claro pro usuário que essa fase não é offline-first de dados reais) e ícones em vários tamanhos incl. maskable. Confirmado empiricamente que `public/index.html` customizado **funciona** como template mesmo em `web.output: "single"` (SPA) — Metro injeta o `<script>` do bundle com hash automaticamente, apesar da doc do Expo sugerir que isso só valeria pro modo static/server.

### 14.4 Deploy na Vercel

- `app/vercel.json` (sem preset oficial pra Expo: `buildCommand: "npx expo export -p web"`, `outputDirectory: "dist"`, `framework: null`, rewrite catch-all pra SPA) e `app/.vercelignore` (**obrigatório** — o Vercel CLI não respeita `.gitignore` pro próprio upload; sem isso ele tenta subir `node_modules` inteiro e estoura o limite de 100MB por arquivo).
- **Dois projetos Vercel distintos, no mesmo repo GitHub** (`github.com/aiabastec-AI/AbastecAI`), diferenciados pelo `rootDirectory` de cada um:
  - `abastec-ai.vercel.app` — domínio **reservado pro `admin/`**, ainda sem projeto conectado (ver 14.5).
  - App público (hoje com alias `app-two-wine-64.vercel.app`, `rootDirectory: "app"`) — conectado ao GitHub, deploy automático a cada push no `main`, confirmado funcionando de ponta a ponta em 2026-08-09.
- Configuração de `rootDirectory` e env vars (`SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `GOOGLE_MAPS_WEB_API_KEY`) feita via chamadas diretas à API REST da Vercel (`api.vercel.com`), usando o token OAuth que o próprio Vercel CLI guarda em `C:\Users\gabon\AppData\Roaming\com.vercel.cli\Data\auth.json` — não existe subcomando de CLI pra nenhuma das duas coisas.

### 14.5 Domínio do admin — decisão pausada

O usuário quer manter `abastec-ai.vercel.app` reservado especificamente pro painel admin (não pro app público) — inicialmente cheguei a conectar um projeto novo por engano nesse fluxo, foi desfeito a pedido do usuário. Pediu pra criar um projeto Vercel separado pro `admin/`, mas pausou a decisão ("para tudo na verdade") antes de eu executar. **Não retomar sem confirmação explícita** — decisões de projeto/domínio na Vercel são exatamente o tipo de coisa que esse usuário quer aprovar antes, mesmo tendo dado autorização geral pra seguir sozinho no resto do trabalho de código.

### 14.6 Login Google (código pronto, credenciais pendentes)

- **App (`app/`)**: `AuthProvider.entrarComGoogle()` ramifica por `Platform.OS`. Nativo: `supabase.auth.signInWithOAuth({ skipBrowserRedirect: true })` + `WebBrowser.openAuthSessionAsync` (abre navegador in-app, captura o retorno pelo deep link `abastecai://`) + `getQueryParams`/`setSession` (fluxo implícito, tokens vêm direto na URL de retorno — o client não usa `flowType: "pkce"`, então é o fluxo certo). Web: deixa o Supabase fazer o redirect de página inteira e lê a sessão de volta via `detectSessionInUrl` (agora `Platform.OS === "web"` em vez de sempre `false`, em `src/lib/supabase.ts`).
- **Admin (`admin/`)**: botão Google em `/login` (client component, `criarClienteBrowser().auth.signInWithOAuth`) + rota nova `admin/src/app/auth/callback/route.ts` (troca o `code` PKCE pela sessão via `exchangeCodeForSession`, reaplica o mesmo gate de `admin_usuarios` que `entrarAction` já fazia — se a conta Google não for admin, desloga e volta pro login com aviso).
- **Configurado em 2026-08-09**: Client ID/Secret gerados no Google Cloud Console (projeto `abastecai`, OAuth client tipo "Web application", redirect URI `https://qefkolxhktkzryzcvnfq.supabase.co/auth/v1/callback`), aplicados no provider Google do Supabase Auth via Management API (`PATCH /v1/projects/{ref}/config/auth`, campos `external_google_enabled`/`external_google_client_id`/`external_google_secret`). Registrados em `.env.local` (`GOOGLE_OAUTH_CLIENT_ID`/`GOOGLE_OAUTH_CLIENT_SECRET`) só como referência — nenhum código lê essas variáveis.
- **`external_email_enabled` desativado em 2026-08-09** — decisão do usuário de simplificar pra só Google, em vez de manter e-mail/senha exigindo confirmação de e-mail (pendência antiga, seção 11.6). Removida a UI de e-mail/senha de `app/app/login.tsx` e `admin/src/app/login/page.tsx` (sobrou só o botão Google em cada tela); `entrar`/`cadastrar` saíram de `AuthProvider`/`auth.ts`; `admin/src/lib/actions/auth-actions.ts` foi deletado inteiro (ficou sem uso). **Efeito colateral que precisa de atenção**: não existe mais bootstrap automático de "primeira conta vira admin" — se algum dia for preciso criar um novo admin, é `insert into admin_usuarios (auth_id) values (...)` manual (a conta master `aiabastec@gmail.com` já tinha essa linha de antes, não foi afetada).
- **Validação real, 2026-08-09**: admin testado de ponta a ponta (`localhost:3000/login` → Google → volta logado). App mobile testado via emulador + screenshots: rebuild nativo com `expo-web-browser`/`expo-auth-session` linkados (autolinking do Gradle pegou os módulos novos sem precisar de `expo prebuild --clean`, que travou com `EBUSY` por causa de um Metro antigo ainda rodando de uma sessão anterior — matar esse processo destravou), tela de login simplificada renderizando certo, botão abre o Custom Tab e chega até a tela real do Google (`accounts.google.com`, "to continue to qefkolxhktkzryzcvnfq.supabase.co" — confirma Client ID/redirect certos). **Não testado**: a captura de volta do deep link `abastecai://` com os tokens (`getQueryParams`/`setSession`) — o emulador não tinha nenhuma conta Google cadastrada pra completar o login de verdade, e a decisão foi seguir sem esse último passo por ora.
- **Pegadinha real que quase passou batido**: o Supabase só aceita redirecionar pra URLs que estejam na `uri_allow_list` da config de Auth — sem isso, `redirectTo` é silenciosamente ignorado e ele usa o `site_url` padrão (que estava `http://localhost:3000`, só serve pro admin local). Adicionei via Management API: `abastecai://**` (deep link nativo), `https://app-two-wine-64.vercel.app/**` (app público), `https://abastec-ai.vercel.app/**` (admin, quando existir) e `http://localhost:3000/**`/`:8081/**`/`:19006/**` (dev local dos dois lados). **Se algum domínio novo entrar** (domínio próprio, novo alias da Vercel), precisa adicionar aqui também, senão o login Google quebra silenciosamente só naquele domínio.

### 14.7 O que ficou pra depois

- [ ] **SHA-1 de produção na chave Android do Google Maps** — hoje só tem o SHA-1 de debug (ver 14.1); precisa do certificado de assinatura real (Play App Signing, via EAS) antes de publicar.
- [ ] **Testar o mapa (Google Maps) num device físico** — só validado no emulador até agora; era o cenário que expunha o bug do Mapbox antigo.
- [x] **Credenciais OAuth do Google** (Client ID/Secret) — configuradas em 2026-08-09, ver 14.6. Admin validado de ponta a ponta; app mobile validado até a tela do Google, falta só o fechamento do ciclo (deep link de volta) com uma conta real — aceito assim por decisão do usuário.
- [x] **Confirmação de e-mail real** — resolvida em 2026-08-09 desativando e-mail/senha por completo (só Google), em vez de configurar SMTP. Ver 14.6.
- [ ] **Projeto Vercel do `admin/`** — decisão pausada, ver 14.5.
- [ ] **EAS Build + contas de desenvolvedor** (Google Play Console, Apple Developer) — ainda não iniciado.
- [ ] **Política de privacidade** — obrigatória nas duas lojas, ainda não existe.
- [ ] Senha do admin master (`aiabastec@gmail.com` / `123456`) é fraca de propósito — trocar antes de dar acesso a mais gente.
