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
- [ ] Navegação entre telas (mapa, busca, ficha de posto/recarga, filtros — ver seção "Estrutura de Páginas" do PRD) ainda não existe; só tem a tela placeholder única.
- [ ] `admin/` (Next.js) — fase 2, não é prioridade agora.

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
