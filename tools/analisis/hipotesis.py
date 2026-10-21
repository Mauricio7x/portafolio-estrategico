#!/usr/bin/env python3
"""Fase 3 · pruebas de las hipótesis pre-registradas (tools/analisis/PREREGISTRO.md).
Uso:  python3 -I tools/analisis/hipotesis.py <carpeta_base> <carpeta_aux> <carpeta_salida>
Lee procesos.csv (de analisis.py), base.jsonl.gz (ofertas), trm.json y divipola; escribe fase3_hipotesis.json.
Remuestreo por bloques de entidad, semilla fija; BH sobre todas las p juntas.
"""
import sys, os, json, gzip, math
import numpy as np, pandas as pd
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from analisis import SEMILLA, REPLICAS, MIN_ENTIDAD, VENTANAS, norm, bh, pct

def chi2_sf(x, k):
    """Cola superior de chi² (gamma incompleta regularizada superior), sin scipy."""
    if x <= 0: return 1.0
    a, z = k / 2.0, x / 2.0
    if z < a + 1:  # serie
        s = t = 1.0 / a; n = 1
        while abs(t) > 1e-14 * abs(s) and n < 10000:
            t *= z / (a + n); s += t; n += 1
        p = s * math.exp(-z + a * math.log(z) - math.lgamma(a))
        return max(0.0, 1.0 - p)
    # fracción continua (Lentz)
    b = z + 1 - a; c = 1e300; d = 1 / b; h = d
    for i in range(1, 10000):
        an = -i * (i - a); b += 2
        d = an * d + b; d = 1e-300 if abs(d) < 1e-300 else d
        c = b + an / c; c = 1e-300 if abs(c) < 1e-300 else c
        d = 1 / d; de = d * c; h *= de
        if abs(de - 1) < 1e-14: break
    return max(0.0, min(1.0, math.exp(-z + a * math.log(z) - math.lgamma(a)) * h))

def cargar_ofertas(carpeta):
    out = []
    with gzip.open(os.path.join(carpeta, "base.jsonl.gz"), "rt", encoding="utf-8") as f:
        for l in f:
            if not l.strip(): continue
            x = json.loads(l)
            if x.get("excluido") or not x.get("ofertas_validas"): continue
            out.append({"portafolio": x["portafolio"], "modalidad": x["modalidad"], "anio": int(x["fecha_adjudicacion"][:4]) if x.get("fecha_adjudicacion") else None,
                        "codigo_entidad": x.get("codigo_entidad"), "precio_base": x.get("precio_base"), "inconsistencia": x.get("inconsistencia"),
                        "ganador": (x.get("oferta_ganadora") or {}).get("proveedor"),
                        "ofertas": [(o["proveedor"], float(o["valor"]), float(o["pct"])) for o in x["ofertas_validas"]]})
    return out

def bloques(df, col="codigo_entidad"):
    b = df[col].fillna("(sin)").to_numpy(); u, inv = np.unique(b, return_inverse=True)
    return [np.flatnonzero(inv == i) for i in range(len(u))]

def remuestreo(df, fn, replicas=REPLICAS, semilla=SEMILLA):
    rng = np.random.default_rng(semilla); idx = bloques(df); vals = []
    for _ in range(replicas):
        toma = rng.integers(0, len(idx), len(idx))
        v = fn(df.iloc[np.concatenate([idx[t] for t in toma])])
        if v is not None and np.isfinite(v): vals.append(v)
    v0 = fn(df)
    if not vals or v0 is None: return {"valor": v0, "ic95": None, "p_cero": None}
    a = np.asarray(vals); d = a - a.mean()
    p = min(1.0, 2 * min(float((d >= abs(v0)).mean()), float((d <= -abs(v0)).mean())) + 1 / (len(a) + 1))
    return {"valor": float(v0), "ic95": [float(np.quantile(a, .025)), float(np.quantile(a, .975))], "p_cero": float(p)}

