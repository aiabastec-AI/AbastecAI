# AbastecAI · Direção dos vídeos para o Google Flow (13 vídeos × 2 cenas)

Documento para copiar e colar. Cada vídeo tem **2 cenas de 8 a 10 s** com prompt completo. Fatos verificados no código e no banco em 12/10/2026. Falas escritas com as regras do framework de copy do projeto.

> ## ⚠️ ANTES DE GRAVAR QUALQUER DEMONSTRAÇÃO
> O mapa do app está **sem base** (só os pins aparecem sobre fundo bege). A API do Google respondeu: *"Google has disabled the use of APIs from this API project"*. O projeto GCP `abastecai` foi desativado pelo Google (quase sempre faturamento/conta). Enquanto isso não for resolvido, **não grave a tela do app**: o mapa vai aparecer vazio. Veja o relatório no chat.

---

## 0. Como usar

1. No Flow, crie a apresentadora **uma vez** e salve a imagem como referência (`brutos/flow/referencia-apresentadora.png` serve de ponto de partida).
2. Em **toda cena**: anexe a imagem de referência e cole `ESTILO` + `PERSONAGEM` + o prompt da cena.
3. **Continuidade entre cena 1 e cena 2**: gere a cena 1, escolha a melhor, e use o **último quadro dela como primeiro quadro** da cena 2 (Frames to Video) ou a função Extend, conforme a sua versão do Flow. Por isso o prompt da cena 2 começa com "Continue the previous shot".
4. Gere 2 a 3 variações de cada cena e escolha a melhor. Confira os créditos no contador do Flow antes de gerar em lote.
5. O Flow gera **só a apresentadora**. Telas do app, logo e legenda entram na montagem local (eu faço depois que você baixar os clipes).

### ESTILO (colar sempre)
```
Vertical 9:16 video, 10 seconds, native audio with clear Brazilian Portuguese speech. Photorealistic UGC social-media look, shot on a modern smartphone, natural light, realistic skin texture and fabric, slight handheld motion. No on-screen text, no subtitles, no captions, no logos, no brand names or car badges, no readable license plates, no readable phone or car screens, no map graphics, no transitions. One continuous take with no cuts. She stays in the same place and outfit for the whole clip and ends smiling at the camera.
```

### PERSONAGEM (colar sempre, trocar só a linha WARDROBE)
```
Apresentadora AbastecAI: Brazilian woman, about 30 years old, shoulder-length wavy brown hair, light-medium skin, brown eyes, warm confident smile, light natural makeup, small gold hoop earrings. Same face, same hair, same earrings in every shot. She speaks directly to the camera in a friendly, relaxed, natural tone. WARDROBE: [ver cada vídeo].
```

### NEGATIVO (se o Flow tiver o campo)
```
different person, different hair, different face, text, subtitles, captions, logos, brand names, car badges, readable license plates, readable screens, map graphics, distorted hands, extra fingers, transition effects, cartoon, watermark
```

### Regras do diretor
- **Elétrico** só aparece com carro elétrico e carregador; **combustão** só com bomba de combustível; **supercarro** só com supercarro. Nunca misture.
- Carros genéricos: peça "unbranded", sem emblemas. Nada de logos de bandeira de posto.
- Nenhuma criança em quadro (cadeirinha com bichinho de pelúcia basta).
- A apresentadora é **personagem**, não cliente real. Ative o rótulo de conteúdo com IA na hora de publicar.

---

## Quadro de vídeos

| # | Vídeo | Funil | Carro / cenário | Atenção |
|---|---|---|---|---|
| 1 | O que o GPS não conta | Descoberta | Hatch popular branco, posto de dia | |
| 2 | Parada no escuro | Descoberta | SUV na estrada, fim de tarde | |
| 3 | Conector errado | Consideração | Elétrico compacto, recarga em shopping | |
| 4 | Motor caro, posto qualquer | Consideração | Supercarro, posto premium à noite | |
| 5 | O preço que ninguém anota | Consideração | Sedan flex na bomba | Convite para reportar (hoje 10 relatos no total) |
| 6 | Parada com criança | Consideração | SUV de família, bagagem | |
| 7 | Abre e usa | Conversão | Hatch no trânsito, manhã | |
| 8 | Um app só até a bomba | Consideração | Sedan à noite, cidade | Navegação testada só parada/mock |
| 9 | Meu posto de confiança | Conversão | Hatch, posto de bairro | Avaliações de usuários: hoje 0 |
| 10 | Um elétrico, um flex | Consideração | Garagem com os dois carros | |
| 11 | Esse app é da ANP? | Consideração | Sem carro, selfie em casa | |
| 12 | A ficha que ninguém lê | Descoberta | Ilha de bombas à noite | |
| 13 | Quem roda o dia todo | Conversão | Sedan, madrugada | Sem preço na fala |

Números reais permitidos **só em texto de tela** (consulta de 12/10/2026): 43 mil+ postos, 31 mil+ com nota ANP, quase 2 mil pontos de recarga, 57 mil+ fiscalizações.

---

## VÍDEO 1 · O que o GPS não conta
**Funil:** Descoberta · **Dor:** o GPS leva ao posto, mas não diz nada sobre o histórico dele · **Funcionalidade:** pin com a nota ANP por cor
**Cenário/carro:** hatch popular branco, sem emblema, posto de combustível de dia, céu limpo
**WARDROBE:** light blue denim jacket over a plain white t-shirt, dark jeans
**Print real para a montagem:** mapa em "Combustível" com pins coloridos → toque num pin com a nota
**Gancho (tela, quadro 0):** "Seu GPS não te conta isso"
**Alternativos:** [medo] "Você abastece no escuro" · [curiosidade] "Seu posto tem histórico. Já viu?" · [humor] "GPS: você chegou. Chegou onde?"

