#!/usr/bin/env python3
"""Huella indirecta de «el comité evaluador cambia»: dentro de una entidad, ¿se parecen más las decisiones de procesos
cercanos en el tiempo que las de procesos lejanos? Los evaluadores no están en los datos abiertos; esto solo mide si hay
persistencia de «estilo» por entidad y por ventana de tiempo.
Medidas por proceso (licitación y menor cuantía, usables, 3+ ofertas, ganador emparejado): z del ganador (qué tan lejos de la
media de las ofertas queda quien gana), «gana la más baja», baja del ganador. Pares dentro de la entidad por distancia en días
entre fechas de adjudicación. Correlación de Pearson por intervalo de distancia, IC por remuestreo de entidades. También: ¿repite el
mismo ganador entre procesos cercanos más que entre lejanos? Uso: python3 -I evaluadores.py <carpeta_salida> """
import sys, os, json
import numpy as np, pandas as pd
SEMILLA = 20261024
BANDAS = [("0-60", 0, 60), ("61-180", 61, 180), ("181-365", 181, 365), ("366-730", 366, 730), (">730", 731, 99999)]
def pares(df, col):
    out = []
    for ent, g in df.groupby("codigo_entidad"):
        g = g.sort_values("f"); f = g["f"].to_numpy(); v = g[col].to_numpy(float); gid = g["ganador_id"].to_numpy(object)
        n = len(g)
        if n < 4 or n > 400: continue
        i, j = np.triu_indices(n, 1)
        d = (f[j] - f[i]).astype("timedelta64[D]").astype(int)
        out.append(pd.DataFrame({"ent": ent, "d": d, "a": v[i], "b": v[j], "mismo": (gid[i] == gid[j]) & pd.notna(gid[i])}))
    return pd.concat(out) if out else pd.DataFrame()
def corr(x, y):
    m = np.isfinite(x) & np.isfinite(y)
    if m.sum() < 30 or np.std(x[m]) == 0 or np.std(y[m]) == 0: return None
    return float(np.corrcoef(x[m], y[m])[0, 1])
def boot(P, banda, fn, reps=300):
    lo, hi = banda; S = P[(P.d >= lo) & (P.d <= hi)]
    if len(S) < 100: return {"pares": int(len(S)), "valor": None}
    ents = S.ent.unique(); idx = {e: S.index[S.ent == e] for e in ents}; S = S.reset_index(drop=True)
    gpos = {e: np.flatnonzero(S.ent.to_numpy() == e) for e in ents}
    rng = np.random.default_rng(SEMILLA); vals = []
    for _ in range(reps):
        toma = rng.choice(len(ents), len(ents)); ii = np.concatenate([gpos[ents[t]] for t in toma]); v = fn(S.iloc[ii])
        if v is not None: vals.append(v)
    return {"pares": int(len(S)), "valor": fn(S), "ic95": [float(np.quantile(vals, .025)), float(np.quantile(vals, .975))] if vals else None}
if __name__ == "__main__":
    salida = sys.argv[1]
    P = pd.read_csv(os.path.join(salida, "procesos.csv"))
    U = P[P.excluido.isna() & P.inconsistencia.isna() & P.modalidad.isin(["licitacion", "menor_cuantia"]) & P.fecha_adjudicacion.notna() & P.codigo_entidad.notna() & P.r_ganador.notna() & (P.n >= 3)].copy()
    U["f"] = pd.to_datetime(U["fecha_adjudicacion"].str[:10]); U["baja"] = 100 * (1 - U["r_adj"]); U["mb"] = U["ganador_mas_bajo"].astype(float)
    # quitar el efecto «nivel de la modalidad y año» para no medir solo que dos procesos cercanos comparten año
    for c in ("z_ganador", "baja", "mb"):
        U[c + "_r"] = U[c] - U.groupby(["modalidad", U.f.dt.year])[c].transform("mean")
    R = {"procesos": int(len(U)), "entidades_con_4_o_mas": int((U.groupby("codigo_entidad").size() >= 4).sum())}
    for ventana, desde in [("2024-2026", 2024), ("2019-2026", 2019)]:
        W = U[U.f.dt.year >= desde]; R[ventana] = {"procesos": int(len(W))}
        for c in ("z_ganador_r", "baja_r", "mb_r"):
            Pp = pares(W, c); R[ventana][c] = {b: boot(Pp, (lo, hi), lambda S: corr(S.a.to_numpy(float), S.b.to_numpy(float))) for b, lo, hi in BANDAS}
        # mismo ganador: tasa observada por banda frente a la tasa entre procesos de la misma entidad a >730 días (línea de fondo)
        Pg = pares(W, "z_ganador_r"); R[ventana]["mismo_ganador"] = {b: boot(Pg, (lo, hi), lambda S: float(S.mismo.mean())) for b, lo, hi in BANDAS}
    # semestre del contrato de los evaluadores: ¿cambia el estilo entre enero-febrero y el resto? (diferencia en la media de z y de «gana la más baja»)
    U["mes"] = U.f.dt.month
    R["por_mes_residuos"] = {int(m): {"procesos": int(len(g)), "mb": float(g.mb_r.mean()), "z": float(g.z_ganador_r.mean()), "baja": float(g.baja_r.mean())} for m, g in U[U.f.dt.year >= 2022].groupby("mes")}
    json.dump(R, open(os.path.join(salida, "evaluadores.json"), "w"), ensure_ascii=False, indent=1)
    for v in ("2024-2026", "2019-2026"):
        print("==", v, R[v]["procesos"], "procesos")
        for c in ("z_ganador_r", "baja_r", "mb_r"):
            print("  ", c, {b: (None if x["valor"] is None else round(x["valor"], 3)) for b, x in R[v][c].items()}, "pares:", {b: x["pares"] for b, x in R[v][c].items()})
        print("   mismo ganador:", {b: (None if x["valor"] is None else round(x["valor"], 3)) for b, x in R[v]["mismo_ganador"].items()})
    print("por mes:", {m: (x["procesos"], round(x["mb"], 3), round(x["z"], 2)) for m, x in R["por_mes_residuos"].items()})
