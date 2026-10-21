#!/usr/bin/env python3
"""Fases 4 a 7 · modelo de ganador, líneas base, optimizador por comparables y backtest honesto.
Uso:  python3 -I tools/analisis/modelo.py <carpeta_base> <carpeta_aux> <carpeta_salida> [--prueba]
Sin --prueba NO toca el año de prueba (2026): entrena con lo anterior a cada proceso y evalúa 2025.
Con --prueba evalúa también 2026 (una sola vez, al final). Semilla fija; remuestreo por entidad.
Las 4 fórmulas replican scripts/base_obra/metodos.js (pliego SAMC-SI-020-2026 pp. 53-56 y Documento Tipo V4 4.1.4).
"""
import sys, os, json, gzip, math
import numpy as np, pandas as pd
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from analisis import SEMILLA, REPLICAS, MIN_ENTIDAD, pct
from hipotesis import remuestreo, remuestreo_media, cargar_ofertas, tramo

METODOS = ["mediana", "geometrica", "aritmetica_baja", "menor_valor"]
PUNTAJE_MAX = {"menor_cuantia": 49.5, "licitacion": 48.5}
REJILLA = [round(0.80 + 0.005 * i, 3) for i in range(41)]   # 80,0 % … 100,0 % del precio base
ALERTA = {"licitacion": 0.88, "menor_cuantia": 0.88}          # lib/apu/piso_techo TEMERARIO_POR_MODALIDAD (18-oct-2026)