**CENA 1 · câmera: ângulo de painel, depois plano médio**
Fala (19): *"O GPS te leva ao posto. Mas ele presta? O mapa comum não conta. A fiscalização da ANP conta."*
```
SCENE: Inside a white unbranded hatchback parked at a gas station forecourt in daylight, she sits in the driver's seat, windshield with pumps blurred behind her, a phone in a dashboard mount (screen not readable). Dashboard-level camera angle looking at her face, then she turns to the camera. She says in Brazilian Portuguese: "O GPS te leva ao posto. Mas ele presta? O mapa comum não conta. A fiscalização da ANP conta."
CAMERA: fixed dashboard-level shot with gentle handheld drift, slow push-in on her face. No cut.
```

**CENA 2 · câmera: plano aberto lateral na bomba**
Fala (22): *"No Abastece aí, a nota aparece no pin. Verde, nota alta. Vermelho, você pensa duas vezes. Procura Abastece aí na Play Store."*
```
SCENE: Continue the previous shot. Same woman, same outfit, same location. She has stepped out and stands beside the white hatchback at the fuel pump in daylight, holding her phone at chest height with the screen turned away from the camera. She looks at the camera and says in Brazilian Portuguese: "No Abastece aí, a nota aparece no pin. Verde, nota alta. Vermelho, você pensa duas vezes. Procura Abastece aí na Play Store."
CAMERA: medium-wide handheld shot from the side of the pump island, slow arc toward her face. No cut.
```
**Texto de tela:** cena 1 "GPS leva. Não avalia." · cena 2 "Nota ANP no pin" / "Verde, âmbar, vermelho"
**Legenda IG** · TÍTULO: O que o GPS não te mostra
LEGENDA: Seu GPS sabe o caminho até o posto, mas não sabe nada sobre o histórico de fiscalização dele. No AbastecAI, o pin já mostra a nota ANP: verde a partir de 4, âmbar a partir de 2,5, vermelho abaixo disso e cinza quando não há nota. Você decide antes de encostar na bomba. #AbastecAI #postodecombustivel #combustivel #motorista · Dados públicos da ANP.
CTA: Baixe o AbastecAI na Play Store ou abra no navegador.
**Objeção:** "Nota baixa quer dizer que o posto é ruim?" → "A nota resume o histórico de fiscalização da ANP daquele posto. Ela não acusa ninguém, ela mostra o registro pra você decidir."

---

## VÍDEO 2 · Parada no escuro
**Funil:** Descoberta · **Dor:** medo de abastecer num posto desconhecido na estrada, longe de casa · **Funcionalidade:** nota ANP no mapa e histórico na ficha
**Cenário/carro:** SUV prata genérico, rodovia no fim de tarde (golden hour), posto pequeno à beira da estrada
**WARDROBE:** olive green utility jacket over a grey t-shirt, jeans
**Print real:** mapa ao longo de uma rodovia → ficha do posto com Histórico ANP
**Gancho:** "Posto de estrada: você conhece?"
**Alternativos:** [medo] "O motor avisa depois" · [curiosidade] "Posto de estrada também tem ficha" · [humor] "Nome bonito não é nota"

**CENA 1 · câmera: selfie no volante**
Fala (22): *"Trezentos quilômetros de estrada e você abastece num posto que nunca viu? Se der problema, é longe de casa e de noite."*
```
SCENE: Inside a silver unbranded SUV driving on a highway at golden hour, she sits at the wheel in selfie-style framing, hands relaxed, orange sunset light across her face, a truck passing blurred in the window behind her. She looks at the camera and says in Brazilian Portuguese: "Trezentos quilômetros de estrada e você abastece num posto que nunca viu? Se der problema, é longe de casa e de noite."
CAMERA: handheld selfie angle at arm's length, slight natural shake, no zoom. No cut.
```

**CENA 2 · câmera: drone baixo, depois plano médio**
Fala (21): *"Antes de parar, abre o Abastece aí: nota da ANP no mapa, histórico de fiscalização na ficha. Tá na Play Store."*
```
SCENE: Continue the previous shot. Same woman, same outfit. The silver SUV is now parked at a small roadside gas station at dusk, warm light, the highway visible behind. She stands next to the car's open door, phone held casually (screen away from camera), looks at the camera and says in Brazilian Portuguese: "Antes de parar, abre o Abastece aí: nota da ANP no mapa, histórico de fiscalização na ficha. Tá na Play Store."
CAMERA: low smooth drone-style move from behind the car rising to a medium shot of her. No cut.
```
**Texto de tela:** c1 "Longe de casa, de noite" · c2 "Nota antes da parada" / "Histórico na ficha"
**Legenda** · TÍTULO: A parada que você não escolheu
LEGENDA: Na estrada, a gente para onde aparece. E se der problema, é longe de casa. O AbastecAI mostra a nota ANP de cada posto no mapa e, na ficha, o histórico dos últimos 5 anos: fiscalizações, infrações e amostras não conformes. Planeja a parada antes de ligar o carro. #AbastecAI #viagemdecarro #estrada #postodecombustivel · Dados públicos da ANP.
CTA: Baixe na Play Store antes da próxima viagem.
**Objeção:** "Na estrada nem tem sinal." → "Por isso vale olhar antes de sair: abre o mapa em casa, vê os postos do trajeto e já sai sabendo onde parar."

---

