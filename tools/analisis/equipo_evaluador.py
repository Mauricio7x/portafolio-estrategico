#!/usr/bin/env python3
"""Aproximación con datos abiertos a «el comité cambia cuando cambian los contratistas»: contratos de prestación de servicios cuyo objeto es
evaluar ofertas/propuestas/procesos de selección (jbjy-vk9h, firmados desde 2022). Los contratistas se reemplazan por un hash corto y
solo se usan para detectar CAMBIOS de equipo. Época = el conjunto de contratistas de evaluación activos de la entidad en la fecha de cierre
del proceso. Prueba: ¿se parecen más entre sí los procesos de la misma época que los de épocas distintas, a igual distancia en días?
Contraste: el mismo estadístico con el calendario de la entidad corrido al azar (cambios de equipo que no corresponden a la fecha real).
Uso: python3 -I equipo_evaluador.py <carpeta_resultados> <carpeta_base> <contratos_evaluacion.json> """
import sys, os, json, gzip, datetime as dt
import numpy as np, pandas as pd
SEMILLA = 20261024
def d(s):
    try: return dt.date.fromisoformat(s[:10])
    except Exception: return None
def epoca(contratos, f):
    activos = sorted(c["p"] for c in contratos if d(c["ini"]) and d(c["fin"]) and d(c["ini"]) <= f <= d(c["fin"]))
    return "|".join(activos) if activos else "-"
def estadistico(P, calendario, desplazamiento=0, max_gap=365):
    """Diferencia de correlación (misma época − distinta época) en pares de la misma entidad a ≤ max_gap días, promedio sobre métricas."""
    out = {}
    for m in ("baja_n", "n_r", "z_r", "mb_r"):
        A, B, S = [], [], []
        for nit, g in P.groupby("nit"):
            cons = calendario.get(nit)
            if not cons or len(g) < 6: continue
            g = g.sort_values("fc"); f = list(g["fc"]); v = g[m].to_numpy(float)
            ep = [epoca(cons, x + dt.timedelta(days=desplazamiento)) for x in f]
            n = len(g)
            for i in range(n):
                for j in range(i + 1, n):
                    if (f[j] - f[i]).days > max_gap: break
                    if np.isfinite(v[i]) and np.isfinite(v[j]): A.append(v[i]); B.append(v[j]); S.append(ep[i] == ep[j])
        A, B, S = np.array(A), np.array(B), np.array(S)
        if S.sum() < 50 or (~S).sum() < 50: out[m] = None; continue
        c = lambda x, y: float(np.corrcoef(x, y)[0, 1])
        out[m] = {"pares_misma_epoca": int(S.sum()), "pares_epoca_distinta": int((~S).sum()), "corr_misma": c(A[S], B[S]), "corr_distinta": c(A[~S], B[~S]), "dif": c(A[S], B[S]) - c(A[~S], B[~S])}
    return out
if __name__ == "__main__":
    res, base, arch = sys.argv[1], sys.argv[2], sys.argv[3]
    cal = json.load(open(arch)); nit_de = {}
    with gzip.open(os.path.join(base, "base.jsonl.gz"), "rt") as f:
        for l in f:
            x = json.loads(l)
            if x.get("nit_entidad"): nit_de[x["portafolio"]] = x["nit_entidad"]
    P = pd.read_csv(os.path.join(res, "procesos.csv"))
    U = P[P.excluido.isna() & P.inconsistencia.isna() & P.modalidad.isin(["licitacion", "menor_cuantia"]) & P.fecha_cierre.notna() & P.r_ganador.notna() & (P.n >= 3)].copy()
    U["nit"] = U.portafolio.map(nit_de); U = U[U.nit.isin([n for n, v in cal.items() if len(v) >= 4])]
    U["fc"] = U.fecha_cierre.map(lambda s: d(s)); U = U[U.fc.notna() & (U.fc >= dt.date(2022, 1, 1))]
    U["baja"] = 100 * (1 - U.r_adj); U["mb"] = U.ganador_mas_bajo.astype(float)
    ao = pd.to_datetime(U.fc.map(lambda x: x.isoformat())).dt.year
    U["tr"] = pd.cut(U.n, [2, 4, 9, 19, 10**6], labels=["3-4", "5-9", "10-19", "20+"])
    U["baja_n"] = U.baja - U.groupby(["modalidad", "tr", ao])["baja"].transform("mean")
    U["n_r"] = np.log(U.n) - U.groupby(["modalidad", ao])["n"].transform(lambda s: np.log(s).mean())
    U["z_r"] = U.z_ganador - U.groupby(["modalidad", ao])["z_ganador"].transform("mean")
    U["mb_r"] = U.mb - U.groupby(["modalidad", ao])["mb"].transform("mean")
    print("procesos:", len(U), "· entidades:", U.nit.nunique())
    real = estadistico(U, cal)
    rng = np.random.default_rng(SEMILLA); nulos = {m: [] for m in real}
    for _ in range(60):
        k = int(rng.choice([-1, 1]) * rng.integers(90, 271)); r = estadistico(U, cal, k)
        for m in real:
            if r.get(m): nulos[m].append(r[m]["dif"])
    salida = {"procesos": int(len(U)), "entidades": int(U.nit.nunique()), "real": real, "nulo_calendario_corrido": {m: {"n": len(v), "media": float(np.mean(v)) if v else None, "p95": float(np.quantile(v, .95)) if v else None} for m, v in nulos.items()}}
    for m in real:
        if real[m]: salida.setdefault("p_empirico", {})[m] = (1 + sum(x >= real[m]["dif"] for x in nulos[m])) / (1 + len(nulos[m]))
    json.dump(salida, open(os.path.join(res, "equipo_evaluador.json"), "w"), ensure_ascii=False, indent=1)
    print(json.dumps(salida, ensure_ascii=False, indent=1))
