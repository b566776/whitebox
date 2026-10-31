import dns.resolver, sys
res = dns.resolver.Resolver(); res.lifetime=8; res.timeout=4; res.nameservers=["8.8.8.8","1.1.1.1"]
targets = {
 "Ser Educacional (UNINASSAU)":"uninassau.edu.br","Ser Educacional (UNG)":"ung.br","Ser Educacional (UNAMA)":"unama.br","Ser Educacional (UNINORTE)":"uninorteac.com.br",
 "Cruzeiro do Sul":"cruzeirodosul.edu.br","Cruzeiro do Sul (UNICID)":"unicid.edu.br","Cruzeiro do Sul (UNIPÊ)":"unipe.edu.br","Cruzeiro do Sul (UDF)":"udf.edu.br","Cruzeiro do Sul (Braz Cubas)":"brazcubas.edu.br",
 "Yduqs (Estácio)":"estacio.br","Yduqs (Ibmec)":"ibmec.edu.br","Yduqs (Wyden)":"wyden.com.br",
 "Cogna (Anhanguera)":"anhanguera.com","Cogna (Unopar)":"unopar.com.br","Cogna (Pitágoras)":"pitagoras.com.br",
 "Ânima":"animaeducacao.com.br","Ânima (UniBH)":"unibh.br","Ânima (Unisul)":"unisul.br","Ânima (Una)":"una.br","Ânima (São Judas)":"usjt.br","Ânima (Anhembi Morumbi)":"anhembi.br",
 "Afya":"afya.com.br","Unicesumar":"unicesumar.edu.br","UNIP":"unip.br","Mackenzie":"mackenzie.br","PUC-SP":"pucsp.br","PUC-Rio":"puc-rio.br","PUCRS":"pucrs.br","PUC Minas":"pucminas.br","PUCPR":"pucpr.br",
 "Cásper Líbero":"casperlibero.edu.br","UCPel":"ucpel.edu.br","Uninter":"uninter.com","Unifesp":"unifesp.br","USP":"usp.br","Unicamp":"unicamp.br","UnB":"unb.br","UFC":"ufc.br","UFRGS":"ufrgs.br","UFMG":"ufmg.br","UFPE":"ufpe.br","UFPA":"ufpa.br","Unesp":"unesp.br","UEM":"uem.br","UEL":"uel.br","UFGD":"ufgd.edu.br","Unifesspa":"unifesspa.edu.br","UFOPA":"ufopa.edu.br","UTFPR":"utfpr.edu.br","UFRN":"ufrn.br","UFCA":"ufca.edu.br",
 "Senac SP":"sp.senac.br","FGV":"fgv.br","Insper":"insper.edu.br","ESPM":"espm.br","Unisinos":"unisinos.br","Feevale":"feevale.br","Univali":"univali.br","Unoesc":"unoesc.edu.br","UCS":"ucs.br","Unisc":"unisc.br","Unifor":"unifor.br","Unifacs":"unifacs.br","Unifametro":"unifametro.edu.br","Uniasselvi":"uniasselvi.com.br","Unifael":"fael.edu.br","Unigranrio":"unigranrio.edu.br","Unicarioca":"unicarioca.edu.br","Unisanta":"unisanta.br","Unoeste":"unoeste.br","Uniube":"uniube.br","Univates":"univates.br","Unochapecó":"unochapeco.edu.br",
}
def prov(d):
    try:
        m=sorted(str(r.exchange).rstrip(".") for r in res.resolve(d,"MX")); s=" ".join(m).lower()
        p="google" if "google" in s else "microsoft" if ("outlook" in s or "microsoft" in s) else "outro"
        return p, m[0]
    except Exception as e: return "erro:"+type(e).__name__, ""
for n,d in targets.items():
    p,m=prov(d); print(f"{p:10} | {n:32} | {d:24} | {m}")