## VÍDEO 3 · Conector errado (ELÉTRICO)
**Funil:** Consideração · **Dor:** chegar no ponto de recarga e o conector não servir · **Funcionalidade:** filtro por conector e ficha de recarga (kW, Disponível/Offline)
**Cenário/carro:** **carro ELÉTRICO** compacto branco genérico, estação de recarga no estacionamento de um shopping, luz de fim de tarde
**WARDROBE:** white t-shirt under a teal bomber jacket, dark jeans
**Print real:** modo Elétrico → filtro de conector → ficha de recarga (kW, status)
**Gancho:** "Cheguei. O plugue não encaixa."
**Alternativos:** [medo] "Bateria no fim, conector errado" · [curiosidade] "O que eu vejo antes de ir" · [humor] "Meu carro e o carregador: sem diálogo"

**CENA 1 · câmera: plano de detalhe do cabo, depois rosto**
Fala (20): *"Bateria em dez por cento e o conector não servia no meu carro. Sem plano B, só um carregador inútil."*
```
SCENE: An electric-vehicle charging station in a shopping-center parking lot at late afternoon, a compact white unbranded electric car parked at an unbranded charger. She holds a charging cable connector in one hand, looking at the car's charge port with a frustrated expression, then turns to the camera and says in Brazilian Portuguese: "Bateria em dez por cento e o conector não servia no meu carro. Sem plano B, só um carregador inútil."
CAMERA: starts with a close shot on the connector and the charge port, then pulls back and tilts up to her face. Handheld. No cut.
```

**CENA 2 · câmera: plano americano, empurrão lento**
Fala (21): *"Agora eu filtro pelo meu conector no Abastece aí. Vejo a potência em kW e se está disponível. Baixa e testa."*
```
SCENE: Continue the previous shot. Same woman, same outfit, same charging station. Now the cable is plugged into the electric car and a small green charging light is visible on the charger. She stands beside the car, phone held at chest height with the screen turned away, relieved and smiling, and says in Brazilian Portuguese: "Agora eu filtro pelo meu conector no Abastece aí. Vejo a potência em kW e se está disponível. Baixa e testa."
CAMERA: medium shot from the front, slow push-in. No cut.
```
**Texto de tela:** c1 "Conector errado" / "Bateria em 10%" · c2 "Filtro por conector" / "kW e status"
**Legenda** · TÍTULO: O carregador estava lá. Não servia.
LEGENDA: Carro elétrico tem uma frustração específica: chegar no ponto de recarga e o conector não ser o seu. No AbastecAI, você filtra pelo tipo de conector e abre a ficha de cada ponto: potência em kW e status, Disponível ou Offline. Sai de casa sabendo onde vai encaixar. #AbastecAI #carroeletrico #recarga #mobilidadeeletrica
CTA: Ative o modo Elétrico no AbastecAI. Na Play Store ou no navegador.
**Objeção:** "O status é em tempo real?" → "A ficha mostra o status informado para cada ponto, Disponível ou Offline. Vale abrir antes de sair."

---

## VÍDEO 4 · Motor caro, posto qualquer (SUPERCARRO)
**Funil:** Consideração · **Dor:** receio de colocar combustível duvidoso num motor caro · **Funcionalidade:** filtro de nota mínima e ficha com histórico de 5 anos
**Cenário/carro:** **supercarro** baixo e largo, cor amarelo-neon ou preto fosco, sem emblemas, posto premium moderno à noite com cobertura iluminada e reflexos no chão molhado
**WARDROBE:** tailored black blazer over a black t-shirt, slim dark trousers
**Print real:** filtro de nota mínima → ficha com Histórico ANP, CNPJ, bandeira
**Gancho:** "Motor caro, posto qualquer?"
**Alternativos:** [medo] "O tanque que sai mais caro" · [curiosidade] "O que eu olho antes da bomba" · [humor] "Revisão em dia. Posto na sorte."

**CENA 1 · câmera: contra-plongée do carro e revelação**
Fala (21): *"Motor de seiscentos cavalos e você abastece em qualquer posto? Posto bonito e bandeira conhecida não mostram o histórico de fiscalização."*
```
SCENE: A modern premium gas station at night under a bright illuminated canopy, wet pavement reflecting the lights. A low, wide, unbranded neon-yellow supercar with no badges is parked at the pump. She walks into frame beside the supercar, stops, looks at the camera with a confident, knowing expression and says in Brazilian Portuguese: "Motor de seiscentos cavalos e você abastece em qualquer posto? Posto bonito e bandeira conhecida não mostram o histórico de fiscalização."
CAMERA: low-angle shot at bumper height sweeping across the supercar, then rising to reveal her. Cinematic, smooth. No cut.
```

**CENA 2 · câmera: dois personagens em plano fechado**
Fala (19): *"No Abastece aí, filtro por nota mínima e vejo cinco anos de fiscalização do posto. Procura na Play Store."*
```
SCENE: Continue the previous shot. Same woman, same black blazer, same night gas station, same supercar. She leans casually against the supercar's rear fender, phone in hand with the screen turned away from the camera, and says in Brazilian Portuguese: "No Abastece aí, filtro por nota mínima e vejo cinco anos de fiscalização do posto. Procura na Play Store."
CAMERA: tight medium shot with shallow depth of field, canopy lights as soft bokeh, slow dolly to the side. No cut.
```
**Texto de tela:** c1 "Fachada não é histórico" · c2 "Filtro: nota mínima" / "5 anos de fiscalização"
**Legenda** · TÍTULO: Fachada não é histórico
LEGENDA: Quem cuida de um motor caro escolhe tudo com critério. Menos, às vezes, o posto. O AbastecAI deixa filtrar por nota mínima e mostra na ficha os últimos 5 anos: fiscalizações, infrações e amostras não conformes, além de CNPJ e bandeira. Critério também na bomba. #AbastecAI #supercarros #carrosesportivos #combustivel · Dados públicos da ANP.
CTA: Baixe o AbastecAI na Play Store.
**Objeção:** "Quem tem carro desses só abastece em posto premium." → "Posto premium também tem histórico na ANP, como qualquer outro. A ficha mostra o registro, aí você confere em vez de supor."