def remuestreo_media(df, col, replicas=REPLICAS, semilla=SEMILLA, escala=1.0):
    """Media de `col` con IC por bloques de entidad, vectorizado (sumas por bloque)."""
    d = df[[col, "codigo_entidad"]].dropna(subset=[col])
    if d.empty: return {"valor": None, "ic95": None, "p_cero": None}
    b = d["codigo_entidad"].fillna("(sin)").to_numpy(); u, inv = np.unique(b, return_inverse=True)
    y = d[col].to_numpy(float); S = np.bincount(inv, weights=y, minlength=len(u)); C = np.bincount(inv, minlength=len(u)).astype(float)
    rng = np.random.default_rng(semilla); toma = rng.integers(0, len(u), (replicas, len(u)))
    vals = (S[toma].sum(1) / C[toma].sum(1)) * escala; v0 = float(y.mean() * escala)
    dd = vals - vals.mean(); p = min(1.0, 2 * min(float((dd >= abs(v0)).mean()), float((dd <= -abs(v0)).mean())) + 1 / (replicas + 1))
    return {"valor": v0, "ic95": [float(np.quantile(vals, .025)), float(np.quantile(vals, .975))], "p_cero": float(p)}

def pendiente(x, y):
    x = np.asarray(x, float); y = np.asarray(y, float); m = np.isfinite(x) & np.isfinite(y)
    if m.sum() < 3 or np.var(x[m]) == 0: return None
    return float(np.cov(x[m], y[m], ddof=0)[0, 1] / np.var(x[m]))

def tramo(n):
    if n is None or not np.isfinite(n) or n < 1: return None
    return "1" if n == 1 else "2" if n == 2 else "3-4" if n <= 4 else "5-9" if n <= 9 else "10+"

# ---------- H1 · estabilidad por entidad (comparables ANTERIORES) ----------
def h1(U):
    U = U.sort_values("fecha_adjudicacion").reset_index(drop=True)
    pred_e, pred_d, pred_g, real, ent = [], [], [], [], []
    hist_e, hist_d, hist_g = {}, {}, {}
    for _, r in U.iterrows():
        k = (r["codigo_entidad"], r["modalidad"]); kd = (r["departamento_entidad"], r["modalidad"]); kg = r["modalidad"]
        he = hist_e.get(k, []); hd = hist_d.get(kd, []); hg = hist_g.get(kg, [])
        if len(he) >= MIN_ENTIDAD and len(hg) >= MIN_ENTIDAD:
            pred_e.append(float(np.median(he))); pred_d.append(float(np.median(hd)) if len(hd) >= MIN_ENTIDAD else float(np.median(hg)))
            pred_g.append(float(np.median(hg))); real.append(r["r_adj"]); ent.append(r["codigo_entidad"])
        hist_e.setdefault(k, []).append(r["r_adj"]); hist_d.setdefault(kd, []).append(r["r_adj"]); hist_g.setdefault(kg, []).append(r["r_adj"])
    T = pd.DataFrame({"codigo_entidad": ent, "real": real, "e": pred_e, "d": pred_d, "g": pred_g})
    if T.empty: return {"procesos_evaluables": 0}
    def r2(t): 
        sse = ((t["real"] - t["e"]) ** 2).sum(); sst = ((t["real"] - t["g"]) ** 2).sum()
        return 1 - sse / sst if sst > 0 else None
    def r2d(t):
        sse = ((t["real"] - t["d"]) ** 2).sum(); sst = ((t["real"] - t["g"]) ** 2).sum()
        return 1 - sse / sst if sst > 0 else None
    def mae(c): return lambda t: float((t["real"] - t[c]).abs().mean() * 100)
    iqr_global = pct(U["r_adj"], .75) - pct(U["r_adj"], .25)
    iqr_dentro = U.groupby("codigo_entidad")["r_adj"].agg(lambda s: (s.quantile(.75) - s.quantile(.25)) if len(s) >= MIN_ENTIDAD else np.nan).dropna()
    return {"procesos_evaluables": int(len(T)), "r2_fuera_de_muestra_entidad": remuestreo(T, r2), "r2_fuera_de_muestra_departamento": remuestreo(T, r2d),
            "mae_pts_entidad": remuestreo(T, mae("e")), "mae_pts_departamento": remuestreo(T, mae("d")), "mae_pts_global": remuestreo(T, mae("g")),
            "iqr_global_pts": 100 * iqr_global, "iqr_mediano_dentro_de_entidad_pts": 100 * float(iqr_dentro.median()) if len(iqr_dentro) else None,
            "entidades_con_5_o_mas": int(len(iqr_dentro))}

