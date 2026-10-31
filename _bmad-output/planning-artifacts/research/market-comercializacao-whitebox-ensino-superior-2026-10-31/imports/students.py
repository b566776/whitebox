import dns.resolver
from concurrent.futures import ThreadPoolExecutor
res = dns.resolver.Resolver(); res.lifetime=6; res.timeout=3; res.nameservers=["8.8.8.8","1.1.1.1"]
bases = ["uninassau.edu.br","ung.br","unama.br","cruzeirodosul.edu.br","unicid.edu.br","udf.edu.br","estacio.br","ibmec.edu.br","anhanguera.com","unopar.com.br","animaeducacao.com.br","unibh.br","unisul.br","una.br","usjt.br","afya.com.br","unicesumar.edu.br","unip.br","mackenzie.br","pucsp.br","pucpr.br","pucrs.br","pucminas.br","puc-rio.br","casperlibero.edu.br","uninter.com","uniasselvi.com.br","fgv.br","insper.edu.br","espm.br","unifor.br","unisinos.br","univali.br","unb.br","ufmg.br","ufrgs.br"]
subs = ["aluno","alunos","edu","discente","discentes","estudante","academico","acad","ead","sou","al","a","mail","email","g"]
def chk(d):
    try:
        m=sorted(str(r.exchange).rstrip(".") for r in res.resolve(d,"MX")); s=" ".join(m).lower()
        return "google" if "google" in s else "microsoft" if ("outlook" in s or "microsoft" in s) else "outro"
    except Exception: return None
jobs=[(b,f"{s}.{b}") for b in bases for s in subs]
with ThreadPoolExecutor(32) as ex: out=list(ex.map(lambda j:(j[0],j[1],chk(j[1])), jobs))
found={}
for b,d,p in out:
    if p: found.setdefault(b,[]).append(f"{d}={p}")
for b in bases: print(f"{b:24} | {' ; '.join(found.get(b,['(nenhum subdominio de aluno com MX)']))}")