---

## VÍDEO 5 · O preço que ninguém anota
**Funil:** Consideração · **Dor:** só descobrir o preço do litro quando já está na bomba · **Funcionalidade:** espaço para a comunidade reportar o preço que pagou (reportar exige login)
**Atenção:** hoje há **10 relatos no total** (último em 15/09/2026). Por isso este vídeo é um **convite para reportar**, não promete preço no posto de quem assiste. Na demonstração, mostre o formulário "Reportar" e só mostre um preço se existir relato real naquele posto.
**Cenário/carro:** sedan flex prata genérico, bomba de combustível de dia, display de preço **desfocado e ilegível**
**WARDROBE:** mustard yellow knit sweater, light jeans
**Print real:** seção "Preços" da ficha de um posto que tenha relato
**Gancho:** "Seu preço ajuda o próximo"
**Alternativos:** [medo] "Fila feita, preço surpresa" · [curiosidade] "E se todo mundo anotasse?" · [humor] "Placa de preço: modo surpresa"

**CENA 1 · câmera: ombro, foco puxando para o display**
Fala (22): *"Você só descobre o preço do litro quando já está na bomba? Aí já parou, fez fila e paga o que tiver."*
```
SCENE: A gas station in daylight, a silver unbranded sedan at a pump, she stands at the pump holding the fuel nozzle in one hand, the pump's price display blurred and unreadable behind her. She looks at the camera with a mildly annoyed, ironic expression and says in Brazilian Portuguese: "Você só descobre o preço do litro quando já está na bomba? Aí já parou, fez fila e paga o que tiver."
CAMERA: handheld over-the-shoulder shot that racks focus from the blurred pump display to her face. No cut.
```

**CENA 2 · câmera: plano médio, gesto com o celular**
Fala (21): *"No Abastece aí a comunidade reporta o preço que pagou. Quanto mais gente reporta, mais útil fica. Faz login e reporta."*
```
SCENE: Continue the previous shot. Same woman, same sweater, same pump and car. The nozzle is back in its holder. She holds her phone up beside her face (screen turned away from the camera) with a friendly smile and says in Brazilian Portuguese: "No Abastece aí a comunidade reporta o preço que pagou. Quanto mais gente reporta, mais útil fica. Faz login e reporta."
CAMERA: medium shot at eye level, slight handheld, gentle push-in. No cut.
```
**Texto de tela:** c1 "Preço descoberto tarde demais" · c2 "Reporte o que você pagou"
**Legenda** · TÍTULO: O preço que ninguém anota
LEGENDA: Todo motorista vê o preço na bomba. Quase nenhum deixa isso anotado para o próximo. O AbastecAI tem um espaço para a comunidade reportar o preço que pagou: gasolina, etanol, diesel ou GNV. É dado de motorista, não oficial. Quanto mais gente reporta, mais útil fica. Para reportar, é só entrar com sua conta. #AbastecAI #precodagasolina #motorista #comunidade
CTA: Abasteceu? Entre no app e reporte o preço que você pagou.
**Objeção:** "No meu posto não aparece preço nenhum." → "O preço só aparece onde alguém já reportou. Seja o primeiro no seu posto: faça login e reporte."

---

## VÍDEO 6 · Parada com criança
**Funil:** Consideração · **Dor:** viagem em família, parar num posto qualquer com o tanque no fim · **Funcionalidade:** rota no app, nota ANP, avaliações do Google na ficha
**Cenário/carro:** SUV/minivan familiar com **bagageiro de teto cheio**, porta-malas com malas, **cadeirinha infantil com bichinho de pelúcia (sem criança em quadro)**, manhã de viagem
**WARDROBE:** striped linen shirt over a white tank top, light denim shorts
**Print real:** traçar rota → "Iniciar navegação"; ficha do posto com nota ANP e bloco Google
**Gancho:** "Criança no banco, posto na sorte?"
**Alternativos:** [medo] "Parada errada, viagem longa" · [curiosidade] "A parada eu escolho em casa" · [humor] "Tá chegando? Pela vigésima vez."

**CENA 1 · câmera: porta-malas, travelling até ela**
Fala (22): *"Mil quilômetros com criança no carro. Você não para em qualquer posto. Mala cheia, alguém pedindo banheiro e o tanque no fim."*
```
SCENE: A family SUV parked in a driveway at early morning, trunk open and stuffed with suitcases, a roof box on top, a child car seat with a stuffed toy visible through the window (no child shown). She closes the trunk, turns to the camera with a half-tired, half-amused look and says in Brazilian Portuguese: "Mil quilômetros com criança no carro. Você não para em qualquer posto. Mala cheia, alguém pedindo banheiro e o tanque no fim."
CAMERA: smooth handheld tracking from behind the open trunk moving to a medium shot of her. No cut.
```

**CENA 2 · câmera: janela do passageiro, selfie suave**
Fala (21): *"Traço a rota no Abastece aí e escolho a parada pela nota ANP e avaliações do Google. Baixa antes de sair."*
```
SCENE: Continue the previous shot. Same woman, same outfit, same SUV. She now sits in the driver's seat with the seatbelt on, the stuffed toy visible on the back seat, morning light through the windshield. She holds the phone near the steering wheel (screen turned away) and says in Brazilian Portuguese: "Traço a rota no Abastece aí e escolho a parada pela nota ANP e avaliações do Google. Baixa antes de sair."
CAMERA: camera positioned at the passenger window looking in, steady, gentle push-in. No cut.
```
**Texto de tela:** c1 "Mala, criança, tanque no fim" · c2 "Parada escolhida antes" / "Nota ANP + Google"
**Legenda** · TÍTULO: A parada que eu escolho em casa
LEGENDA: Viagem em família não combina com parar no primeiro posto que aparece com o tanque no fim. No AbastecAI, eu vejo a nota ANP dos postos no mapa, confiro as avaliações do Google na ficha e traço a rota dentro do próprio app. A viagem começa mais tranquila quando a parada já está decidida. #AbastecAI #viagememfamilia #viagemdecarro #estrada · Dados públicos da ANP.
CTA: Baixe o AbastecAI antes da próxima viagem.
**Objeção:** "Dá pra ver posto no meio da estrada?" → "Dá pra buscar pela cidade do caminho ou navegar pelo mapa até o trecho e ver os postos com nota antes de sair."

