#!/usr/bin/env python3
"""Modelo estructural del ganador: P(gana la oferta i) deducida de las reglas del pliego, sin ajustar pesos a ciegas.
Idea: el puntaje de cada oferta lo fija la fórmula (4 métodos, sorteados parejo, H6). Lo que los datos abiertos no muestran
es cuáles ofertas quedaron HABILITADAS. Si cada oferta se habilita con probabilidad h (independiente), gana la primera
habilitada en el orden de puntaje: P(i gana | método m, ≥1 habilitada) = h(1-h)^{k_i} / (1-(1-h)^n), con k_i = ofertas con
más puntaje (los empates reparten: k = estrictamente mayores + (empatadas-1)/2, aproximación declarada).
Uso: python3 -I tools/analisis/estructural.py <carpeta_base> <carpeta_salida>
Ajuste de h por máxima verosimilitud con procesos de adjudicación ≤ 2024; prueba en 2025 (2026 intacto).
"""
import sys, os, json, math
import numpy as np, pandas as pd
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from modelo import puntajes, METODOS, PUNTAJE_MAX
from hipotesis import cargar_ofertas

def ranks_por_metodo(rs, mx, i):
    ks = []
    for m in METODOS:
        p = puntajes(rs, m, mx)
        if p is None: return None
        mayor = int((p > p[i] + 1e-12).sum()); iguales = int((np.abs(p - p[i]) <= 1e-12).sum())
        ks.append(mayor + (iguales - 1) / 2.0)
    return ks

def prob(ks, n, h):
    if h >= 1: return float(np.mean([1.0 if k == 0 else 0.0 for k in ks]))
    q = 1 - h; den = 1 - q ** n
    return float(np.mean([h * q ** k for k in ks])) / den

if __name__ == "__main__":
    carpeta, salida = sys.argv[1], sys.argv[2]
    P = pd.read_csv(os.path.join(salida, "procesos.csv")).set_index("portafolio"); O = cargar_ofertas(carpeta)
    R = []
    for x in O:
        if x["portafolio"] not in P.index or not x["ganador"]: continue
        f = P.loc[x["portafolio"]]
        if f["modalidad"] not in ("licitacion", "menor_cuantia") or pd.notna(f["excluido"]) or pd.notna(f["inconsistencia"]): continue
        rs = np.array([o[2] for o in x["ofertas"]]); prov = [o[0] for o in x["ofertas"]]
        if x["ganador"] not in prov or len(rs) < 2 or pd.isna(f["anio"]) or f["anio"] < 2022: continue
        i = prov.index(x["ganador"]); ks = ranks_por_metodo(rs, PUNTAJE_MAX[f["modalidad"]], i)
        if ks is None: continue
        R.append({"anio": int(f["anio"]), "modalidad": f["modalidad"], "n": len(rs), "ks": ks, "codigo_entidad": f["codigo_entidad"]})
    D = pd.DataFrame(R); print("procesos (2+ ofertas, 2022-2026):", len(D))
    hs = np.round(np.arange(0.05, 1.0001, 0.01), 2)
    def ll(sub, h): return float(np.mean([math.log(max(prob(r.ks, r.n, h), 1e-12)) for r in sub.itertuples()]))
    out = {"procesos": int(len(D))}
    tr = D[D["anio"] <= 2024]; te = D[D["anio"] == 2025]
    curva = {float(h): ll(tr, h) for h in hs}; h_mv = max(curva, key=curva.get)
    unif = lambda sub: float(np.mean([-math.log(r.n) for r in sub.itertuples()]))
    out["h_maxima_verosimilitud_<=2024"] = h_mv
    out["verosimilitud_media_entrenamiento"] = {"modelo": curva[h_mv], "uniforme": unif(tr)}
    out["verosimilitud_media_prueba_2025"] = {"modelo": ll(te, h_mv), "uniforme": unif(te), "procesos": int(len(te))}
    # ajuste por tramo de n y por modalidad (¿h cambia con el número de ofertas?)
    out["h_por_modalidad"] = {}
    for m, g in tr.groupby("modalidad"):
        c = {float(h): ll(g, h) for h in hs}; hm = max(c, key=c.get)
        out["h_por_modalidad"][m] = {"h": hm, "procesos": int(len(g)), "ll_prueba_2025": ll(te[te["modalidad"] == m], hm), "ll_uniforme_2025": unif(te[te["modalidad"] == m])}
    out["h_por_tramo_n"] = {}
    for nombre, lo, hi in [("2", 2, 2), ("3-4", 3, 4), ("5-9", 5, 9), ("10+", 10, 999)]:
        g = tr[(tr["n"] >= lo) & (tr["n"] <= hi)]; t2 = te[(te["n"] >= lo) & (te["n"] <= hi)]
        if len(g) < 50: continue
        c = {float(h): ll(g, h) for h in hs}; hm = max(c, key=c.get)
        out["h_por_tramo_n"][nombre] = {"h": hm, "procesos_ent": int(len(g)), "procesos_prueba": int(len(t2)), "ll_modelo_prueba": ll(t2, hm), "ll_uniforme_prueba": unif(t2)}
    # calibración de la probabilidad predicha del ganador real: ¿la probabilidad que el modelo da a la oferta que ganó es mayor que 1/n?
    pr = np.array([prob(r.ks, r.n, h_mv) for r in te.itertuples()]); nn = te["n"].to_numpy()
    out["prueba_2025_prob_media_asignada_al_ganador_real"] = {"modelo": float(pr.mean()), "uniforme": float((1 / nn).mean())}
    # calibración clásica: para cada oferta de cada proceso 2025, P(gana) predicha vs frecuencia (deciles)
    pred, obs = [], []
    for x in O:
        if x["portafolio"] not in P.index or not x["ganador"]: continue
        f = P.loc[x["portafolio"]]
        if f["anio"] != 2025 or f["modalidad"] not in ("licitacion", "menor_cuantia") or pd.notna(f["excluido"]) or pd.notna(f["inconsistencia"]): continue
        rs = np.array([o[2] for o in x["ofertas"]]); prov = [o[0] for o in x["ofertas"]]
        if x["ganador"] not in prov or len(rs) < 2: continue
        for j in range(len(rs)):
            ks = ranks_por_metodo(rs, PUNTAJE_MAX[f["modalidad"]], j)
            if ks is None: break
            pred.append(prob(ks, len(rs), h_mv)); obs.append(1.0 if prov[j] == x["ganador"] else 0.0)
    pred = np.array(pred); obs = np.array(obs)
    dec = pd.qcut(pd.Series(pred).rank(method="first"), 10, labels=False)
    tab = pd.DataFrame({"p": pred, "y": obs, "d": dec}).groupby("d").agg(pred=("p", "mean"), obs=("y", "mean"), n=("y", "size"))
    out["calibracion_2025_ofertas"] = {"filas": int(len(pred)), "brier": float(np.mean((pred - obs) ** 2)), "brier_uniforme_1_sobre_n": None,
                                       "pendiente": float(np.polyfit(tab["pred"], tab["obs"], 1)[0]), "deciles": tab.round(4).to_dict("records")}
    json.dump(out, open(os.path.join(salida, "estructural.json"), "w"), ensure_ascii=False, indent=1)
    print(json.dumps({k: v for k, v in out.items() if k != "calibracion_2025_ofertas"}, ensure_ascii=False, indent=1))
    c = out["calibracion_2025_ofertas"]; print("calibración 2025:", c["filas"], "ofertas · Brier", round(c["brier"], 4), "· pendiente", round(c["pendiente"], 3))
    print(tab.round(3))