def puntajes(v, metodo, mx):
    v = np.asarray(v, float); n = len(v)
    if n == 0 or (v <= 0).any(): return None
    r7 = lambda x: np.round(np.maximum(x, 0) * mx * 1e7) / 1e7
    if metodo == "mediana":
        a = np.sort(v); ref = a[(n - 1) // 2] if n % 2 else a[n // 2 - 1]
        return r7(1 - np.abs((ref - v) / ref))
    if metodo == "geometrica":
        mg = math.exp(np.log(v).mean()); return r7(1 - np.abs(mg - v) / mg)
    if metodo == "aritmetica_baja":
        xb = (v.min() + v.mean()) / 2; return r7(np.where(v <= xb, 1 - (xb - v) / xb, 1 - np.abs(xb - v) / xb))
    if metodo == "menor_valor":
        return r7(v.min() / v)

def primeros(v, metodo, mx):
    p = puntajes(v, metodo, mx)
    if p is None: return None
    m = p.max(); return [i for i, x in enumerate(p) if x == m]

def resultado_insercion(rs, b, mx):
    """Inserta la oferta b (fracción del precio base) en las ofertas reales rs; devuelve por método: gana sola (1), empata (0.5), pierde (0), y si queda bajo mediana−σ."""
    todos = list(rs) + [b]; i = len(rs); out = {}
    arr = np.asarray(todos); s = arr.std(ddof=1) if len(arr) > 1 else None
    bajo_piso = (s is not None and s > 0 and b < np.median(arr) - s)
    for m in METODOS:
        g = primeros(todos, m, mx)
        out[m] = 0.0 if g is None or i not in g else (1.0 if len(g) == 1 else 1.0 / len(g))
    return out, bajo_piso

def valor_esperado(rs, b, mx):
    r, bp = resultado_insercion(rs, b, mx); v = sum(r.values()) / 4
    return v, (0.0 if bp else v), bp

# ---------- comparables ANTERIORES ----------
class Historia:
    """Comparables anteriores a una fecha: por entidad, por departamento y por modalidad (país)."""
    def __init__(self, O, P, extra):
        self.P = P.set_index("portafolio"); self.ofertas = {x["portafolio"]: x for x in O}; self.extra = extra
    def comparables(self, fila, nivel, fecha):
        P = self.P; m = fila["modalidad"]
        if nivel == "entidad": sel = P[(P["codigo_entidad"] == fila["codigo_entidad"]) & (P["modalidad"] == m) & (P["fecha_adjudicacion"] < fecha)]
        elif nivel == "entidad_familia":
            fam = fila.get("familia")
            sel = P[(P["codigo_entidad"] == fila["codigo_entidad"]) & (P["modalidad"] == m) & (P["fecha_adjudicacion"] < fecha) & (P["familia"] == fam)] if fam else P.iloc[0:0]
        elif nivel == "departamento_familia":
            fam = fila.get("familia")
            sel = P[(P["departamento_entidad"] == fila["departamento_entidad"]) & (P["modalidad"] == m) & (P["fecha_adjudicacion"] < fecha) & (P["familia"] == fam)] if fam else P.iloc[0:0]
        elif nivel == "departamento": sel = P[(P["departamento_entidad"] == fila["departamento_entidad"]) & (P["modalidad"] == m) & (P["fecha_adjudicacion"] < fecha)]
        else: sel = P[(P["modalidad"] == m) & (P["fecha_adjudicacion"] < fecha)]
        return sel

def baja_indice(sel):
    """Réplica de lib/indice_baja: baja = 100(1−va/pb), descarta <30 % y >110 %, histograma de puntos ENTEROS (Math.round), mediana del histograma."""
    v = sel["r_adj"].dropna().to_numpy(); v = v[(v >= 0.30) & (v <= 1.10)]
    if len(v) < MIN_ENTIDAD: return None
    pts = np.round(100 * (1 - v)).astype(int)
    return float(np.median(pts))

def precio_B1(H, fila, fecha):
    for nivel in ["entidad", "departamento", "pais"]:
        sel = H.comparables(fila, nivel, fecha)
        if len(sel) >= MIN_ENTIDAD: return float(sel["r_adj"].median()), nivel
    return None, None

def precio_B2(H, fila, fecha):
    for nivel in ["entidad_familia", "entidad", "departamento_familia"]:
        sel = H.comparables(fila, nivel, fecha); b = baja_indice(sel)
        if b is not None: return 1 - b / 100, nivel
    sel = H.comparables(fila, "pais", fecha); b = baja_indice(sel)   # respaldo declarado para el backtest (Detekta diría «Sin referencia»)
    return (1 - b / 100, "pais_respaldo") if b is not None else (None, None)

def tabla_insercion(H, ids, mx_de):
    """Para cada proceso, la tasa de victoria (sin piso y con piso) de cada b de la rejilla al insertarse en sus ofertas reales. Se calcula UNA vez."""
    T = {}
    for pid in ids:
        x = H.ofertas.get(pid)
        if not x: continue
        rs = [o[2] for o in x["ofertas"]]; mx = mx_de[x["modalidad"]]
        sin = np.zeros(len(REJILLA)); con = np.zeros(len(REJILLA))
        for j, b in enumerate(REJILLA):
            v, vp, _ = valor_esperado(rs, b, mx); sin[j] = v; con[j] = vp
        T[pid] = (sin, con)
    return T

def precio_Fopt(H, T, fila, fecha, con_piso, minimo=None, maximo=1.0, max_comparables=300):
    """Optimizador: el b de la rejilla que maximiza la tasa de victoria simulada al insertarse en los conjuntos de ofertas de los comparables anteriores (entidad ≥5, si no departamento, si no país; hasta 300, los más recientes)."""
    for nivel in ["entidad", "departamento", "pais"]:
        sel = H.comparables(fila, nivel, fecha)
        sel = sel[(sel["n"] >= 2) & sel.index.isin(T.keys())]
        if len(sel) >= MIN_ENTIDAD: break
    else: return None, None, None
    sel = sel.sort_values("fecha_adjudicacion").tail(max_comparables)
    M = np.mean([T[pid][1 if con_piso else 0] for pid in sel.index], axis=0)
    ok = np.array([(minimo is None or b >= minimo - 1e-12) and b <= maximo + 1e-12 for b in REJILLA])
    M = np.where(ok, M, -1); j = int(np.argmax(M))
    return REJILLA[j], nivel, {"tasa_esperada": float(M[j]), "n_comparables": int(len(sel))}

def evaluar(H, filas_eval, mx_de, estrategias, con_piso_eval, prefijo):
    """Para cada proceso de evaluación, cada estrategia elige b con lo ANTERIOR; se inserta en las ofertas reales. Devuelve DataFrame largo."""
    reg = []
    for pid, fila in filas_eval.iterrows():
        x = H.ofertas.get(pid)
        if not x or len(x["ofertas"]) < 1: continue
        rs = [o[2] for o in x["ofertas"]]; mx = mx_de[fila["modalidad"]]; fecha = fila["fecha_adjudicacion"]
        for nombre, fn in estrategias.items():
            b, nivel, extra = fn(fila, fecha, mx)
            if b is None: reg.append({"portafolio": pid, "estrategia": nombre, "b": None}); continue
            v, vp, bp = valor_esperado(rs, b, mx)
            reg.append({"portafolio": pid, "codigo_entidad": fila["codigo_entidad"], "modalidad": fila["modalidad"], "anio": fila["anio"], "n": len(rs),
                        "estrategia": nombre, "b": b, "nivel": nivel, "gana_sin_piso": v, "gana_con_piso": vp, "bajo_piso": bp,
                        "pred": (extra or {}).get("tasa_esperada"), "ganador_real_r": fila["r_ganador"]})
    return pd.DataFrame(reg)

def resumen(E, col):
    out = {}
    for est, g in E[E["b"].notna()].groupby("estrategia"):
        out[est] = {"procesos": int(len(g)), "precio_medio_pct": 100 * float(g["b"].mean()), "precio_mediano_pct": 100 * float(g["b"].median()),
                    "tasa_de_cada_100": remuestreo_media(g, col, escala=100),
                    "bajo_piso_de_cada_100": 100 * float(g["bajo_piso"].mean())}
    return out

def diferencias(E, col, ref="B2"):
    """Diferencia por proceso (emparejada) de cada estrategia frente a la referencia, con IC por entidad."""
    W = E[E["b"].notna()].pivot_table(index=["portafolio", "codigo_entidad"], columns="estrategia", values=col).reset_index()
    out = {}
    for est in W.columns:
        if est in ("portafolio", "codigo_entidad", ref): continue
        D = W[["codigo_entidad", est, ref]].dropna(); D = D.assign(d=100 * (D[est] - D[ref]))
        out[f"{est} − {ref}"] = {"procesos_emparejados": int(len(D)), **remuestreo_media(D, "d")}
    return out

def calibracion(E, est, col):
    g = E[(E["estrategia"] == est) & E["pred"].notna() & E["b"].notna()]
    if len(g) < 50: return None
    p = g["pred"].clip(1e-6, 1 - 1e-6).to_numpy(); y = g[col].to_numpy()
    brier = float(np.mean((p - y) ** 2)); ll = float(-np.mean(y * np.log(p) + (1 - y) * np.log(1 - p)))
    dec = pd.qcut(pd.Series(p).rank(method="first"), 10, labels=False); tabla = pd.DataFrame({"p": p, "y": y, "d": dec}).groupby("d").agg(pred=("p", "mean"), obs=("y", "mean"), n=("y", "size"))
    pend = float(np.polyfit(tabla["pred"], tabla["obs"], 1)[0]) if tabla["pred"].std() > 0 else None
    base = float(np.mean(y)); brier_base = float(np.mean((base - y) ** 2))
    return {"procesos": int(len(g)), "brier": brier, "brier_constante": brier_base, "log_loss": ll, "pendiente_calibracion": pend, "deciles": tabla.round(4).to_dict("records")}

def pred_n(H, P_eval):
    """¿Cuántos se presentan? Predicción con la mediana de n de la entidad (anteriores, ≥5) frente a la del país; MAE."""
    reg = []
    for pid, f in P_eval.iterrows():
        e = H.comparables(f, "entidad", f["fecha_adjudicacion"]); p = H.comparables(f, "pais", f["fecha_adjudicacion"])
        if len(p) < MIN_ENTIDAD: continue
        reg.append({"codigo_entidad": f["codigo_entidad"], "real": f["n"], "ent": float(e["n"].median()) if len(e) >= MIN_ENTIDAD else None, "pais": float(p["n"].median())})
    D = pd.DataFrame(reg)
    if D.empty: return None
    Dc = D[D["ent"].notna()]
    return {"procesos": int(len(D)), "con_historia_de_entidad": int(len(Dc)), "mae_entidad": float((Dc["real"] - Dc["ent"]).abs().mean()) if len(Dc) else None,
            "mae_pais_mismos": float((Dc["real"] - Dc["pais"]).abs().mean()) if len(Dc) else None, "mae_pais_todos": float((D["real"] - D["pais"]).abs().mean())}

# ---------- logit condicional del ganador ----------
def logit_condicional(O, ids_train, ids_test, caracteristicas):
    """P(gana i | proceso) ∝ exp(xᵢ·β). Newton–Raphson. Devuelve β y log-verosimilitud por proceso en prueba vs uniforme y vs 'gana la más baja'."""
    def arma(ids):
        X, y = [], []
        for x in O:
            if x["portafolio"] not in ids or not x["ganador"] or len(x["ofertas"]) < 2: continue
            rs = np.array([o[2] for o in x["ofertas"]]); prov = [o[0] for o in x["ofertas"]]
            if x["ganador"] not in prov: continue
            feats = caracteristicas(rs); X.append(feats); y.append(prov.index(x["ganador"]))
        return X, y
    Xtr, ytr = arma(ids_train); Xte, yte = arma(ids_test)
    if len(Xtr) < 50 or len(Xte) < 20: return None
    k = Xtr[0].shape[1]; beta = np.zeros(k)
    for it in range(50):
        g = np.zeros(k); Hm = np.zeros((k, k)); ll = 0
        for X, y in zip(Xtr, ytr):
            u = X @ beta; u -= u.max(); p = np.exp(u); p /= p.sum(); ll += math.log(p[y] + 1e-300)
            g += X[y] - p @ X; xb = X - p @ X; Hm -= (xb * p[:, None]).T @ xb
        paso = np.linalg.solve(Hm - 1e-6 * np.eye(k), g); beta -= paso
        if np.abs(paso).max() < 1e-8: break
    def lls(X_, y_, b):
        out = []
        for X, y in zip(X_, y_):
            u = X @ b; u -= u.max(); p = np.exp(u); p /= p.sum(); out.append(math.log(p[y] + 1e-300))
        return float(np.mean(out))
    ll_mod = lls(Xte, yte, beta); ll_unif = float(np.mean([-math.log(len(y_)) if False else -math.log(X.shape[0]) for X in Xte]))
    acierto_mod = float(np.mean([int(np.argmax(X @ beta) == y) for X, y in zip(Xte, yte)]))
    acierto_baja = float(np.mean([int(np.argmin(X[:, 0]) == y) for X, y in zip(Xte, yte)]))
    return {"procesos_entrenamiento": len(Xtr), "procesos_prueba": len(Xte), "beta": beta.tolist(), "log_verosimilitud_media_prueba": ll_mod, "log_verosimilitud_uniforme": ll_unif,
            "acierto_top1_modelo": acierto_mod, "acierto_top1_mas_baja": acierto_baja, "acierto_uniforme_esperado": float(np.mean([1 / X.shape[0] for X in Xte]))}

def caracteristicas_basicas(rs):
    n = len(rs); med = np.median(rs); m = rs.mean(); s = rs.std(ddof=1) if n > 1 else 0
    rango = np.argsort(np.argsort(rs)) / max(n - 1, 1)
    return np.column_stack([rs, np.abs(rs - med) * 100, (rs - m) / s if s > 0 else np.zeros(n), rango, (rs == rs.min()).astype(float)])

if __name__ == "__main__":
    carpeta, aux, salida = sys.argv[1], sys.argv[2], sys.argv[3]; prueba = "--prueba" in sys.argv
    P = pd.read_csv(os.path.join(salida, "procesos.csv")); extra = json.load(open(os.path.join(aux, "p6dx_extra.json")))
    P["familia"] = P["portafolio"].map(lambda k: (extra.get(k, {}).get("unspsc") or "")[3:7] or None)   # «V1.72101500» → «7210» (familia = 4 dígitos)
    P.loc[P["familia"].isin(["", "UNSP"]), "familia"] = None
    O = cargar_ofertas(carpeta)
    U = P[P["excluido"].isna() & P["inconsistencia"].isna() & P["modalidad"].isin(["licitacion", "menor_cuantia"]) & P["anio"].notna() & P["r_ganador"].notna()].copy()
    U = U.set_index("portafolio"); H = Historia(O, U.reset_index(), extra)
    T = tabla_insercion(H, list(U.index), PUNTAJE_MAX); print("tabla de inserción:", len(T), "procesos", flush=True)
    R = {"semilla": SEMILLA, "procesos_universo": int(len(U)), "por_anio": {int(a): int(n) for a, n in U["anio"].value_counts().sort_index().items()}}
    anio_val = 2025; anios_prueba = [2026] if prueba else []
    estrategias_sin = {
        "B0": lambda f, fecha, mx: (ALERTA[f["modalidad"]], "alerta", None),
        "B1": lambda f, fecha, mx: (*precio_B1(H, f, fecha), None),
        "B2": lambda f, fecha, mx: (*precio_B2(H, f, fecha), None),
        "F_opt": lambda f, fecha, mx: precio_Fopt(H, T, f, fecha, con_piso=False),
        "F_opt_piso": lambda f, fecha, mx: precio_Fopt(H, T, f, fecha, con_piso=True),
        "F_opt_piso_alerta": lambda f, fecha, mx: precio_Fopt(H, T, f, fecha, con_piso=True, minimo=ALERTA[f["modalidad"]]),
    }
    for etiqueta, anios in [("validacion_2025", [anio_val])] + ([("prueba_2026", anios_prueba)] if prueba else []):
        ev = U[U["anio"].isin(anios) & (U["n"] >= 1)]
        E = evaluar(H, ev, PUNTAJE_MAX, estrategias_sin, True, etiqueta)
        E.to_csv(os.path.join(salida, f"backtest_{etiqueta}.csv"), index=False)
        R[etiqueta] = {"procesos_evaluados": int(ev.shape[0]),
                       "sin_piso": {"resumen": resumen(E, "gana_sin_piso"), "diferencias_vs_B2": diferencias(E, "gana_sin_piso")},
                       "con_piso": {"resumen": resumen(E, "gana_con_piso"), "diferencias_vs_B2": diferencias(E, "gana_con_piso")},
                       "por_modalidad": {m: {"sin_piso": resumen(g, "gana_sin_piso"), "con_piso": resumen(g, "gana_con_piso")} for m, g in E.groupby("modalidad")},
                       "por_tramo_n": {t: {"sin_piso": resumen(g, "gana_sin_piso")} for t, g in E.assign(t=E["n"].map(tramo)).groupby("t")},
                       "calibracion_F_opt_piso": calibracion(E, "F_opt_piso", "gana_con_piso"), "calibracion_F_opt": calibracion(E, "F_opt", "gana_sin_piso"),
                       "prediccion_n": pred_n(H, ev)}
        ids_tr = set(U[U["anio"] < min(anios)].index); ids_te = set(ev.index)
        R[etiqueta]["logit_condicional"] = logit_condicional(O, ids_tr, ids_te, caracteristicas_basicas)
    json.dump(R, open(os.path.join(salida, "fase5_7_modelo.json"), "w"), ensure_ascii=False, indent=1, default=lambda o: None if (isinstance(o, float) and not np.isfinite(o)) else (float(o) if isinstance(o, np.floating) else int(o) if isinstance(o, np.integer) else str(o)))
    print("listo")