---

## VÍDEO 7 · Abre e usa
**Funil:** Conversão · **Dor:** app que pede cadastro antes de mostrar qualquer coisa · **Funcionalidade:** mapa, ficha e rota sem cadastro
**Cenário/carro:** hatch cinza genérico parado no semáforo, manhã de dia útil, trânsito urbano, ela com pressa
**WARDROBE:** crisp white shirt with the sleeves rolled up, black blazer on the passenger seat
**Print real:** abertura do app → mapa já aparece, toque no posto, nota (**gravar com cronômetro, ~10 s**)
**Gancho:** "Sem cadastro. Sem senha."
**Alternativos:** [medo] "Mais um app pedindo e-mail?" · [curiosidade] "Dez segundos. Cronometra." · [humor] "Criar senha: nunca mais"

**CENA 1 · câmera: tripé no painel, cortes de ritmo (sem cortar o take)**
Fala (19): *"Você abre e o mapa já está lá. Sem cadastro, sem senha. Pressa de verdade não combina com formulário."*
```
SCENE: Inside a grey unbranded hatchback stopped at a traffic light in a busy city street on a weekday morning, she sits at the wheel, a coffee cup in the holder, glancing at the clock-less dashboard with a hurried look. She looks at the camera and says in Brazilian Portuguese: "Você abre e o mapa já está lá. Sem cadastro, sem senha. Pressa de verdade não combina com formulário."
CAMERA: camera on the dashboard facing her, locked off, with city traffic blurred through the windshield. No cut.
```

**CENA 2 · câmera: selfie rápida, ritmo mais vivo**
Fala (22): *"Toca no posto, vê a nota da ANP, traça a rota. Tudo sem conta. Abastece aí, na Play Store ou no navegador."*
```
SCENE: Continue the previous shot. Same woman, same outfit, same car and traffic. The light is still red. She holds her phone toward the camera in selfie style with the screen not readable, quick confident hand gestures counting three steps on her fingers, and says in Brazilian Portuguese: "Toca no posto, vê a nota da ANP, traça a rota. Tudo sem conta. Abastece aí, na Play Store ou no navegador."
CAMERA: handheld selfie at arm's length, energetic but steady. No cut.
```
**Texto de tela:** c1 "Zero formulário" · c2 "Toca, vê, vai" / "Play Store ou navegador"
**Legenda** · TÍTULO: O app que não pede nada
LEGENDA: Você está com pressa e o app quer seu e-mail, sua senha e sua data de nascimento. No AbastecAI, você abre e já usa: mapa com nota ANP, ficha do posto e rota, tudo sem cadastro. O login com Google só entra se você quiser avaliar, salvar favoritos ou reportar preço. #AbastecAI #semcadastro #motorista #postodecombustivel · Dados públicos da ANP.
CTA: Abra agora: Play Store ou navegador.
**Objeção:** "Então pra que serve o login?" → "Pra avaliar postos, salvar favoritos e reportar preço. Mapa, ficha e rota funcionam sem."

---

## VÍDEO 8 · Um app só até a bomba
**Funil:** Consideração · **Dor:** escolher o posto num app e trocar de tela no trânsito · **Funcionalidade:** rota e navegação passo a passo com voz
**Atenção:** a navegação com GPS em movimento só foi testada parada ou com simulação. Grave a tela com o carro parado ou com GPS simulado e não prometa além de "passo a passo com voz".
**Cenário/carro:** sedan escuro genérico, noite na cidade, luzes de semáforo em bokeh, celular no suporte do painel
**WARDROBE:** black leather jacket over a grey hoodie
**Print real:** ficha do posto → "Traçar rota" → "Iniciar navegação" (banner de manobra)
**Gancho:** "Escolheu o posto. E agora?"
**Alternativos:** [medo] "Olho na tela, não na rua" · [curiosidade] "Ele mostra a nota e me leva" · [humor] "Meu copiloto agora é o app"

**CENA 1 · câmera: reflexo no vidro, noite**
Fala (21): *"Dois apps pra chegar num posto? Você ainda faz isso? No trânsito, cada troca de tela é olho fora da rua."*
```
SCENE: Inside a dark unbranded sedan at night in a city, she sits at the wheel at a red traffic light, warm colorful traffic-light bokeh in the windshield, a phone in a dashboard mount (screen not readable). She looks at the camera with a skeptical raised eyebrow and says in Brazilian Portuguese: "Dois apps pra chegar num posto? Você ainda faz isso? No trânsito, cada troca de tela é olho fora da rua."
CAMERA: camera at the passenger side looking at her profile then at her face, slow rack of focus from the phone mount to her. No cut.
```

