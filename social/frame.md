# frame.md — identidade de vídeo AbastecAI
> Todo vídeo (gerado no Flow, gravado ou animação) segue isto.

## Formato
- Entrega final 1080×1920 (9:16), 30 fps, H.264 + AAC. Os clipes do Flow saem em 720×1280/24 fps: fazer upscale e conformar na montagem.
- **Zona segura (ig-reel):** texto importante só entre **y=230 e y=1440**, com 80 px livres à esquerda e **230 px livres à direita**. Legenda fixa entre y=1200 e y=1440.
- Quadro 0 = capa: gancho legível já no primeiro quadro, sem animação de entrada.

## Cores
Fundo `#0D0F12`. Texto `#FFFFFF` / `#8A9099`. Combustível = laranja `#FF7A1A`. Elétrico = turquesa `#2FD9C4`. Nota: alta `#3DD68C`, média `#F5A623`, baixa `#E5484D`. "AI" do logo = ciano `#00B4D6` (medido no PNG do logo).

## Estrutura padrão do vídeo (15–30 s)
1. **0–3 s — gancho** (apresentadora fala e o gancho aparece escrito, quadro 0 legível).
2. **3–10 s — situação/solução** (cena no posto, carro ou recarga).
3. **10–20 s — demonstração com gravação REAL da tela do app** (nunca tela inventada pela IA).
4. **Últimos 3 s — cartão final padrão:** `brutos/flow/outro-logo.mp4` (mapa 3D escuro com pins, tirado de um clipe já gerado, com o **logo oficial PNG** sobreposto). Os clipes do Flow não geram transição nem logo: terminam na fala.

## Legenda fixa
Palavra por palavra, Space Grotesk 700 (mesma fonte de título do app), branca, palavra-chave em laranja (combustível) ou turquesa (elétrico), contorno escuro sutil. Sempre ligada: a maioria assiste sem som.

## Movimento
Câmera começa estilo UGC na mão, depois puxa para trás (drone) e o mundo vira o mapa 3D. Sem corte seco: transição por zoom-out/máscara.

## Áudio
Voz da apresentadora gerada no próprio Flow (Veo 3). Trilha discreta −18 dB sob a voz, só entra na demonstração.

## Pós-produção obrigatória
- Cartão final: usar a **animação do mapa que já termina com o logo** (ver "Padrão de edição aprovado" abaixo). **Não** sobrepor outro logo por cima dela.
- Desfocar ou recortar logos de bandeiras de postos.
- Rótulo "conteúdo com IA" ao publicar.

## Padrão de edição aprovado (vídeo 14, 12/10/2026)
- **0 a 3 s: cartão de gancho próprio** (arquivo `gancho.html`, renderizado com `render_canvas.py`): fundo `#0D0F12`, glows laranja e turquesa, linhas de rua, pins de nota no estilo do app, título em **Space Grotesk 700**, palavra-chave em laranja `#FF7A1A`, subtítulo em Inter, lockup do ícone do app + "AbastecAI". É o quadro 0 e serve de **capa**. O texto fica 100% estático desde o quadro 0; só os pins flutuam.
- **Depois do cartão**: cenas da apresentadora com **legenda palavra por palavra** (Segoe UI Bold 86 px, destaque laranja) e um texto de apoio por cena no topo (y ≥ 300).
- **Final**: usar **a animação do mapa que já termina com o logo** (clipe do Flow, 5 s), **sem sobrepor outro logo**. Só adicionar "Baixe na Play Store" abaixo.
- **Trilha de fundo** sintética (pad + pulso, 96 BPM, sem direitos autorais), mais alta no cartão e no final, baixa sob a voz. Gerada por `output/2026-10/14/v2/trilha.py`.
- Fonte de marca: `assets/fonts/SpaceGrotesk-Variable.ttf`.
