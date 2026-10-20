# Runbook: projeto Google Cloud provisório (12/10/2026)

> **Conta oficial do AbastecAI: `aiabastec@gmail.com`.** Tudo abaixo é **provisório** e existe para o mapa voltar enquanto essa conta está desativada pelo Google. Quando ela for liberada, siga a seção 5.

## 1. O que aconteceu
- 12/10/2026: o mapa do app em produção (v15) apareceu em branco. A API respondeu *"Google has disabled the use of APIs from this API project"*.
- O projeto GCP `abastecai` (nº 641453240095) pertence a `aiabastec@gmail.com`, que está **desativada** (tela de "baixar seus dados / restaurar sua Conta do Google"). `chicolicia@gmail.com` não tem permissão nesse projeto.
- A conta de faturamento **"Faturamento Abastece AI 02"** (`01FA4D-EA6FE9-103005`) está **ativa**; admins: `aiabastec@gmail.com` e `chicolicia@gmail.com`. O projeto antigo continua vinculado a ela.
- Único gasto no ano: R$ 106,52, todo em Geocoding API.

## 2. O que existe agora

| | Projeto antigo (oficial) | Projeto novo (provisório) |
|---|---|---|
| ID | `abastecai` (641453240095) | `abastecai-app-prod` |
| Dono | `aiabastec@gmail.com` (desativada) | `chicolicia@gmail.com` |
| Faturamento | conta 02 | **mesma conta 02** |
| Estado | APIs bloqueadas pelo Google | funcionando (testado) |

**Chaves novas** (nomes no console; valores **não** ficam neste arquivo):
- `AbastecAI Android`: pacote `com.abastecai.app` + SHA-1 `5e14e01bf3decb63acbda9c9cdf6ce7912fb8f99` (assinatura Play), `922d038683bb463e58bf8ab4924910984a8a0610` (upload EAS) e `5e8f16062ea3cd2c4a0d547876baa6f38cabf625` (debug). APIs: Maps SDK Android + Directions.
- `AbastecAI Web`: referrers `app-two-wine-64.vercel.app/*`, `abastecai.digitaleducacao.com.br/*`, `localhost:*/*`. APIs: Maps JavaScript + Directions.
- `AbastecAI Backend`: só Geocoding + Places (New). Sem restrição de app (usada em Edge Function e scripts).
- **Não foi criada** chave iOS (o app não tem versão iOS). `GOOGLE_MAPS_IOS_API_KEY` continua com o valor antigo, que não funciona.

## 3. Onde as chaves vivem (o que foi trocado e o que reverter)

| Local | Variável | Estado |
|---|---|---|
| `env.local` (raiz do projeto) | `GOOGLE_MAPS_ANDROID_API_KEY`, `GOOGLE_MAPS_WEB_API_KEY`, `GOOGLE_BACKEND_API_KEY` | **trocado** em 12/10 |
| EAS (`production`, `preview`, `development`) | `GOOGLE_MAPS_ANDROID_API_KEY`, `GOOGLE_MAPS_WEB_API_KEY` | ver tabela de progresso |
| Supabase Edge Functions (secret) | `GOOGLE_BACKEND_API_KEY` | ver tabela de progresso |
| Vercel (app web) | `GOOGLE_MAPS_WEB_API_KEY` | ver tabela de progresso |

> A chave Android vai **embutida no binário**. Só um build novo (v16 em diante) a usa; o v15 publicado continua com mapa em branco.

## 4. Backup das credenciais antigas
- Arquivo local (fora do git, listado no `.gitignore`): **`env.local.bak-gcp-abastecai-2026-10-12`**, na raiz do projeto. Contém as 3 chaves antigas e todo o resto do `env.local` de antes da troca.
- Se esse arquivo for perdido, as chaves antigas estão no console do projeto `abastecai` (APIs e serviços → Credenciais), acessível só pela conta oficial.
- **Atenção**: o arquivo real se chama `env.local` (sem ponto) e antes **não** estava no `.gitignore`. Foi corrigido em 12/10/2026.

## 5. Quando `aiabastec@gmail.com` for liberada

### Opção A (recomendada): tornar o projeto novo o oficial. Sem rebuild.
1. Com a conta oficial acessível, adicione-a como proprietária do projeto novo (pode ser feito pela `chicolicia` antes mesmo):
   `gcloud projects add-iam-policy-binding abastecai-app-prod --member=user:aiabastec@gmail.com --role=roles/owner`
2. Mantenha `chicolicia@gmail.com` como segunda proprietária (evita ponto único de falha).
3. Atualize os textos de `ARQUITETURA.md` (seções 14.1, 18, 19.8) trocando o projeto `abastecai` por `abastecai-app-prod`.
4. Opcional: desligar o projeto antigo depois de confirmar que nada o usa.

### Opção B: voltar ao projeto antigo (exige rebuild e nova versão na Play)
1. Recuperar a conta oficial e confirmar que o projeto `abastecai` voltou a responder (teste de Directions com a chave Android + cabeçalhos).
2. Restaurar as 3 chaves antigas a partir de `env.local.bak-gcp-abastecai-2026-10-12` em: `env.local`, EAS (3 ambientes), Supabase (secret `GOOGLE_BACKEND_API_KEY`) e Vercel.
3. Gerar novo build (`eas build --platform android --profile production`) e subir na Play.
4. Os 3 SHA-1 da seção 2 devem estar na chave Android antiga (já estavam, ver `ARQUITETURA.md` 19.8).