**CENA 2 · câmera: plano de perfil, ela aponta pra frente**
Fala (22): *"No Abastece aí, escolheu o posto, pede a rota. A voz te guia passo a passo até a bomba. Instala e vê."*
```
SCENE: Continue the previous shot. Same woman, same jacket, same car and night city. The light turns green. She smiles toward the camera and then points forward through the windshield as if following a voice instruction, and says in Brazilian Portuguese: "No Abastece aí, escolheu o posto, pede a rota. A voz te guia passo a passo até a bomba. Instala e vê."
CAMERA: steady profile shot from the passenger seat with soft city light flares, slight push-in. No cut.
```
**Texto de tela:** c1 "Troca de app no trânsito" · c2 "Rota dentro do app" / "Navegação com voz"
**Legenda** · TÍTULO: Do pin até a bomba
LEGENDA: Escolher o posto num lugar e navegar em outro é trocar de tela justo quando você deveria olhar a rua. No AbastecAI, você escolhe o posto pela nota ANP, pede a rota e segue com navegação passo a passo por voz, sem sair do app. #AbastecAI #transito #motorista #navegacao · Dados públicos da ANP.
CTA: Baixe o AbastecAI na Play Store.
**Objeção:** "Eu já tenho GPS no carro." → "Pode continuar usando. A diferença aqui é escolher o posto pela nota e já sair navegando, sem copiar nada pra outro lugar."

---

## VÍDEO 9 · Meu posto de confiança
**Funil:** Conversão · **Dor:** abastecer no automático, sem guardar qual posto é bom · **Funcionalidade:** favoritos (login Google) e avaliações
**Atenção:** hoje há **0 avaliações de usuários** no banco. Por isso a fala usa a nota e as avaliações do **Google** (que aparecem na ficha no Android) e o **favoritar**. Não diga que há avaliações de outros motoristas.
**Cenário/carro:** hatch vermelho genérico, posto de bairro de manhã cedo, café na mão
**WARDROBE:** soft pink cardigan over a white t-shirt, light jeans
**Print real:** ficha do posto → "Favoritar" → Configurações → "Ver favoritos" (**usar conta de teste, não a pessoal**)
**Gancho:** "Meu posto de confiança tem estrela"
**Alternativos:** [medo] "Hábito que ninguém revisa" · [curiosidade] "A lista que eu montei" · [humor] "Tenho posto favorito, sim"

**CENA 1 · câmera: plano médio com vapor do café**
Fala (18): *"Nunca escolhi posto: parava no primeiro que aparecia. Você também? Rotina corrida faz a gente abastecer no automático."*
```
SCENE: A neighborhood gas station early in the morning, soft golden light, a small red unbranded hatchback at the pump. She stands holding a takeaway coffee cup with steam visible, looks at the camera with a self-aware smile and says in Brazilian Portuguese: "Nunca escolhi posto: parava no primeiro que aparecia. Você também? Rotina corrida faz a gente abastecer no automático."
CAMERA: medium handheld shot, slight tilt up from the coffee cup to her face. No cut.
```

**CENA 2 · câmera: close com gesto da estrela**
Fala (20): *"Escolho pela nota ANP e avaliações do Google, e favorito no Abastece aí. Entra com Google e salva o seu."*
```
SCENE: Continue the previous shot. Same woman, same cardigan, same station and red hatchback. She sets the coffee on the car roof, takes out her phone (screen turned away), and with her free hand draws a small star in the air with her finger, smiling, saying in Brazilian Portuguese: "Escolho pela nota ANP e avaliações do Google, e favorito no Abastece aí. Entra com Google e salva o seu."
CAMERA: closer medium shot at eye level, gentle push-in on the star gesture and her smile. No cut.
```
**Texto de tela:** c1 "Abastecendo no automático" · c2 "Favorite seu posto"
**Legenda** · TÍTULO: O posto que eu escolhi de propósito
LEGENDA: Na correria, o posto escolhido é sempre o primeiro que aparece. Ninguém para pra pensar nisso. No AbastecAI, eu olho a nota ANP e a nota e as avaliações do Google na ficha. Gostei? Favorito, e ele fica salvo na minha conta. Para favoritar, é só entrar com Google. #AbastecAI #rotina #motorista #postodecombustivel · Dados públicos da ANP.
CTA: Entre com Google e salve seu posto de confiança.
**Objeção:** "Por que precisa de login pra favoritar?" → "Para sua lista ficar salva na sua conta. Para ver o mapa e as fichas não precisa."

---

## VÍDEO 10 · Um elétrico, um flex (AMBOS)
**Funil:** Consideração · **Dor:** dois carros, dois apps · **Funcionalidade:** botão Combustível / Elétrico / Ambos
**Cenário/carro:** **dois carros lado a lado** numa garagem residencial: um **elétrico** branco **plugado numa wallbox** e um **flex** prata. Luz suave de lâmpada de garagem
**WARDROBE:** beige trench-style shirt jacket over a black top, dark jeans
**Print real:** toggle trocando Combustível → Elétrico → Ambos
**Gancho:** "Um carro elétrico, outro flex"
**Alternativos:** [medo] "Mapa de posto, carro elétrico" · [curiosidade] "Um botão acabou com a briga" · [humor] "Ele: gasolina. Eu: tomada."

**CENA 1 · câmera: simetria entre os dois carros**
Fala (22): *"A gente tem dois carros: um elétrico, um flex. Só um mapa. Antes era um app pra cada e discussão no caminho."*
```
SCENE: A residential garage with two cars side by side: a white unbranded electric car plugged into a wall charger on the left, a silver unbranded flex hatchback on the right. She stands in the middle between the two cars and looks at the camera with a funny, resigned smile, gesturing to each car with an open hand as she says in Brazilian Portuguese: "A gente tem dois carros: um elétrico, um flex. Só um mapa. Antes era um app pra cada e discussão no caminho."
CAMERA: symmetric wide shot from the garage entrance with a slow push-in toward her. No cut.
```