# ---------- H2 · más oferentes, más baja ----------
def h2(U):
    U = U[U["n"].notna() & U["r_adj"].notna()].copy(); U["baja"] = 100 * (1 - U["r_adj"]); U["tramo"] = U["n"].map(tramo)
    out = {"pendiente_baja_sobre_log_n": remuestreo(U, lambda t: pendiente(np.log(t["n"]), t["baja"]))}
    out["mediana_baja_por_tramo"] = {k: {"n_procesos": int(len(g)), "mediana_pts": float(g["baja"].median())} for k, g in U.groupby("tramo")}
    def dif(t):
        a = t[t["tramo"] == "10+"]["baja"]; b = t[t["tramo"] == "1"]["baja"]
        return float(a.median() - b.median()) if len(a) and len(b) else None
    out["diferencia_mediana_10mas_menos_1"] = remuestreo(U, dif)
    return out

# ---------- H3 · acumulación ----------
def h3(O, U_ids):
    d_med, r_abs, d_piso = [], [], []
    for x in O:
        if x["portafolio"] not in U_ids or len(x["ofertas"]) < 3: continue
        rs = np.array([o[2] for o in x["ofertas"]]); med = np.median(rs); s = rs.std(ddof=1); piso = med - s
        d_med.extend(100 * (rs - med)); r_abs.extend(100 * rs)
        if s > 0: d_piso.extend(100 * (rs - piso))
    def exceso(vals, centro, ancho=0.5, vecinos=(1.0, 2.0)):
        v = np.asarray(vals); c = ((v >= centro - ancho) & (v < centro + ancho)).sum()
        lo = ((v >= centro - vecinos[1]) & (v < centro - vecinos[0])).sum(); hi = ((v >= centro + vecinos[0]) & (v < centro + vecinos[1])).sum()
        ref = (lo + hi) / 2 * (2 * ancho / (vecinos[1] - vecinos[0]))
        return {"en_la_celda": int(c), "esperado_por_vecinos": float(ref), "exceso_pct": (100 * (c - ref) / ref) if ref > 0 else None}
    hist = np.histogram(np.clip(d_med, -10, 10), bins=np.arange(-10, 10.5, 0.5))
    return {"ofertas": len(d_med), "exceso_en_la_mediana": exceso(d_med, 0.0),
            "exceso_en_80": exceso(r_abs, 80.0), "exceso_en_88": exceso(r_abs, 88.0), "exceso_en_90": exceso(r_abs, 90.0), "exceso_en_95": exceso(r_abs, 95.0), "exceso_en_100": exceso(r_abs, 100.0, vecinos=(1.0, 2.0)),
            "exceso_justo_sobre_el_piso": exceso(d_piso, 0.5, 0.5),
            "histograma_distancia_a_la_mediana_pts": {"bordes": [float(b) for b in hist[1]], "conteos": [int(c) for c in hist[0]]},
            "fraccion_de_ofertas_al_100_pct": float(np.mean(np.abs(np.asarray(r_abs) - 100) < 1e-6)) if r_abs else None}

# ---------- H4 · posición del ganador ----------
def h4(U):
    G = U[U["pos_ganador"].notna() & U["n"].notna()].copy(); G["tramo"] = G["n"].map(tramo)
    out = {"procesos": int(len(G))}
    G["gmb"] = G["ganador_mas_bajo"].astype(float); out["ganador_es_la_mas_baja"] = remuestreo_media(G, "gmb")
    out["esperado_si_fuera_al_azar"] = float((1 / G["n"]).mean()) if len(G) else None
    out["por_tramo"] = {k: {"procesos": int(len(g)), "gana_la_mas_baja": float(g["ganador_mas_bajo"].mean()), "al_azar": float((1 / g["n"]).mean()),
                            "mediana_z": float(g["z_ganador"].median()) if g["z_ganador"].notna().any() else None,
                            "mediana_distancia_a_mediana_pts": float(g["dist_mediana_pts"].median()) if g["dist_mediana_pts"].notna().any() else None,
                            "rango_mediano": float(g["pos_ganador"].median())} for k, g in G.groupby("tramo")}
    z = G["z_ganador"].dropna()
    out["z_del_ganador"] = {"n": int(len(z)), "p10": pct(z, .1), "p25": pct(z, .25), "p50": pct(z, .5), "p75": pct(z, .75), "p90": pct(z, .9),
                            "fraccion_bajo_menos_1": float((z < -1).mean()) if len(z) else None}
    return out

