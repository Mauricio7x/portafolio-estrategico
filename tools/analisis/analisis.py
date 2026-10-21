#!/usr/bin/env python3
"""Investigación de la fórmula de adjudicación · Fases 2 y 3 (universo, variables, exclusiones, hipótesis).
Uso:  python3 -I tools/analisis/analisis.py <carpeta_con_base.jsonl.gz> <carpeta_aux> <carpeta_salida>
Solo LEE la base que dejó scripts/base_obra (base.jsonl.gz) y escribe JSON/CSV en la carpeta de salida.
Todo con semilla fija. Sin dependencias fuera de numpy/pandas. Ninguna cifra se redondea antes de decidir.
"""
import sys, os, json, gzip, math, hashlib, unicodedata
import numpy as np, pandas as pd

SEMILLA = 20261021
REPLICAS = 2000
MIN_ENTIDAD = 5
VENTANAS = {"2024-2026": (2024, 2026), "2022-2026": (2022, 2026), "2019-2026": (2019, 2026)}

def norm(s):
    s = unicodedata.normalize("NFD", str(s or "")).encode("ascii", "ignore").decode().lower()
    return " ".join(s.replace(".", " ").replace(",", " ").split())

def sha(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for b in iter(lambda: f.read(1 << 20), b""): h.update(b)
    return h.hexdigest()

def cargar(carpeta):
    p = os.path.join(carpeta, "base.jsonl.gz")
    filas = []
    with gzip.open(p, "rt", encoding="utf-8") as f:
        for l in f:
            l = l.strip()
            if l: filas.append(json.loads(l))
    return filas, sha(p)

def anio(f): return int(f["fecha_adjudicacion"][:4]) if f.get("fecha_adjudicacion") else None
def trimestre(f): return (int(f["fecha_adjudicacion"][5:7]) - 1) // 3 + 1 if f.get("fecha_adjudicacion") else None

# ---------- percentiles y remuestreo ----------
def pct(xs, q):
    a = np.asarray([x for x in xs if x is not None and np.isfinite(x)], dtype=float)
    return float(np.quantile(a, q)) if a.size else None

def boot_por_bloque(df, grupo, estadistico, replicas=REPLICAS, semilla=SEMILLA):
    """Remuestreo por bloques (entidades): devuelve (valor, ic2.5, ic97.5). estadistico(df)->float."""
    rng = np.random.default_rng(semilla)
    bloques = df[grupo].fillna("(sin)").to_numpy()
    uniq, inv = np.unique(bloques, return_inverse=True)
    idx_por_bloque = [np.flatnonzero(inv == i) for i in range(len(uniq))]
    vals = []
    for _ in range(replicas):
        toma = rng.integers(0, len(uniq), len(uniq))
        idx = np.concatenate([idx_por_bloque[t] for t in toma])
        v = estadistico(df.iloc[idx])
        if v is not None and np.isfinite(v): vals.append(v)
    v0 = estadistico(df)
    if not vals: return v0, None, None
    return v0, float(np.quantile(vals, 0.025)), float(np.quantile(vals, 0.975))

def p_boot_cero(vals, v0):
    """p a dos colas de que el estadístico sea 0, a partir del remuestreo (centrado)."""
    a = np.asarray(vals, dtype=float)
    if not a.size: return None
    desv = a - a.mean()
    return float(min(1.0, 2 * min((desv >= abs(v0)).mean(), (desv <= -abs(v0)).mean()) + 1 / (len(a) + 1)))

def bh(ps):
    """Benjamini–Hochberg: devuelve p ajustadas en el mismo orden."""
    items = [(p, i) for i, p in enumerate(ps) if p is not None]
    m = len(items); out = [None] * len(ps)
    if not m: return out
    items.sort()
    prev = 1.0
    for rank in range(m, 0, -1):
        p, i = items[rank - 1]
        q = min(prev, p * m / rank); prev = q; out[i] = q
    return out

# ---------- tabla de procesos ----------
def tabla(filas):
    reg = []
    for f in filas:
        n = f.get("n_validas")
        og = f.get("oferta_ganadora")
        rs = [o["pct"] for o in (f.get("ofertas_validas") or []) if o.get("pct") is not None]
        rs_sorted = sorted(rs)
        pos = None; z = None; dmed = None; mas_baja = None
        if og and rs and og.get("pct") is not None:
            rg = og["pct"]
            pos = 1 + sum(1 for r in rs_sorted if r < rg - 1e-12)
            mas_baja = abs(rs_sorted[0] - rg) < 1e-12
            if len(rs) >= 3:
                m = float(np.mean(rs)); s = float(np.std(rs, ddof=1))
                z = (rg - m) / s if s > 0 else None
                dmed = 100 * (rg - float(np.median(rs)))
        reg.append({
            "portafolio": f["portafolio"], "codigo_entidad": f.get("codigo_entidad"), "entidad": f.get("entidad"),
            "departamento": f.get("departamento_ejecucion") or f.get("departamento_entidad"),
            "departamento_entidad": f.get("departamento_entidad"), "municipio": f.get("municipio_ejecucion") or f.get("ciudad_entidad"),
            "modalidad": f.get("modalidad"), "precio_base": f.get("precio_base"), "anio": anio(f), "trimestre": trimestre(f),
            "mes_cierre": int(f["fecha_cierre"][5:7]) if f.get("fecha_cierre") else None,
            "fecha_cierre": f.get("fecha_cierre"), "fecha_adjudicacion": f.get("fecha_adjudicacion"), "fecha_publicacion": f.get("fecha_publicacion"),
            "r_adj": f.get("pct_adjudicado"), "inconsistencia": f.get("inconsistencia"), "excluido": f.get("excluido"),
            "competencia": f.get("competencia"), "n": n, "respuestas_publicadas": f.get("respuestas_publicadas"),
            "r_ganador": og["pct"] if og else None, "pos_ganador": pos, "z_ganador": z, "dist_mediana_pts": dmed, "ganador_mas_bajo": mas_baja,
            "ganador_id": f.get("ganador_id"), "r_min": rs_sorted[0] if rs else None, "r_mediana": float(np.median(rs)) if rs else None,
            "r_media": float(np.mean(rs)) if rs else None, "sigma": float(np.std(rs, ddof=1)) if len(rs) >= 2 else None,
            "plazo_dias": f.get("plazo_dias"),
        })
    return pd.DataFrame(reg)

def cascada(df):
    out = {}
    for (m, a), g in df.groupby([df["modalidad"], df["anio"].fillna(-1)]):
        k = f"{m}|{int(a) if a != -1 else 'sin_fecha'}"
        motivos = g["excluido"].fillna("usable").value_counts().to_dict()
        out[k] = {"total": int(len(g)), **{str(kk): int(v) for kk, v in motivos.items()},
                  "usables_con_ganador": int(((g["excluido"].isna()) & g["r_ganador"].notna()).sum()),
                  "usables_sin_inconsistencia": int(((g["excluido"].isna()) & g["inconsistencia"].isna()).sum())}
    return out

if __name__ == "__main__":
    carpeta, aux, salida = sys.argv[1], sys.argv[2], sys.argv[3]
    os.makedirs(salida, exist_ok=True)
    filas, hash_base = cargar(carpeta)
    df = tabla(filas)
    df.to_csv(os.path.join(salida, "procesos.csv"), index=False)
    R = {"generado": pd.Timestamp.now("UTC").isoformat(), "sha256_base": hash_base, "semilla": SEMILLA, "replicas": REPLICAS,
         "filas_base": len(df), "cascada": cascada(df)}
    json.dump(R, open(os.path.join(salida, "fase2_universo.json"), "w"), ensure_ascii=False, indent=1)
    print("filas", len(df), "usables", int(df["excluido"].isna().sum()))