**CENA 2 · câmera: plano médio, polegar acionando o botão**
Fala (22): *"No Abastece aí eu ligo o modo Ambos: posto com nota e ponto de recarga no mesmo mapa. Procura na Play Store."*
```
SCENE: Continue the previous shot. Same woman, same outfit, same garage and both cars. She raises her phone (screen turned away) and taps it once with her thumb with a satisfied look, then looks at the camera and says in Brazilian Portuguese: "No Abastece aí eu ligo o modo Ambos: posto com nota e ponto de recarga no mesmo mapa. Procura na Play Store."
CAMERA: medium shot, slow orbit a few degrees around her so both cars stay visible. No cut.
```
**Texto de tela:** c1 "Dois carros, dois apps" · c2 "Modo Ambos" / "Posto e recarga juntos"
**Legenda** · TÍTULO: Gasolina e tomada no mesmo mapa
LEGENDA: Um carro é elétrico, o outro é flex, e cada um tinha o seu app. No AbastecAI, o botão tem três opções: Combustível, Elétrico ou Ambos. No modo Ambos, os postos com nota ANP e os pontos de recarga aparecem juntos no mesmo mapa. #AbastecAI #carroeletrico #carroflex #mobilidade · Dados públicos da ANP.
CTA: Baixe o AbastecAI e ligue o modo Ambos.
**Objeção:** "Dá pra ver só os carregadores?" → "Dá. É só escolher Elétrico no botão. E dá pra filtrar pelo tipo de conector."

---

## VÍDEO 11 · Esse app é da ANP?
**Funil:** Consideração · **Dor:** desconfiar da origem da nota e achar que o app é oficial · **Funcionalidade:** app independente que organiza dados públicos
**Cenário:** **sem carro**. Home office claro, luz de janela, prateleira com livros e uma planta, notebook com tela desfocada
**WARDROBE:** soft grey crew-neck sweater, no jacket
**Print real:** ficha do posto (nota, histórico, CNPJ) + rodapé "app independente" da landing
**Gancho:** "Esse app é da ANP?"
**Alternativos:** [medo] "De onde vem essa nota?" · [curiosidade] "A ANP publica. Quase ninguém lê." · [humor] "Não, eu não sou da ANP"

**CENA 1 · câmera: selfie estática, ritmo de conversa**
Fala (21): *"Me perguntaram se o Abastece aí é da ANP. Não é. Organiza o que a ANP publica e quase ninguém lê."*
```
SCENE: A bright home office with a window, a bookshelf and a plant in the background, a laptop with a blurred screen on the desk. She sits facing the camera in a casual conversational pose and says in Brazilian Portuguese: "Me perguntaram se o Abastece aí é da ANP. Não é. Organiza o que a ANP publica e quase ninguém lê."
CAMERA: static smartphone selfie framing on a small tripod, soft window light on her face, subtle natural movement. No cut.
```

**CENA 2 · câmera: mesma posição, ela se inclina pra frente**
Fala (21): *"Fiscalização pública vira nota no mapa, com histórico e CNPJ na ficha. Quer conferir? Abre no navegador ou na Play Store."*
```
SCENE: Continue the previous shot. Same woman, same outfit, same home office. She leans slightly toward the camera with an inviting expression, one hand opening in a "check it out" gesture, and says in Brazilian Portuguese: "Fiscalização pública vira nota no mapa, com histórico e CNPJ na ficha. Quer conferir? Abre no navegador ou na Play Store."
CAMERA: same static framing with a very slow push-in. No cut.
```
**Texto de tela:** c1 "App independente" / "Dado público" · c2 "Nota, histórico, CNPJ"
**Legenda** · TÍTULO: Não é da ANP. E isso importa.
LEGENDA: O AbastecAI é um app independente, sem vínculo oficial com a ANP. O que ele faz é pegar o histórico público de fiscalização da ANP e transformar numa nota visível no mapa. Na ficha, você vê os últimos 5 anos de fiscalizações, infrações e amostras não conformes, além do CNPJ. #AbastecAI #dadospublicos #transparencia #combustivel · Dados públicos da ANP.
CTA: Confira você mesmo no navegador ou na Play Store.
**Objeção:** "Se não é da ANP, a nota vale o quê?" → "Ela é calculada a partir do histórico público de fiscalização da ANP. E a ficha mostra os registros que deram origem a ela."

---

## VÍDEO 12 · A ficha que ninguém lê
**Funil:** Descoberta · **Dor:** os dados existem, mas ninguém olha antes de abastecer · **Funcionalidade:** ficha (nota, 5 anos de histórico, CNPJ, bandeira, "Denunciar à ANP")
**Cenário/carro:** ilha de bombas à noite, cobertura com luz fria, bombas **sem marca legível**, um carro a combustão genérico escuro ao fundo, câmera próxima das bombas
**WARDROBE:** dark green puffer vest over a long-sleeve white top, black jeans
**Print real:** toque no pin → ficha completa → rolar até "Histórico ANP" e "Denunciar à ANP"
**Gancho:** "Esse posto tem ficha pública"
**Alternativos:** [medo] "Amostra fora do padrão fica registrada" · [curiosidade] "Cinco anos que você nunca viu" · [humor] "Li a ficha do posto. Sério."

**CENA 1 · câmera: travelling pela fileira de bombas**
Fala (20): *"O posto onde você abastece tem uma ficha pública. Você já leu? Fiscalizações, infrações e amostras, tudo registrado pela ANP."*
```
SCENE: A gas station pump island at night under a bright cold-white canopy, a dark unbranded car in the background, pumps with no legible brand marks. She stands beside a pump with arms loosely crossed, looks at the camera and says in Brazilian Portuguese: "O posto onde você abastece tem uma ficha pública. Você já leu? Fiscalizações, infrações e amostras, tudo registrado pela ANP."
CAMERA: smooth tracking shot moving along the row of pumps and settling on a medium shot of her. No cut.
```