# ---------- H5 · dígitos ----------
BENFORD = np.log10(1 + 1 / np.arange(1, 10))
def h5(O, U_ids):
    vals = [o[1] for x in O if x["portafolio"] in U_ids for o in x["ofertas"]]
    if not vals: return {}
    pd1 = np.array([int(str(int(v))[0]) for v in vals if v >= 1])
    obs = np.array([(pd1 == d).sum() for d in range(1, 10)]); esp = BENFORD * len(pd1)
    chi = float(((obs - esp) ** 2 / esp).sum())
    ult = np.array([int(v) for v in vals])
    return {"ofertas": len(vals), "primer_digito_observado": [int(c) for c in obs], "primer_digito_benford": [float(e) for e in esp],
            "chi2": chi, "gl": 8, "p": chi2_sf(chi, 8), "fraccion_multiplo_de_1_millon": float((ult % 1_000_000 == 0).mean()),
            "fraccion_multiplo_de_1000": float((ult % 1000 == 0).mean()), "fraccion_con_centavos": float(np.mean([abs(v - round(v)) > 1e-9 for v in vals]))}

# ---------- H6 · reparto de centavos de la TRM ----------
def h6(aux, desde, hasta):
    t = json.load(open(os.path.join(aux, "trm.json")))
    c = [round(float(r["valor"]) * 100) % 100 for r in t if desde <= r["vigenciadesde"][:10] <= hasta]
    k = np.array([sum(1 for x in c if x <= 24), sum(1 for x in c if 25 <= x <= 49), sum(1 for x in c if 50 <= x <= 74), sum(1 for x in c if x >= 75)])
    esp = k.sum() / 4; chi = float(((k - esp) ** 2 / esp).sum()) if esp > 0 else None
    return {"dias": int(k.sum()), "mediana_geometrica_aritmetica_menor": [int(x) for x in k], "chi2": chi, "gl": 3, "p": chi2_sf(chi, 3) if chi is not None else None}

# ---------- H7 · geografía fuera de muestra (encogimiento simple + validación por bloques) ----------
def efecto_encogido(train, col, y, k=5.0):
    g = train.groupby(col)[y].agg(["mean", "count"]); mu = train[y].mean()
    return ((g["mean"] * g["count"] + mu * k) / (g["count"] + k)).to_dict(), mu
