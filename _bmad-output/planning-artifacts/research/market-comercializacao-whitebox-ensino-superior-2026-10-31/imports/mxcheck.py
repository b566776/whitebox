import csv, sys, re
from urllib.parse import urlparse
from concurrent.futures import ThreadPoolExecutor
import dns.resolver

src, out = sys.argv[1], sys.argv[2]
SLD = {"edu.br","com.br","org.br","net.br","gov.br","br"}
def base_domain(url):
    host = urlparse(url if "://" in url else "http://"+url).hostname or ""
    host = host.lower().strip(".")
    if host.startswith("www."): host = host[4:]
    parts = host.split(".")
    if len(parts) >= 3 and ".".join(parts[-2:]) in SLD and parts[-1]=="br":
        return ".".join(parts[-3:])
    return ".".join(parts[-2:]) if len(parts)>=2 else host

rows = {}
with open(src, encoding="utf-8") as f:
    for r in csv.DictReader(f):
        d = base_domain(r["website"])
        if not d or "." not in d: continue
        e = rows.setdefault(d, {"domain": d, "names": set(), "types": set()})
        e["names"].add(r["itemLabel"]); e["types"].add(r["typeLabel"])

res = dns.resolver.Resolver(); res.lifetime = 6; res.timeout = 3
res.nameservers = ["8.8.8.8", "1.1.1.1"]
def classify(mx):
    s = " ".join(mx).lower()
    if "google" in s or "googlemail" in s: return "google"
    if "outlook" in s or "microsoft" in s or "office365" in s: return "microsoft"
    if not mx: return "sem_mx"
    return "outro"
def lookup(d):
    try:
        ans = res.resolve(d, "MX")
        mx = sorted(str(r.exchange).rstrip(".") for r in ans)
        return d, mx, classify(mx), ""
    except dns.resolver.NXDOMAIN: return d, [], "nxdomain", "NXDOMAIN"
    except dns.resolver.NoAnswer: return d, [], "sem_mx", "NoAnswer"
    except Exception as ex: return d, [], "erro", type(ex).__name__

doms = sorted(rows)
print(f"{len(doms)} dominios unicos", file=sys.stderr)
with ThreadPoolExecutor(32) as ex, open(out, "w", newline="", encoding="utf-8") as f:
    w = csv.writer(f); w.writerow(["domain","provider","mx","names","types","error"])
    for d, mx, prov, err in ex.map(lookup, doms):
        e = rows[d]
        w.writerow([d, prov, ";".join(mx), " | ".join(sorted(e["names"]))[:200], " | ".join(sorted(e["types"]))[:120], err])
