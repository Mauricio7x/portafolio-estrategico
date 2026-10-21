#!/usr/bin/env python3
"""H8 · ventaja local: ¿gana más el oferente domiciliado en el departamento de la obra?
Uso:  python3 -I tools/analisis/h8_local.py <carpeta_base> <carpeta_aux> <carpeta_salida>
Dentro de cada proceso (licitación y menor cuantía, usable, ganador emparejado, 2+ ofertas con domicilio conocido y
al menos una local y una foránea), logit condicional con una sola variable «local» (misma clave de departamento que
la obra: dirección del contrato en jbjy, si no la de la entidad). Razón de momios con IC por remuestreo de entidades.
"""
import sys, os, json, math
import numpy as np, pandas as pd
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from analisis import SEMILLA, norm
from hipotesis import cargar_ofertas

def clave_depto(d):
    n = norm(d)
    if not n or n in ("no definido", "no provisto"): return None
    if "bogota" in n or "distrito capital" in n: return "bogota"
    return n.replace("departamento de ", "").replace("archipielago de ", "").strip()

def ajustar(procs):
    """β del logit condicional con 1 variable; procs = lista de (x: array 0/1, y: índice ganador)."""
    b = 0.0
    for _ in range(100):
        g = h = 0.0
        for x, y in procs:
            p = np.exp(b * x); p /= p.sum(); m = (p * x).sum()
            g += x[y] - m; h -= (p * (x - m) ** 2).sum()
        if h == 0: break
        paso = g / h; b -= paso
        if abs(paso) < 1e-10: break
    return b

if __name__ == "__main__":
    carpeta, aux, salida = sys.argv[1], sys.argv[2], sys.argv[3]
    dom = json.load(open(os.path.join(aux, "domicilios.json")))["domicilios"]
    P = pd.read_csv(os.path.join(salida, "procesos.csv")).set_index("portafolio")
    O = cargar_ofertas(carpeta)
    reg = []; cob_of = 0; tot_of = 0
    for x in O:
        if x["portafolio"] not in P.index: continue
        f = P.loc[x["portafolio"]]
        if f["modalidad"] not in ("licitacion", "menor_cuantia") or pd.notna(f["excluido"]) or pd.notna(f["inconsistencia"]) or not x["ganador"]: continue
        obra = clave_depto(f["departamento"])
        if not obra: continue
        xs, prov = [], []
        for p_, _, _ in x["ofertas"]:
            tot_of += 1
            d = dom.get(p_[2:], {}).get("departamento") if p_.startswith("n:") else None
            if d is None: continue
            cob_of += 1; xs.append(1.0 if clave_depto(d) == obra else 0.0); prov.append(p_)
        if x["ganador"] not in prov or len(xs) < 2 or len(set(xs)) < 2: continue
        reg.append({"codigo_entidad": f["codigo_entidad"], "modalidad": f["modalidad"], "anio": f["anio"], "x": np.array(xs), "y": prov.index(x["ganador"]),
                    "locales": int(sum(xs)), "n": len(xs), "gano_local": bool(xs[prov.index(x["ganador"])] == 1.0)})
    D = pd.DataFrame(reg)
    out = {"cobertura_ofertas_con_domicilio": {"con": cob_of, "total": tot_of, "fraccion": cob_of / tot_of if tot_of else None},
           "procesos_con_locales_y_foraneos": int(len(D))}
    if len(D):
        procs = list(zip(D["x"], D["y"])); b = ajustar(procs)
        out["razon_de_momios_local"] = math.exp(b)
        out["gano_local_de_cada_100"] = 100 * float(D["gano_local"].mean())
        out["esperado_si_azar_de_cada_100"] = 100 * float((D["locales"] / D["n"]).mean())
        rng = np.random.default_rng(SEMILLA); ents = D["codigo_entidad"].fillna("(sin)").to_numpy(); u, inv = np.unique(ents, return_inverse=True)
        idx = [np.flatnonzero(inv == i) for i in range(len(u))]; bs = []
        for _ in range(500):
            toma = rng.integers(0, len(u), len(u)); ii = np.concatenate([idx[t] for t in toma])
            bs.append(math.exp(ajustar([procs[i] for i in ii])))
        out["ic95_razon_de_momios"] = [float(np.quantile(bs, .025)), float(np.quantile(bs, .975))]
        out["por_modalidad"] = {m: {"procesos": int(len(g)), "gano_local_de_cada_100": 100 * float(g["gano_local"].mean()), "azar": 100 * float((g["locales"] / g["n"]).mean()), "razon_de_momios": math.exp(ajustar(list(zip(g["x"], g["y"]))))} for m, g in D.groupby("modalidad")}
        out["por_ventana"] = {k: {"procesos": int(len(g)), "razon_de_momios": math.exp(ajustar(list(zip(g["x"], g["y"]))))} for k, g in {"2024-2026": D[D["anio"] >= 2024], "2019-2023": D[D["anio"] <= 2023]}.items() if len(g) >= 30}
    json.dump(out, open(os.path.join(salida, "fase3_h8_local.json"), "w"), ensure_ascii=False, indent=1)
    print(json.dumps({k: v for k, v in out.items() if k != "por_modalidad"}, ensure_ascii=False))