def h7(U, semilla=SEMILLA):
    U = U[U["r_adj"].notna() & U["departamento"].notna()].copy(); U["y"] = U["r_adj"]
    U["tam"] = U.groupby("modalidad")["precio_base"].transform(lambda s: pd.qcut(s.rank(method="first"), 3, labels=["p", "m", "g"]).astype(str))
    def ajustar(train, test):
        mu = train["y"].mean(); res = test["y"].copy() * 0 + mu
        # base: modalidad × tamaño
        em, _ = efecto_encogido(train.assign(k=train["modalidad"] + "|" + train["tam"]), "k", "y", 0.0)
        base = (test["modalidad"] + "|" + test["tam"]).map(em).fillna(mu)
        # entidad (encogido) sobre el residuo
        tr = train.assign(res=train["y"] - (train["modalidad"] + "|" + train["tam"]).map(em).fillna(mu))
        ee, _ = efecto_encogido(tr, "codigo_entidad", "res"); pred_base = base + test["codigo_entidad"].map(ee).fillna(0)
        # geografía: departamento y municipio (encogidos) sobre el residuo
        tr["res2"] = tr["res"] - tr["codigo_entidad"].map(ee).fillna(0)
        ed, _ = efecto_encogido(tr, "departamento", "res2"); tr["res3"] = tr["res2"] - tr["departamento"].map(ed).fillna(0)
        emu, _ = efecto_encogido(tr, "municipio", "res3")
        pred_geo = pred_base + test["departamento"].map(ed).fillna(0) + test["municipio"].map(emu).fillna(0)
        return pred_base, pred_geo
    rng = np.random.default_rng(semilla); out = {}
    # (a) validación cruzada por proceso, 5 pliegues
    folds = rng.integers(0, 5, len(U)); eb, eg = [], []
    for f in range(5):
        tr, te = U[folds != f], U[folds == f]
        if len(te) == 0: continue
        pb, pg = ajustar(tr, te); eb.append((te["y"] - pb).abs()); eg.append((te["y"] - pg).abs())
    eb = pd.concat(eb); eg = pd.concat(eg); D = U.loc[eb.index, ["codigo_entidad"]].assign(d=(eb - eg) * 100)
    out["cv_5_pliegues"] = {"mae_pts_base": float(eb.mean() * 100), "mae_pts_con_geografia": float(eg.mean() * 100), "mejora_pts": remuestreo_media(D, "d")}
    # (b) temporal: entrenar hasta el penúltimo año, probar el último
    anios = sorted(U["anio"].dropna().unique())
    if len(anios) >= 2:
        tr, te = U[U["anio"] < anios[-1]], U[U["anio"] == anios[-1]]
        pb, pg = ajustar(tr, te); D = te[["codigo_entidad"]].assign(d=((te["y"] - pb).abs() - (te["y"] - pg).abs()) * 100)
        out["temporal_ultimo_anio"] = {"anio_prueba": int(anios[-1]), "mae_pts_base": float((te["y"] - pb).abs().mean() * 100), "mae_pts_con_geografia": float((te["y"] - pg).abs().mean() * 100), "mejora_pts": remuestreo_media(D, "d")}
    # (c) dejar un departamento fuera: ¿el modelo con geografía generaliza a un departamento nuevo? (ahí la geografía no puede ayudar: mide el costo)
    difs = []
    for d in U["departamento"].unique():
        tr, te = U[U["departamento"] != d], U[U["departamento"] == d]
        if len(te) < 30: continue
        pb, pg = ajustar(tr, te); difs.append({"departamento": d, "procesos": int(len(te)), "mae_pts_base": float((te["y"] - pb).abs().mean() * 100), "mae_pts_geo": float((te["y"] - pg).abs().mean() * 100)})
    out["dejar_un_departamento_fuera"] = difs
    return out

# ---------- H9 · tamaño y versión del documento tipo ----------
def h9(U):
    U = U[U["r_adj"].notna()].copy()
    U["tam"] = U.groupby("modalidad")["precio_base"].transform(lambda s: pd.qcut(s.rank(method="first"), 3, labels=["pequeño", "mediano", "grande"]).astype(str))
    out = {"por_tamano": {f"{m}|{t}": {"procesos": int(len(g)), "mediana_r_adj": float(g["r_adj"].median()), "mediana_n": float(g["n"].median()), "corte_cop": [float(g["precio_base"].min()), float(g["precio_base"].max())]} for (m, t), g in U.groupby(["modalidad", "tam"])}}
    def difgr(t):
        a = t[t["tam"] == "grande"]["r_adj"]; b = t[t["tam"] == "pequeño"]["r_adj"]
        return 100 * float(a.median() - b.median()) if len(a) and len(b) else None
    out["diferencia_grande_menos_pequeno_pts"] = {m: remuestreo(g, difgr) for m, g in U.groupby("modalidad")}
    for nombre, corte in [("transporte_v4_3feb2025", "2025-02-03"), ("social_v2_16feb2026", "2026-02-16")]:
        P = U[U["fecha_publicacion"].notna()].copy(); P["despues"] = P["fecha_publicacion"].str[:10] >= corte
        def difv(t):
            a = t[t["despues"]]["r_adj"]; b = t[~t["despues"]]["r_adj"]
            return 100 * float(a.median() - b.median()) if len(a) >= 30 and len(b) >= 30 else None
        out[f"aviso_despues_de_{nombre}"] = {m: {"antes": int((~g["despues"]).sum()), "despues": int(g["despues"].sum()), "diferencia_mediana_r_adj_pts": remuestreo(g, difv)} for m, g in P.groupby("modalidad")}
    return out

