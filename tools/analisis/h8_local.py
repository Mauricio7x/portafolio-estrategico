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

def construir(P, O, dom, col_depto, completos=False, filtro=None):
    reg = []; cob_of = 0; tot_of = 0
    for x in O:
        if x["portafolio"] not in P.index: continue
        f = P.loc[x["portafolio"]]
        if f["modalidad"] not in ("licitacion", "menor_cuantia") or pd.notna(f["excluido"]) or pd.notna(f["inconsistencia"]) or not x["ganador"]: continue
        if filtro and not filtro(f): continue
        obra = clave_depto(f[col_depto])
        if not obra: continue
        xs, prov, sin = [], [], 0
        for p_, _, _ in x["ofertas"]:
            tot_of += 1
            d = dom.get(p_[2:], {}).get("departamento") if p_.startswith("n:") else None
            if d is None: sin += 1; continue
            cob_of += 1; xs.append(1.0 if clave_depto(d) == obra else 0.0); prov.append(p_)
        if completos and sin: continue
        if x["ganador"] not in prov or len(xs) < 2 or len(set(xs)) < 2: continue
        reg.append({"codigo_entidad": f["codigo_entidad"], "modalidad": f["modalidad"], "anio": f["anio"], "x": np.array(xs), "y": prov.index(x["ganador"]),
                    "locales": int(sum(xs)), "n": len(xs), "gano_local": bool(xs[prov.index(x["ganador"])] == 1.0), "bogota": obra == "bogota",
                    "territorial": bool(__import__("re").search(r"alcaldia|gobernacion|municipio|departamento de|distrito", norm(f["entidad"] or "")))})
    return pd.DataFrame(reg), cob_of, tot_of

def resumen(D, cob=None, tot=None, bs=500):
    out = {"procesos": int(len(D))}
    if cob is not None: out["cobertura_ofertas_con_domicilio"] = {"con": cob, "total": tot, "fraccion": cob / tot if tot else None}
    if len(D) < 30: return out
    procs = list(zip(D["x"], D["y"])); b = ajustar(procs)
    out["razon_de_momios"] = math.exp(b); out["gano_local_de_cada_100"] = 100 * float(D["gano_local"].mean()); out["esperado_si_azar_de_cada_100"] = 100 * float((D["locales"] / D["n"]).mean())
    rng = np.random.default_rng(SEMILLA); ents = D["codigo_entidad"].fillna("(sin)").to_numpy(); u, inv = np.unique(ents, return_inverse=True)
    idx = [np.flatnonzero(inv == i) for i in range(len(u))]; vals = []
    for _ in range(bs):
        toma = rng.integers(0, len(u), len(u)); ii = np.concatenate([idx[t] for t in toma]); vals.append(math.exp(ajustar([procs[i] for i in ii])))
    out["ic95"] = [float(np.quantile(vals, .025)), float(np.quantile(vals, .975))]
    return out

if __name__ == "__main__":
    carpeta, aux, salida = sys.argv[1], sys.argv[2], sys.argv[3]
    dom = json.load(open(os.path.join(aux, "domicilios.json")))["domicilios"]
    P = pd.read_csv(os.path.join(salida, "procesos.csv")).set_index("portafolio"); O = cargar_ofertas(carpeta)
    out = {"nota": "Referencia: departamento de la SEDE de la entidad (no depende del ganador). La dirección del contrato (jbjy) solo se conoce del adjudicatario y se reporta como sensibilidad (auditoría 24-oct, defecto 2). Casos completos = todos los oferentes del proceso con domicilio (defecto 3)."}
    D, c, t = construir(P, O, dom, "departamento_entidad"); out["referencia_sede_entidad"] = resumen(D, c, t)
    out["por_modalidad"] = {m: resumen(g) for m, g in D.groupby("modalidad")}
    out["por_ventana"] = {"2024-2026": resumen(D[D["anio"] >= 2024]), "2019-2023": resumen(D[D["anio"] <= 2023])}
    out["bogota"] = {"obra_en_bogota": resumen(D[D["bogota"]]), "fuera_de_bogota": resumen(D[~D["bogota"]])}
    out["entes_territoriales"] = {"si": resumen(D[D["territorial"]]), "no": resumen(D[~D["territorial"]]), "si_fuera_de_bogota": resumen(D[D["territorial"] & ~D["bogota"]])}
    D2, c2, t2 = construir(P, O, dom, "departamento_entidad", completos=True); out["casos_completos_sede"] = resumen(D2, c2, t2)
    D3, c3, t3 = construir(P, O, dom, "departamento"); out["sensibilidad_direccion_del_contrato"] = resumen(D3, c3, t3)
    json.dump(out, open(os.path.join(salida, "fase3_h8_local.json"), "w"), ensure_ascii=False, indent=1)
    for k, v in out.items():
        if isinstance(v, dict) and "razon_de_momios" in v: print(k, {a: (round(b, 3) if isinstance(b, float) else b) for a, b in v.items() if a != "cobertura_ofertas_con_domicilio"})