**CENA 2 · câmera: over-the-shoulder no celular**
Fala (22): *"Abre o Abastece aí e toca no pin: nota, cinco anos de histórico e CNPJ. E um botão pra denunciar à ANP."*
```
SCENE: Continue the previous shot. Same woman, same vest, same night pump island. She holds her phone up in front of her and taps it with her thumb (screen turned away from the camera), then looks at the camera and says in Brazilian Portuguese: "Abre o Abastece aí e toca no pin: nota, cinco anos de histórico e CNPJ. E um botão pra denunciar à ANP."
CAMERA: close medium shot, camera slightly behind her shoulder, then drifting to her face. No cut.
```
**Texto de tela:** c1 "Registro público. Pouca gente olha." · c2 "Toca no pin" / "Denunciar à ANP"
**Legenda** · TÍTULO: O histórico que está à vista
LEGENDA: A ANP registra fiscalizações, infrações e amostras dos postos. A informação é pública, mas pouca gente lê. No AbastecAI, um toque no pin abre a ficha: nota ANP, histórico dos últimos 5 anos, CNPJ e bandeira. Viu algo errado? O botão Denunciar à ANP abre o formulário oficial. #AbastecAI #dadospublicos #consumidor #postodecombustivel · Dados públicos da ANP.
CTA: Abra o AbastecAI e leia a ficha do seu posto.
**Objeção:** "Nota baixa quer dizer combustível adulterado?" → "Não. A nota resume o histórico de fiscalização. A ficha mostra os registros e a conclusão fica com você."

---

## VÍDEO 13 · Quem roda o dia todo
**Funil:** Conversão · **Dor:** quem abastece todo dia não pode perder tempo nem ficar com o carro parado · **Funcionalidade:** nota ANP, favoritos e rota com voz
**Atenção:** a versão revisada **não fala mais de preço** (só há 10 relatos no banco).
**Cenário/carro:** sedan compacto escuro, **suporte de celular no painel sem marca de aplicativo**, madrugada na cidade, primeiro café, luz azulada do amanhecer
**WARDROBE:** dark navy hoodie, cap, minimal makeup
**Print real:** mapa Combustível → ficha com nota → Favoritar
**Gancho:** "Abasteço todo dia. Não posso errar."
**Alternativos:** [medo] "Carro parado, corrida perdida" · [curiosidade] "Meu mapa antes da primeira corrida" · [humor] "Passageiro me avalia. Eu avalio posto."

**CENA 1 · câmera: selfie de volante, luz do painel**
Fala (17): *"Doze horas rodando por app. Abastecer errado me tira da rua, e carro parado é corrida perdida."*
```
SCENE: Inside a dark compact sedan before dawn in a city, blue early-morning light through the windows and soft dashboard glow, she sits at the wheel in a navy hoodie and cap, a thermos cup in the holder and a phone in a plain dashboard mount (screen not readable, no app logos). She looks tired but determined, looks at the camera and says in Brazilian Portuguese: "Doze horas rodando por app. Abastecer errado me tira da rua, e carro parado é corrida perdida."
CAMERA: handheld selfie from the passenger side at shoulder height, slight natural shake. No cut.
```

**CENA 2 · câmera: externa, bomba, luz do amanhecer**
Fala (21): *"No Abastece aí eu vejo a nota da ANP, salvo meus postos e traço a rota com voz. Quem roda, baixa."*
```
SCENE: Continue the previous shot. Same woman, same hoodie and cap, same dark compact sedan. The car is now at a gas pump at sunrise, pale orange light on the horizon. She stands next to the car holding the phone (screen turned away) and says in Brazilian Portuguese: "No Abastece aí eu vejo a nota da ANP, salvo meus postos e traço a rota com voz. Quem roda, baixa."
CAMERA: medium shot from the front with slow push-in, sunrise flare behind her. No cut.
```
**Texto de tela:** c1 "Carro parado, corrida perdida" · c2 "Nota, favoritos e rota"
**Legenda** · TÍTULO: Quem roda não pode parar
LEGENDA: Para quem dirige por aplicativo, o carro é o trabalho. Abastecer no lugar errado custa o dia. No AbastecAI, eu vejo a nota ANP no mapa, salvo meus postos de confiança e vou com a rota por voz, sem trocar de app. #AbastecAI #motoristadeaplicativo #motorista #combustivel · Dados públicos da ANP.
CTA: Baixe na Play Store antes da primeira corrida de amanhã.
**Objeção:** "Não tenho tempo de ficar olhando app." → "Não precisa: favorite seus postos uma vez, e no dia a dia é só abrir e pedir a rota."

---

## Fila de produção sugerida (3 clipes por dia no Flow)

| Dia | Vídeos | Observação |
|---|---|---|
| 1 | 1, 3, 12 | Combustão, elétrico e ficha: cobre as 3 frentes |
| 2 | 4, 10, 11 | Supercarro, Ambos, objeção |
| 3 | 2, 7, 6 | Estrada, sem cadastro, família |
| 4 | 8, 9 | Navegação e favoritos (conta de teste) |
| 5 | 5, 13 | Vídeo 5 é convite para reportar preço |

Cada vídeo usa **2 gerações** (cena 1 e cena 2), mais variações. Com ~3 vídeos por dia são 6 cenas base.

## Montagem (depois que os clipes forem baixados)
1. Clipes em `social/brutos/flow/`. Gravação real do app no celular (mapa funcionando).
2. Gancho legível no quadro 0, legenda palavra por palavra (Space Grotesk 700), trilha −18 dB sob a voz.
3. Fim: `brutos/flow/outro-logo.mp4` (mapa com pins + logo oficial).
4. Rótulo de IA, `aprovado: true` no `agenda.json` só com o seu ok.
