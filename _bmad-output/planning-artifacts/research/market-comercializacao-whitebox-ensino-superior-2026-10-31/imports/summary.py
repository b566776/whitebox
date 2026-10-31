import csv, re, collections, sys
rows=list(csv.DictReader(open(sys.argv[1],encoding="utf-8")))
pub=re.compile(r"federal|estadual|municipal|do estado|instituto federal|centro federal|universidade de s[ãa]o paulo|unicamp|\busp\b|unesp|cefet|fundação universidade|escola de governo|militar|polícia|força aérea|marinha|exército",re.I)
pubdom=re.compile(r"^(uf[a-z]{1,6}|ue[a-z]{1,6}|if[a-z]{1,6}|unb|usp|unicamp|unesp|unifesp|cefet[a-z-]*|unila|unilab|ufabc|utfpr|unipampa|unirio|furg|fur[a-z]+|uenf|uerj|uemg|udesc|unemat|uneb|uncisal|upe|uepa|uea|uems|unitins|unioeste|unicentro|uepg|unespar|uern|uece|urca|uva|uespi|uema|unimontes|uesb|uesc|uefs|uncisal|ifsp|ifrj|ifmg)\.(edu\.)?br$|\.gov\.br$|\.mil\.br$",re.I)
def sector(r):
    return "pública" if (pub.search(r["names"]) or pubdom.search(r["domain"])) else "privada"
def norm(p):
    if p.startswith("google"): return "Google"
    if p.startswith("microsoft"): return "Microsoft"
    if p=="outro": return "Outro (próprio/hospedagem/gateway)"
    if p=="sem_mx": return "Sem MX"
    return "Não resolvido (domínio morto/erro)"
for r in rows: r["sector"]=sector(r); r["prov"]=norm(r["provider_final"])
tot=collections.Counter(r["prov"] for r in rows)
print("TOTAL",len(rows),dict(tot))
for s in ("pública","privada"):
    sub=[r for r in rows if r["sector"]==s]; c=collections.Counter(r["prov"] for r in sub)
    live=[r for r in sub if r["prov"] in ("Google","Microsoft","Outro (próprio/hospedagem/gateway)")]
    cl=collections.Counter(r["prov"] for r in live)
    print(s,len(sub),dict(c)); print("  entre resolvidos:",len(live),{k:f"{v} ({100*v/len(live):.0f}%)" for k,v in cl.items()})
# names with centro universitário / universidade (bigger IES)
big=[r for r in rows if re.search(r"universidade|centro universit",r["names"],re.I)]
livebig=[r for r in big if r["prov"] in ("Google","Microsoft","Outro (próprio/hospedagem/gateway)")]
print("UNIV+CENTROS UNIV resolvidos",len(livebig),collections.Counter(r["prov"] for r in livebig))
for s in ("pública","privada"):
    l=[r for r in livebig if r["sector"]==s]; print("  ",s,len(l),collections.Counter(r["prov"] for r in l))
w=csv.DictWriter(open(sys.argv[2],"w",newline="",encoding="utf-8"),fieldnames=["domain","sector","prov","mx","names","types"],extrasaction="ignore"); w.writeheader(); w.writerows(sorted(rows,key=lambda r:(r["sector"],r["prov"],r["domain"])))
# sample private google universities/centros
print("\nPRIVADAS NO GOOGLE (universidade/centro universitário), amostra:")
for r in sorted(livebig,key=lambda r:r["names"]):
    if r["sector"]=="privada" and r["prov"]=="Google": print("  ",r["domain"],"|",r["names"][:70])
