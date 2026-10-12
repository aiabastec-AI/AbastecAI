# Prompts para o Google Flow (Veo) — AbastecAI

O Flow gera **só a apresentadora falando**. O mapa com pins e o logo oficial já existem em `brutos/flow/outro-logo.mp4` (3 s, 1080×1920, sem áudio) e são colados no fim na montagem local. Nenhum prompt pede transição, mapa ou logo.

Como usar: cole **ESTILO + PERSONAGEM + cena**, nessa ordem, e anexe a imagem `brutos/flow/referencia-apresentadora.png`. Não reescreva os blocos.

Regras:
- Fala entre aspas, escrita **"Abastece aí"** (pronúncia). Na tela e na legenda: **AbastecAI**.
- Cada clipe de 10 s comporta ~22–26 palavras de fala.
- Não mostrar preço, nome de posto/bandeira nem tela legível do app (a tela real entra na montagem).
- Gere 2–3 variações por prompt e escolha a melhor. Confira os créditos no contador do Flow antes de gerar.

## BLOCO ESTILO

```
Vertical 9:16 video, 10 seconds, native audio with clear Brazilian Portuguese speech. UGC social-media style: handheld smartphone look, natural daylight, realistic skin and fabric, shallow depth of field, no on-screen text, no subtitles, no logos or brand names anywhere in the frame, no watermarks, no map graphics, no transitions. Smooth, natural motion. The shot ends on her, in the same location, with no cut.
```

## BLOCO PERSONAGEM

```
Apresentadora AbastecAI: Brazilian woman, about 30 years old, shoulder-length wavy brown hair, light-medium skin, warm confident smile, light natural makeup. Wearing a light blue denim jacket over a plain white t-shirt and dark jeans. Same face, same hair, same outfit in every shot. She speaks directly to the camera in a friendly, relaxed tone.
```

## BLOCO NEGATIVO

```
different person, different hair, different outfit, text, subtitles, captions, logos, brand names, fuel brand signs, readable license plates, distorted hands, extra fingers, readable phone screen, map graphics, transition effects, cartoon
```

---

## Plano de 3 clipes de 10 s (juntam num vídeo de ~35 s, ou use 2 para ~25 s)

### Clipe A — Gancho (posto)
Fala (sua copy): *"Onde você estiver, vai poder ter segurança em abastecer. E também funciona pra carro elétrico. Baixe agora o Abastece aí no seu celular e fique seguro."*

```
SCENE: A gas station forecourt in daylight, a white hatchback parked beside a fuel pump with the driver door open. She gets out of the car from the driver's side and walks toward the pump while the car stays visible. She looks at the camera and says in Brazilian Portuguese: "Onde você estiver, vai poder ter segurança em abastecer. E também funciona pra carro elétrico. Baixe agora o Abastece aí no seu celular e fique seguro."
CAMERA: handheld UGC at chest height, gentle follow, no zoom. She ends standing by the pump, smiling at the camera.
```

### Clipe B — Elétrico
Fala: *"Dirige carro elétrico? No Abastece aí você acha ponto de recarga, vê o conector e a potência antes de chegar."*

```
SCENE: A modern electric-vehicle charging station in a shopping-center parking lot in daylight, a compact electric car plugged into an unbranded charger behind her. She stands next to the car, phone held casually at her side, looks at the camera and says in Brazilian Portuguese: "Dirige carro elétrico? No Abastece aí você acha ponto de recarga, vê o conector e a potência antes de chegar."
CAMERA: handheld UGC, slow push-in, no cut. She ends smiling at the camera.
```

### Clipe C — Nota do posto
Fala: *"Antes de parar, olha a nota do posto. No Abastece aí você vê o histórico de fiscalização dos últimos cinco anos. Dados públicos da ANP."*

```
SCENE: Inside a car in daylight, she sits in the driver's seat with the seatbelt on, selfie-style framing as if recording herself, windshield and a blurred road behind her. She looks at the camera and says in Brazilian Portuguese: "Antes de parar, olha a nota do posto. No Abastece aí você vê o histórico de fiscalização dos últimos cinco anos. Dados públicos da ANP."
CAMERA: handheld selfie angle, slight natural shake, no zoom. She ends smiling at the camera.
```

## Montagem local (feita aqui com ffmpeg, depois que você baixar os clipes)

1. Clipes do Flow → `brutos/flow/` (A, B, C).
2. Gravação real do app (Galaxy A56, `adb shell screenrecord`) entre a fala e o final: mapa, toggle, ficha do posto, elétrico.
3. Legenda palavra por palavra, gancho legível no quadro 0, trilha −18 dB.
4. `outro-logo.mp4` no fim (cross-fade de 0,3 s).
5. Rótulo de conteúdo com IA ao publicar. Nada vai ao ar sem `"aprovado": true` em `agenda.json`.

## Carrosséis e animação (sem Flow)

- **Carrossel "Como ler a nota ANP"** (estilo A): 1 "Você olha a nota do posto antes de abastecer?" · 2 "Todo posto fiscalizado pela ANP tem histórico público." · 3 "O AbastecAI transforma esse histórico em nota de 0 a 5." · 4 "Verde: bom histórico. Amarelo: atenção. Vermelho: ruim. Cinza: ainda não fiscalizado." · 5 "Dados públicos da ANP. AbastecAI na Play Store (link na bio)."
- **Carrossel "3 sinais antes de parar"** (estilo B): nota de fiscalização · CNPJ do posto · histórico de 5 anos.
- **Animação de pins** (15 s, sem pessoa): feita aqui com `render_canvas.py`, usando as cores do `visual.json`.
