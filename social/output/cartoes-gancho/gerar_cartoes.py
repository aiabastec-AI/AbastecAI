"""Gera os cartões de gancho (PNG de capa + MP4 de 3 s) dos vídeos do AbastecAI.

Uso: python gerar_cartoes.py [numero ...]   (sem argumentos gera todos)
Saída: cartao-NN.png e cartao-NN.mp4 nesta pasta. HTML intermediário em html/.
"""
import html
import re
import subprocess
import sys
from pathlib import Path

AQUI = Path(__file__).resolve().parent
RENDER = Path(r"C:\dev\content-os\scripts\render_canvas.py")
LARANJA, TURQ = "#FF7A1A", "#2FD9C4"

# n, rótulo, título (**destaque**), subtítulo, tema (comb|ele)
CARTOES = [
    (1, "Combustível", "Primeira vez nesse posto. **Bom ou ruim?**", "O mapa me trouxe aqui e eu travei.", "comb"),
    (2, "Combustível", "**Bandeira branca.** Abasteço ou não?", "Não reconheci a marca e já tô na bomba.", "comb"),
    (3, "Elétrico", "Cheguei com **15%** e o plug não serve?", "Cabo na mão e nenhuma certeza.", "ele"),
    (4, "Combustível", "Carro de **600 cavalos**, posto qualquer?", "E eu vou botar gasolina de onde?", "comb"),
    (5, "Preço", "Só descubro o **preço** com a bomba na mão", "E se alguém já tivesse pago ali?", "comb"),
    (6, "Viagem", "**800 km** de estrada. Onde eu paro?", "Onde eu paro com todo mundo no carro?", "comb"),
    (7, "Pressa", "Fila dupla e **zero tempo** pra cadastro", "Não tenho tempo pra criar conta em nada.", "comb"),
    (8, "Rota", "Escolhi o posto. **E agora?**", "Trocar de app pra chegar lá cansa.", "comb"),
    (9, "Favoritos", "O posto **4.8** que eu não troco", "Agora não quero perder ele de vista.", "comb"),
    (10, "Dois carros", "**1 elétrico**, 1 flex, 1 mapa", "Lá em casa são dois mapas diferentes.", "ele"),
    (11, "Dúvida", "Esse app é **do governo?**", "Respondendo quem perguntou nos comentários.", "comb"),
    (12, "Bomba", "A bomba marcou **40 litros.** Entrou?", "Ilha de bombas, noite, e uma dúvida.", "comb"),
    (13, "Madrugada", "Abasteci às **3h.** Foi o posto?", "Rodo o dia inteiro e não escolho no chute.", "comb"),
    (14, "Combustível", "Gasolina **boa ou ruim?**", "A reserva acendeu e só tem esse posto.", "comb"),
    (15, "Viagem", "Preciso abastecer **antes de ir**", "Não conheço nenhum posto daqui.", "comb"),
    (16, "Bomba", "A bomba **enche menos?**", "O marcador correu rápido demais.", "comb"),
    (17, "Combustível", "Abasteci e o carro **engasgou**", "Foi a gasolina?", "comb"),
    (18, "Elétrico", "Vai demorar? **Tá funcionando?**", "12% de bateria e fila no carregador.", "ele"),
    (19, "Frentista", "Moça, essa gasolina **é boa?**", "A pergunta que a frentista mais ouve.", "comb"),
    (20, "Viagem", "Viagem amanhã. **Onde eu abasteço?**", "Posto de estrada eu não conheço.", "comb"),
    (21, "Grátis", "**Grátis?** Sem cadastro?", "Eu baixei na fila do posto.", "comb"),
]


def pin_nota(left, top, cor, nota):
    return (
        f'<svg class="pin" style="left:{left}px;top:{top}px" viewBox="0 0 150 190">'
        f'<circle cx="75" cy="75" r="62" fill="#171A1F" stroke="{cor}" stroke-width="12"/>'
        f'<text x="75" y="95" text-anchor="middle" font-family="Space Grotesk" font-weight="700" font-size="52" fill="{cor}">{nota}</text>'
        f'<rect x="69" y="136" width="12" height="46" rx="6" fill="{cor}"/></svg>'
    )


def pin_raio(left, top, cor):
    return (
        f'<svg class="pin" style="left:{left}px;top:{top}px" viewBox="0 0 150 190">'
        f'<circle cx="75" cy="75" r="62" fill="#171A1F" stroke="{cor}" stroke-width="12"/>'
        f'<path d="M82 36 L52 82 H72 L66 116 L100 66 H78 Z" fill="{cor}"/>'
        f'<rect x="69" y="136" width="12" height="46" rx="6" fill="{cor}"/></svg>'
    )


def tamanho_fonte(titulo):
    n = len(titulo.replace("**", ""))
    if n <= 24:
        return 112
    if n <= 32:
        return 100
    if n <= 40:
        return 90
    return 80


def montar(n, rotulo, titulo, sub, tema):
    cor_a, cor_b = (TURQ, LARANJA) if tema == "ele" else (LARANJA, TURQ)
    if tema == "ele":
        pins = pin_raio(880, 130, TURQ) + pin_nota(40, 1560, "#3DD68C", "4.8") + pin_raio(870, 1560, TURQ)
    else:
        pins = pin_nota(880, 130, "#3DD68C", "4.8") + pin_nota(40, 1560, "#F5A623", "3.1") + pin_raio(870, 1560, TURQ)
    t = re.sub(r"\*\*(.+?)\*\*", r'<span class="o">\1</span>', html.escape(titulo))
    dados = {
        "COR_A": cor_a, "COR_B": cor_b, "FONTE": str(tamanho_fonte(titulo)), "PINS": pins,
        "ROTULO": html.escape(rotulo), "TITULO": t, "SUB": html.escape(sub),
    }
    h = (AQUI / "template.html").read_text(encoding="utf-8")
    for k, v in dados.items():
        h = h.replace("{{" + k + "}}", v)
    saida = AQUI / "html" / f"cartao-{n:02d}.html"
    saida.parent.mkdir(exist_ok=True)
    saida.write_text(h, encoding="utf-8")
    return saida


def main():
    alvo = {int(x) for x in sys.argv[1:]} or {c[0] for c in CARTOES}
    for n, rot, tit, sub, tema in CARTOES:
        if n not in alvo:
            continue
        h = montar(n, rot, tit, sub, tema)
        png, mp4 = AQUI / f"cartao-{n:02d}.png", AQUI / f"cartao-{n:02d}.mp4"
        subprocess.run([sys.executable, str(RENDER), str(h), str(mp4), "--frame", "0", str(png)], check=True, capture_output=True)
        subprocess.run([sys.executable, str(RENDER), str(h), str(mp4)], check=True, capture_output=True)
        print(f"ok cartao-{n:02d}", flush=True)


if __name__ == "__main__":
    main()
