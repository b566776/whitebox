import csv, sys, collections
from concurrent.futures import ThreadPoolExecutor
import dns.resolver
src, out = sys.argv[1], sys.argv[2]
res = dns.resolver.Resolver(); res.lifetime = 8; res.timeout = 4; res.nameservers = ["8.8.8.8","1.1.1.1","9.9.9.9"]
def mx(d):
    try:
        a = res.resolve(d, "MX"); m = sorted(str(r.exchange).rstrip(".") for r in a)
        s=" ".join(m).lower()
        return m, ("google" if "google" in s else "microsoft" if ("outlook" in s or "microsoft" in s) else "outro")
    except dns.resolver.NXDOMAIN: return [], "nxdomain"
    except dns.resolver.NoAnswer: return [], "sem_mx"
    except Exception: return [], "erro"
def spf(d):
    try:
        for r in res.resolve(d, "TXT"):
            t = b"".join(r.strings).decode(errors="ignore").lower()
            if t.startswith("v=spf1"):
                if "_spf.google.com" in t: return "google"
                if "protection.outlook.com" in t: return "microsoft"
                return "outro"
    except Exception: pass
    return ""
rows = list(csv.DictReader(open(src, encoding="utf-8")))
def work(r):
    r = dict(r)
    if r["provider"] in ("erro","sem_mx"):
        m, p = mx(r["domain"]); r["mx"] = ";".join(m); r["provider"] = p
    r["spf"] = spf(r["domain"]) if r["provider"] in ("outro","sem_mx","erro") else ""
    r["provider_final"] = r["provider"] if r["provider"] in ("google","microsoft","nxdomain") else (
        f"{r['spf']}_via_gateway" if r["spf"] in ("google","microsoft") else r["provider"])
    return r
with ThreadPoolExecutor(24) as ex: rows = list(ex.map(work, rows))
with open(out,"w",newline="",encoding="utf-8") as f:
    w=csv.DictWriter(f, fieldnames=list(rows[0].keys())); w.writeheader(); w.writerows(rows)
print(collections.Counter(r["provider_final"] for r in rows))
tc=collections.Counter()
for r in rows:
    for t in r["types"].split(" | "): tc[t]+=1
print(tc.most_common(45))