# ---------- H10 · calendario ----------
def h10(U):
    U = U[U["r_adj"].notna() & U["fecha_cierre"].notna()].copy(); U["mes"] = U["fecha_cierre"].str[5:7].astype(int)
    out = {"por_mes_de_cierre": {int(m): {"procesos": int(len(g)), "mediana_r_adj": float(g["r_adj"].median()), "mediana_n": float(g["n"].median())} for m, g in U.groupby("mes")}}
    def difdic(t):
        a = t[t["mes"] == 12]["r_adj"]; b = t[t["mes"] != 12]["r_adj"]
        return 100 * float(a.median() - b.median()) if len(a) >= 30 and len(b) >= 30 else None
    out["diciembre_menos_resto_pts"] = remuestreo(U, difdic)
    # Ley de Garantías 2026: 31-ene a 21-jun-2026 (docs/CONTRATACION_ESTATAL.md, F-481, verificada allí); cierre dentro de la ventana
    V = U[U["anio"].isin([2025, 2026])].copy(); V["garantias"] = (V["fecha_cierre"].str[:10] >= "2026-01-31") & (V["fecha_cierre"].str[:10] <= "2026-06-21")
    V["misma_epoca_2025"] = (V["fecha_cierre"].str[:10] >= "2025-01-31") & (V["fecha_cierre"].str[:10] <= "2025-06-21")
    def difg(t):
        a = t[t["garantias"]]; b = t[t["misma_epoca_2025"]]
        return 100 * float(a["r_adj"].median() - b["r_adj"].median()) if len(a) >= 30 and len(b) >= 30 else None
    def difn(t):
        a = t[t["garantias"]]; b = t[t["misma_epoca_2025"]]
        return float(a["n"].median() - b["n"].median()) if len(a) >= 30 and len(b) >= 30 else None
    out["ley_de_garantias_2026_vs_misma_epoca_2025"] = {"procesos_en_ventana": int(V["garantias"].sum()), "procesos_2025": int(V["misma_epoca_2025"].sum()),
        "diferencia_mediana_r_adj_pts": remuestreo(V, difg), "diferencia_mediana_n": remuestreo(V, difn)}
    return out

# ---------- H11 · reincidencia ----------
def h11(O, U):
    U = U.sort_values("fecha_adjudicacion"); gan = {}; prev = {}
    for _, r in U.iterrows():
        k = (r["codigo_entidad"], r["ganador_id"]); gan.setdefault(k, 0)
        prev[r["portafolio"]] = gan[k]; gan[k] += 1
    rep = []; esp = []
    victorias_por = {}
    for x in sorted(O, key=lambda x: x["portafolio"]):
        pass
    for _, r in U.iterrows():
        if r["ganador_id"] is None: continue
        rep.append(prev[r["portafolio"]] >= 2)
    return {"procesos": len(rep), "fraccion_ganador_ya_habia_ganado_2_o_mas_en_la_entidad": float(np.mean(rep)) if rep else None,
            "nota": "solo señal de control: el denominador son los procesos usables de la ventana; no distingue mérito de captura"}

# ---------- tendencia por año ----------
def tendencia(U, O):
    out = {}
    for m, g in U.groupby("modalidad"):
        por = {}
        for a, h in g.groupby("anio"):
            ids = set(h["portafolio"]); pisos = []
            for x in O:
                if x["portafolio"] in ids and len(x["ofertas"]) >= 3:
                    rs = np.array([o[2] for o in x["ofertas"]]); s = rs.std(ddof=1)
                    if s > 0: pisos.append(100 * (np.median(rs) - s))
            por[int(a)] = {"procesos": int(len(h)), "mediana_r_adj_pct": 100 * float(h["r_adj"].median()), "ic95_mediana": [100 * v for v in remuestreo(h, lambda t: float(t["r_adj"].median()))["ic95"] or [None, None]] if len(h) >= 10 else None,
                           "p10_r_adj_pct": 100 * pct(h["r_adj"], .1), "p90_r_adj_pct": 100 * pct(h["r_adj"], .9), "mediana_n": float(h["n"].median()),
                           "mediana_piso_pct": float(np.median(pisos)) if pisos else None, "procesos_con_piso": len(pisos)}
        anios = sorted(por); pend = pendiente(anios, [por[a]["mediana_r_adj_pct"] for a in anios]) if len(anios) >= 3 else None
        out[m] = {"por_anio": por, "pendiente_mediana_r_adj_pts_por_anio": pend}
    return out