## 6. Como reduzir o risco de novo bloqueio
Não dá para garantir nada do lado do Google, mas:
- **Dono duplo** no projeto e na conta de faturamento (já há 2 admins no faturamento; falta o 2º dono no projeto novo).
- **Alerta de orçamento** na conta de faturamento (hoje não há).
- Manter as chaves restritas (feito).
- **Atenção a Geocoding**: todo o gasto do ano foi Geocoding, e o app grava coordenadas no banco. Os termos do Maps Platform limitam o armazenamento de resultados. Antes de novas rodadas de backfill com Geocoding, revisar os termos. **Não é confirmado** que isto causou o bloqueio.
- Considerar um e-mail institucional (Workspace) como dono, para não depender de Gmail pessoal.

## 7. Pendências conhecidas
- **Login Google (OAuth)**: verificado em 20/10. O provider está ativo no Supabase com o client `273529280541-qos37...` e o Google aceita o client (a tela de login abre, sem erro de client apagado/desativado). Esse client pertence a um projeto da conta `aiabastec@gmail.com` (nº 273529280541, distinto do `abastecai`/641453240095), que `chicolicia` não enxerga. Pendente apenas um teste de login real num aparelho; se um dia o Google bloquear esse projeto, criar client novo no `abastecai-app-prod` pelo console.
- ~~Mapa web depende do redeploy na Vercel~~ — resolvido em 20/10.
- ~~Push travado por permissão~~ — resolvido em 20/10 com `GITHUB_TOKEN` no `env.local`.

## 8. Registro de progresso

| Data | Passo | Resultado |
|---|---|---|
| 12/10 | Projeto `abastecai-app-prod` criado e ligado à conta 02 | ok |
| 12/10 | 5 APIs habilitadas e 3 chaves criadas | ok, testadas |
| 12/10 | Backup do `env.local` + troca das 3 chaves + `.gitignore` | ok |
| 12/10 | EAS: `GOOGLE_MAPS_ANDROID_API_KEY` e `GOOGLE_MAPS_WEB_API_KEY` atualizadas em production, preview e development | ok |
| 12/10 | Supabase: secret `GOOGLE_BACKEND_API_KEY` (Management API, HTTP 201) | ok |
| 12/10 | Vercel: variável `GOOGLE_MAPS_WEB_API_KEY` + redeploy | **bloqueado**: o MCP e o CLI logados nesta máquina não têm acesso ao time `abastec-ai`. Fazer pelo painel (valor novo em `env.local`) |
| 12/10 | Build v16 (versionCode 16, perfil production) | disparado: `37b5a466-3ecb-49e9-b0e4-09e74ed9b04c` |
| 12/10 | Build v16 concluído (AAB gerado) | ok, aguardando upload manual na Play |
| 12/10 | Notas da versão 16 redigidas (ver seção 9) | ok |
| 12/10 | Alertas do Play Console (v15): R8/ProGuard + remoção de recursos adicionados em `app.config.js` (commit local `22d3944`) | feito no código |
| 12/10 | Build v17 (com R8) | disparado: `ab7435d3-c749-445b-bc18-a71945a2576a`, **não testado** |
| 12/10+ | Subir v16 na Play | feito pelo usuário |
| 20/10 | Vercel: chave web trocada (prod+preview) + deploy de produção | ok, bundle confirmado com a chave nova |
| 20/10 | Push dos 5 commits ao GitHub (`GITHUB_TOKEN` no `env.local`) | ok |
| 20/10 | `aiabastec@gmail.com` adicionada como dona do `abastecai-app-prod` (convite aceito); `chicolicia` segue dona | ok, confirmado via gcloud |
| | Testar v17 antes de publicar (ver seção 10) | pendente |

## 9. Notas da versão 16 (Play Console, pt-BR)

```
<pt-BR>
Corrigido: o mapa voltou a carregar corretamente. Em algumas instalações o mapa aparecia em branco, mostrando só os pins dos postos.

Também atualizamos a conexão com os serviços de mapa e rota para deixar o app mais estável.
</pt-BR>
```

- A v16 só troca as chaves do Google Maps (projeto provisório). Não tem recurso novo; não prometer nada além disso.
- Se a v15 ainda estiver "em análise", o envio da v16 pode substituí-la. Conferir no painel antes.

## 10. Alertas do Play Console e v17 (R8)

| Alerta | Situação |
|---|---|
| Otimização de código DEX abaixo de 25% (ofuscação 1%) | Tratado na v17: `enableProguardInReleaseBuilds` + `enableShrinkResourcesInReleaseBuilds` via `expo-build-properties` (`~57.0.22`). Prazo do Google: fev/2027. |
| Avisos de edge-to-edge | Vêm de bibliotecas; sem correção direta no app. Acompanhar atualizações do Expo/React Native. |
| Orientação em tablets/dobráveis | Mantido `portrait` de propósito. |

**Risco da v17:** R8 pode remover classes usadas por reflexão e quebrar o app só em release. Não publicar em produção sem testar.

**Checklist de teste da v17** (instalar o AAB/APK em aparelho ou emulador, ou na faixa de teste fechado):
1. Abre sem fechar sozinho e o mapa carrega com pins.
2. Alternar Combustível / Elétrico / Ambos.
3. Abrir a ficha de um posto.
4. Filtros (nota mínima, conector).
5. Traçar rota e iniciar navegação com voz.
6. Login com Google, favoritar um posto e voltar (pendência: novo OAuth client, seção 7).
7. Se algo quebrar: reverter `expo-build-properties` em `app.config.js` e seguir com a v16.
