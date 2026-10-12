import json, re
A0, A1 = 0.55, 9.25       # corte da cena 1
B1 = 9.55                 # fim da cena 2
OFF2 = (A1 - A0)          # onde a cena 2 comeca na linha do tempo final
HOOK_FIM = 3.0
S1 = "Quando você vê a nota de um posto, de onde ela vem? Opinião de cliente é uma coisa. Fiscalização é outra."
S2 = "No AbastecAI, a nota vem do histórico público de fiscalização da ANP. Não é palpite. Você confere o registro na ficha."
def palavras(arq, script, shift, ini, fim):
    asr = [w for w in json.load(open(arq, encoding="utf-8"))["words"] if w.get("type") == "word"]
    sc = script.split()
    assert len(asr) == len(sc), (arq, len(asr), len(sc))
    out = []
    for a, s in zip(asr, sc):
        if a["end"] < ini or a["start"] > fim: continue
        out.append((a["start"] - ini + shift, a["end"] - ini + shift, s))
    return out
w = palavras("transcripts/CENA 1.json", S1, 0.0, A0, A1) + palavras("transcripts/CENA 2.json", S2, OFF2, 0.0, B1)
DEST = {"nota", "opinião", "fiscalização", "anp", "abastecai", "palpite", "histórico", "público"}
def ts(t):
    t = max(t, 0); h = int(t // 3600); m = int((t % 3600) // 60); s = t % 60
    return f"{h}:{m:02d}:{s:05.2f}"
LARANJA = r"{\c&H1A7AFF&}"; BRANCO = r"{\c&HFFFFFF&}"
blocos, cur = [], []
for x in w:
    if cur and (len(cur) >= 3 or x[0] - cur[-1][1] > 0.35 or re.search(r"[,.?!:]$", cur[-1][2])):
        blocos.append(cur); cur = []
    cur.append(x)
if cur: blocos.append(cur)
head = """[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
WrapStyle: 0

[V4+ Styles]
Format: Name,Fontname,Fontsize,PrimaryColour,SecondaryColour,OutlineColour,BackColour,Bold,Italic,Underline,StrikeOut,ScaleX,ScaleY,Spacing,Angle,BorderStyle,Outline,Shadow,Alignment,MarginL,MarginR,MarginV,Encoding
Style: Legenda,Segoe UI,86,&H00FFFFFF,&H00FFFFFF,&H00101010,&H00000000,-1,0,0,0,100,100,0,0,1,5,0,2,80,230,480,1
Style: Gancho,Segoe UI,104,&H00FFFFFF,&H00FFFFFF,&H00101010,&H00000000,-1,0,0,0,100,100,0,0,1,6,0,5,80,230,0,1
Style: Tela,Segoe UI,60,&H00FFFFFF,&H00FFFFFF,&H00101010,&H90000000,-1,0,0,0,100,100,0,0,3,10,0,8,80,230,300,1
Style: Fonte,Segoe UI,44,&H00DDDDDD,&H00DDDDDD,&H00101010,&H00000000,-1,0,0,0,100,100,0,0,1,3,0,8,80,230,410,1
Style: CTA,Segoe UI,72,&H00FFFFFF,&H00FFFFFF,&H00101010,&H00000000,-1,0,0,0,100,100,0,0,1,6,0,2,80,230,520,1

[Events]
Format: Layer,Start,End,Style,Name,MarginL,MarginR,MarginV,Effect,Text
"""
ev = []
# 1) cartao de gancho: visivel desde o quadro 0, sem animacao
ev.append("Dialogue: 1,%s,%s,Gancho,,0,0,0,,Nota de posto" % (ts(0), ts(HOOK_FIM)) + chr(92) + "N" + "não é " + LARANJA + "opinião" + BRANCO)
# 2) legenda palavra a palavra (depois do cartao)
T1_FIM = OFF2
for i, b in enumerate(blocos):
    ini = b[0][0]; fim = (blocos[i + 1][0][0] if i + 1 < len(blocos) else b[-1][1] + 0.2)
    fim = min(fim, b[-1][1] + 0.45)
    if fim <= HOOK_FIM: continue
    ini = max(ini, HOOK_FIM)
    txt = " ".join((LARANJA + p[2] + BRANCO) if re.sub(r"[^\wÀ-ú]", "", p[2]).lower() in DEST else p[2] for p in b)
    ev.append(f"Dialogue: 1,{ts(ini)},{ts(fim)},Legenda,,0,0,0,,{txt}")
# 3) texto de tela (apoio)
ev.append(f"Dialogue: 0,{ts(HOOK_FIM)},{ts(T1_FIM)},Tela,,0,0,0,,Opinião ≠ fiscalização")
ev.append(f"Dialogue: 0,{ts(OFF2)},{ts(OFF2 + B1)},Tela,,0,0,0,,Nota = histórico público da ANP")
ev.append(f"Dialogue: 0,{ts(OFF2 + 5.4)},{ts(OFF2 + B1)},Fonte,,0,0,0,,Dados públicos da ANP")
ev.append(f"Dialogue: 2,{ts(18.35)},{ts(20.85)},CTA,,0,0,0,,Baixe na Play Store")
open("legenda.ass", "w", encoding="utf-8-sig").write(head + "\n".join(ev) + "\n")
print("blocos:", len(blocos), "| fim principal:", OFF2 + B1)