if __name__ == "__main__":
    carpeta, aux, salida = sys.argv[1], sys.argv[2], sys.argv[3]
    df = pd.read_csv(os.path.join(salida, "procesos.csv"))
    O = cargar_ofertas(carpeta)
    R = {"semilla": SEMILLA, "replicas": REPLICAS, "ventanas": {}}
    pruebas = []  # (clave, p) para BH
    for nombre, (a0, a1) in VENTANAS.items():
        base = df[df["excluido"].isna() & df["inconsistencia"].isna() & df["anio"].between(a0, a1)]
        U = base[base["modalidad"].isin(["licitacion", "menor_cuantia"])].copy()
        Umin = base[base["modalidad"] == "minima"].copy()
        ids = set(U["portafolio"])
        V = {"procesos_usables_licitacion_menor": int(len(U)), "procesos_usables_minima": int(len(Umin)), "por_modalidad": {m: int(len(g)) for m, g in U.groupby("modalidad")}}
        V["H1"] = {m: h1(g) for m, g in U.groupby("modalidad")}
        V["H2"] = {m: h2(g) for m, g in pd.concat([U, Umin]).groupby("modalidad")}
        V["H3"] = {m: h3(O, set(g["portafolio"])) for m, g in U.groupby("modalidad")}
        V["H4"] = {m: h4(g) for m, g in pd.concat([U, Umin]).groupby("modalidad")}
        V["H5"] = h5(O, ids)
        V["H6"] = h6(aux, f"{a0}-01-01", f"{a1}-12-31")
        V["H7"] = {m: h7(g) for m, g in U.groupby("modalidad")}
        V["H9"] = h9(pd.concat([U, Umin]))
        V["H10"] = h10(U)
        V["H11"] = {m: h11(O, g) for m, g in U.groupby("modalidad")}
        V["tendencia_por_anio"] = tendencia(pd.concat([U, Umin]), O)
        R["ventanas"][nombre] = V
        if nombre == "2024-2026":
            for m in V["H1"]:
                pruebas.append((f"H1 r2 entidad {m}", V["H1"][m].get("r2_fuera_de_muestra_entidad", {}).get("p_cero")))
                pruebas.append((f"H2 pendiente {m}", V["H2"][m]["pendiente_baja_sobre_log_n"]["p_cero"]))
                pruebas.append((f"H4 mas baja vs azar {m}", None))
                pruebas.append((f"H7 cv geografia {m}", V["H7"][m]["cv_5_pliegues"]["mejora_pts"]["p_cero"]))
                pruebas.append((f"H9 grande-pequeno {m}", V["H9"]["diferencia_grande_menos_pequeno_pts"][m]["p_cero"]))
            pruebas.append(("H2 pendiente minima", V["H2"]["minima"]["pendiente_baja_sobre_log_n"]["p_cero"]))
            pruebas.append(("H5 benford", V["H5"].get("p"))); pruebas.append(("H6 trm", V["H6"]["p"]))
            pruebas.append(("H10 diciembre", V["H10"]["diciembre_menos_resto_pts"]["p_cero"]))
            pruebas.append(("H10 garantias r_adj", V["H10"]["ley_de_garantias_2026_vs_misma_epoca_2025"]["diferencia_mediana_r_adj_pts"]["p_cero"]))
    ajust = bh([p for _, p in pruebas])
    R["fdr_bh_2024_2026"] = [{"prueba": k, "p": p, "p_ajustada": q} for (k, p), q in zip(pruebas, ajust)]
    json.dump(R, open(os.path.join(salida, "fase3_hipotesis.json"), "w"), ensure_ascii=False, indent=1, default=lambda o: None if (isinstance(o, float) and not np.isfinite(o)) else (float(o) if isinstance(o, (np.floating,)) else int(o) if isinstance(o, np.integer) else str(o)))
    print("listo", os.path.join(salida, "fase3_hipotesis.json"))
