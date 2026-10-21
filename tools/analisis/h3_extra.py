#!/usr/bin/env python3
"""H3 corregida: la acumulación cerca de la mediana se mide contra la mediana de las OTRAS ofertas (sin la propia),
y se añade la acumulación en porcentajes redondos del presupuesto (la oferta como X,0 % o X,5 % exactos).
Uso: python3 -I tools/analisis/h3_extra.py <carpeta_base> <carpeta_salida>"""
import sys, os, json
import numpy as np, pandas as pd
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from hipotesis import cargar_ofertas
def exceso(vals, centro, ancho=0.5, vecinos=(1.0, 2.0)):
    v = np.asarray(vals); c = ((v >= centro - ancho) & (v < centro + ancho)).sum()
    lo = ((v >= centro - vecinos[1]) & (v < centro - vecinos[0])).sum(); hi = ((v >= centro + vecinos[0]) & (v < centro + vecinos[1])).sum()
    ref = (lo + hi) / 2 * (2 * ancho / (vecinos[1] - vecinos[0]))
    return {"en_la_celda": int(c), "esperado_por_vecinos": float(ref), "exceso_pct": (100 * (c - ref) / ref) if ref > 0 else None}
if __name__ == "__main__":
    carpeta, salida = sys.argv[1], sys.argv[2]
    P = pd.read_csv(os.path.join(salida, "procesos.csv")).set_index("portafolio"); O = cargar_ofertas(carpeta); R = {}
    for w, (a0, a1) in {"2024-2026": (2024, 2026), "2019-2026": (2019, 2026)}.items():
        for m in ["licitacion", "menor_cuantia"]:
            d_loo, redondo, redondo_medio, todas, r_vals = [], 0, 0, 0, []
            for x in O:
                if x["portafolio"] not in P.index: continue
                f = P.loc[x["portafolio"]]
                if f["modalidad"] != m or pd.notna(f["excluido"]) or pd.notna(f["inconsistencia"]) or not (a0 <= (f["anio"] or 0) <= a1): continue
                rs = np.array([o[2] for o in x["ofertas"]])
                for i, r in enumerate(rs):
                    todas += 1; p = 100 * r; r_vals.append(p)
                    if abs(p - round(p)) < 1e-6: redondo += 1
                    if abs(2 * p - round(2 * p)) < 1e-6: redondo_medio += 1
                if len(rs) >= 4:
                    for i, r in enumerate(rs):
                        otras = np.delete(rs, i); d_loo.append(100 * (r - np.median(otras)))
            # ofertas que coinciden EXACTAMENTE con otra oferta del mismo proceso (empates al peso)
            R[f"{w}|{m}"] = {"ofertas": todas, "pct_redondo_entero": 100 * redondo / todas if todas else None, "pct_redondo_medio_punto": 100 * redondo_medio / todas if todas else None,
                             "esperado_si_continuo_entero_pct": 100 * 1e-6 * 2 / 1, "ofertas_en_procesos_4_o_mas": len(d_loo),
                             "exceso_en_mediana_de_las_otras": exceso(d_loo, 0.0), "exceso_a_1_pt_bajo_mediana_otras": exceso(d_loo, -1.0), "exceso_a_1_pt_sobre": exceso(d_loo, 1.0),
                             "histograma_loo": {"bordes": list(np.arange(-10, 10.5, 0.5)), "conteos": [int(c) for c in np.histogram(np.clip(d_loo, -10, 10), bins=np.arange(-10, 10.5, 0.5))[0]]},
                             "distribucion_r_pct": {q: float(np.quantile(r_vals, q)) for q in (0.05, 0.1, 0.25, 0.5, 0.75, 0.9)}}
    json.dump(R, open(os.path.join(salida, "fase3_h3_extra.json"), "w"), ensure_ascii=False, indent=1)
    for k, v in R.items(): print(k, {kk: (round(vv, 2) if isinstance(vv, float) else vv) for kk, vv in v.items() if kk not in ("histograma_loo", "distribucion_r_pct")}, {q: round(x, 1) for q, x in v["distribucion_r_pct"].items()})
