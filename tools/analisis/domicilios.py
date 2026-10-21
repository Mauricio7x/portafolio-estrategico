#!/usr/bin/env python3
"""H8 · domicilio de los oferentes desde «SECOP II - Proveedores Registrados» (qmzu-gj57), por NIT válido.
Uso:  python3 -I tools/analisis/domicilios.py <carpeta_base> <carpeta_aux>
Escribe <aux>/domicilios.json: {nit: {departamento, municipio, ubicacion, es_grupo, tipo_empresa}}. Solo lee; no guarda
nombres ni datos de contacto. Un NIT con más de una fila y departamentos distintos queda «ambiguo» (null).
"""
import sys, os, json, gzip, subprocess, urllib.parse, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

def soql(ds, params, reintentos=4):
    url = "https://www.datos.gov.co/resource/%s.json?%s" % (ds, urllib.parse.urlencode(params, quote_via=urllib.parse.quote))
    for i in range(reintentos):
        out = subprocess.run(["curl", "-sS", "-m", "120", url], capture_output=True, text=True).stdout
        try: return json.loads(out)
        except Exception: time.sleep(2 * (i + 1))
    return None

def nits_de_la_base(carpeta):
    nits = set()
    with gzip.open(os.path.join(carpeta, "base.jsonl.gz"), "rt", encoding="utf-8") as f:
        for l in f:
            if not l.strip(): continue
            x = json.loads(l)
            for o in x.get("ofertas_validas") or []:
                p = o.get("proveedor") or ""
                if p.startswith("n:") and p[2:].isdigit(): nits.add(p[2:])
    return sorted(nits)

if __name__ == "__main__":
    carpeta, aux = sys.argv[1], sys.argv[2]
    nits = nits_de_la_base(carpeta); print("NIT válidos distintos en ofertas válidas:", len(nits))
    out, fallos = {}, []
    for i in range(0, len(nits), 100):
        lote = nits[i:i + 100]
        r = soql("qmzu-gj57", {"$select": "nit,departamento,municipio,ubicacion,es_grupo,tipo_empresa,esta_activa", "$where": "nit in (%s)" % ",".join("'%s'" % n for n in lote), "$limit": "5000"})
        if r is None: fallos.append(lote); continue
        for x in r:
            n = x.get("nit"); d = (x.get("departamento") or "").strip()
            if not n: continue
            if d.lower() in ("", "no provisto", "no definido"): d = None
            prev = out.get(n)
            if prev is None: out[n] = {"departamento": d, "municipio": x.get("municipio"), "ubicacion": x.get("ubicacion"), "es_grupo": x.get("es_grupo"), "tipo_empresa": x.get("tipo_empresa"), "filas": 1}
            else:
                prev["filas"] += 1
                if prev["departamento"] and d and prev["departamento"] != d: prev["departamento"] = None; prev["ambiguo"] = True
                elif not prev["departamento"] and d: prev["departamento"] = d
        if (i // 100) % 20 == 0: print(i, "de", len(nits), "·", len(out), "encontrados", flush=True)
    res = {"consulta": "2026-10-21", "nits_buscados": len(nits), "encontrados": len(out), "con_departamento": sum(1 for v in out.values() if v["departamento"]), "lotes_fallidos": len(fallos), "domicilios": out}
    json.dump(res, open(os.path.join(aux, "domicilios.json"), "w"), ensure_ascii=False)
    print("listo:", res["encontrados"], "encontrados,", res["con_departamento"], "con departamento;", len(fallos), "lotes fallidos")
