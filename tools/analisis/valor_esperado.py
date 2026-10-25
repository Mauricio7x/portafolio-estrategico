#!/usr/bin/env python3
"""Fase 8 · de «ganar más veces» a «ganar más pesos»: valor esperado por proceso con un costo supuesto.
Uso:  python3 -I tools/analisis/valor_esperado.py <carpeta_base> <carpeta_aux> <carpeta_procesos> <carpeta_salida> [--anio-validacion AAAA]
Reutiliza modelo.py (simulador de inserción, comparables anteriores, líneas base): no reescribe ninguna regla.
Valor de una oferta b (fracción del precio base) con costo c (fracción del precio base):  P(gana | b) × (b − c).
  · P(gana | b): la misma del backtest «con piso» (oferta bajo mediana−σ = rechazada); se muestra también la variante sin piso.
  · c es un SUPUESTO (rejilla) hasta que el dueño dé el suyo; c incluye lo que descuenta el contrato (contribución, estampillas, financiero).
  · Regla del dueño «margen ≥ 0»: si la estrategia propone b < c + MARGEN_MIN, se sube a c + MARGEN_MIN (nunca más de 100 % del precio base);
    si ni así cabe (c + MARGEN_MIN > 1), no se oferta (valor 0).
Sin --prueba: el año 2026 no se toca. Semilla y remuestreo por entidad, los de analisis.py.
"""
import sys, os, json, time
import numpy as np, pandas as pd
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from analisis import SEMILLA
from hipotesis import remuestreo_media, cargar_ofertas
import modelo as M

COSTOS = [round(0.70 + 0.01 * i, 2) for i in range(24)]      # 70 % … 93 % del precio base
COSTOS_TABLA = [0.78, 0.82, 0.86, 0.90]
MARGEN_MIN = 0.02                                              # supuesto declarado: 2 puntos del precio base como utilidad mínima

def curva_valor(T, ids, c):
    """Valor esperado medio en cada punto de la rejilla (con piso) para c; puntos con b < c + MARGEN_MIN valen 0 (no se ofertan)."""
    xs = [T[p][1] for p in ids if p in T]
    if not xs: return None
    P = np.mean(xs, axis=0); b = np.asarray(M.REJILLA)
    return np.where(b >= c + MARGEN_MIN - 1e-12, P * (b - c), 0.0)

def mejor_b(curva):
    return None if curva is None or curva.max() <= 0 else M.REJILLA[int(np.argmax(curva))]

def precio_V_comparables(H, T, fila, fecha, c, max_comparables=300):
    """Como F_opt_piso pero maximizando P×(b−c) sobre los comparables ANTERIORES (el análogo del optimizador de Detekta con la P de comparables)."""
    for nivel in ["entidad", "departamento", "pais"]:
        sel = H.comparables(fila, nivel, fecha); sel = sel[(sel["n"] >= 2) & sel.index.isin(T.keys())]
        if len(sel) >= M.MIN_ENTIDAD: break
    else: return None
    sel = sel.sort_values("fecha_adjudicacion").tail(max_comparables)
    P = np.mean([T[pid][1] for pid in sel.index], axis=0); b = np.asarray(M.REJILLA)
    v = np.where(b >= c + MARGEN_MIN - 1e-12, P * (b - c), 0.0)
    return M.REJILLA[int(np.argmax(v))] if v.max() > 0 else None

def aplicar_regla(b, c):
    """Margen ≥ 0 con utilidad mínima: devuelve la oferta efectiva, o None si no cabe."""
    if b is None: return None
    b2 = max(b, c + MARGEN_MIN)
    return b2 if b2 <= 1.0 + 1e-12 else None

def main():
    carpeta, aux, procesos, salida = sys.argv[1:5]
    anio_val = int(sys.argv[sys.argv.index("--anio-validacion") + 1]) if "--anio-validacion" in sys.argv else 2025
    P = pd.read_csv(os.path.join(procesos, "procesos.csv")); extra = json.load(open(os.path.join(aux, "p6dx_extra.json")))
    P["familia"] = P["portafolio"].map(lambda k: (extra.get(k, {}).get("unspsc") or "")[3:7] or None)
    P.loc[P["familia"].isin(["", "UNSP"]), "familia"] = None
    O = cargar_ofertas(carpeta); pbase = {x["portafolio"]: x["precio_base"] for x in O}
    U = P[P["excluido"].isna() & P["inconsistencia"].isna() & P["modalidad"].isin(["licitacion", "menor_cuantia"]) & P["anio"].notna() & P["r_ganador"].notna()].copy().set_index("portafolio")
    H = M.Historia(O, U.reset_index(), extra)
    t0 = time.time(); T = M.tabla_insercion(H, list(U.index), M.PUNTAJE_MAX); print("tabla de inserción:", len(T), "procesos", round(time.time() - t0), "s", flush=True)
    ev = U[(U["anio"] == anio_val) & (U["n"] >= 1) & U["fecha_cierre"].notna()]
    prev = U[(U["anio"] == anio_val - 1) & (U["n"] >= 3)]
    ids_prev = list(prev.index); ids_dentro = list(ev[ev["n"] >= 3].index)
    cache = {}
    def gana(pid, b):
        k = (pid, round(b, 4))
        if k not in cache:
            x = H.ofertas[pid]; rs = [o[2] for o in x["ofertas"]]; v, vp, bp, vpe, bpe = M.valor_esperado4(rs, b, M.PUNTAJE_MAX[x["modalidad"]])
            cache[k] = (v, vp, vpe)
        return cache[k]
    filas = []
    for c in COSTOS:
        b_prev_v = mejor_b(curva_valor(T, ids_prev, c)); b_dentro_v = mejor_b(curva_valor(T, ids_dentro, c))
        for pid, f in ev.iterrows():
            x = H.ofertas.get(pid)
            if not x: continue
            fecha = f["fecha_cierre"]
            if not isinstance(fecha, str): continue
            propuestas = {"B0_88": M.ALERTA[f["modalidad"]], "B1_mediana_entidad": M.precio_B1(H, f, fecha)[0], "B2_Detekta_hoy": M.precio_B2(H, f, fecha)[0],
                          "C95": 0.95, "C96.5": 0.965, "C98": 0.98, "Piso_comparables": M.precio_piso_comparables(H, f, fecha)[0],
                          "V_const_ano_anterior": b_prev_v, "V_const_oraculo": b_dentro_v, "V_comparables": precio_V_comparables(H, T, f, fecha, c)}
            for est, b in propuestas.items():
                be = aplicar_regla(b, c)
                if b is None: continue                                           # sin referencia: la estrategia no aplica
                if be is None: g = (0.0, 0.0, 0.0); margen = 0.0; ofertó = 0      # no cabe margen: no se oferta
                else:
                    g = gana(pid, be); margen = be - c; ofertó = 1
                filas.append({"portafolio": pid, "codigo_entidad": f["codigo_entidad"], "modalidad": f["modalidad"], "n": len(x["ofertas"]), "pb": pbase.get(pid), "costo": c, "estrategia": est,
                              "b_propuesta": b, "b_efectiva": be, "subio_por_costo": int(be is not None and be > b + 1e-12), "oferto": ofertó,
                              "gana": g[1], "gana_sin_piso": g[0], "gana_ext": g[2], "valor": g[1] * margen * 100, "valor_sin_piso": g[0] * margen * 100, "valor_ext": g[2] * margen * 100})
        print("costo", c, "listo", round(time.time() - t0), "s", flush=True)
    E = pd.DataFrame(filas); E.to_csv(os.path.join(salida, f"valor_esperado_val{anio_val}.csv.gz"), index=False, compression="gzip")
    R = {"anio_validacion": anio_val, "margen_minimo_supuesto": MARGEN_MIN, "semilla": SEMILLA,
         "constantes_por_valor": {str(c): {"ano_anterior": mejor_b(curva_valor(T, ids_prev, c)), "oraculo_en_muestra": mejor_b(curva_valor(T, ids_dentro, c))} for c in COSTOS},
         "procesos_evaluados": int(len(ev)), "procesos_3_o_mas": int((ev["n"] >= 3).sum())}
    def resumen(D):
        out = {}
        for est, g in D.groupby("estrategia"):
            w = g["pb"].fillna(0).to_numpy(); v = g["valor"].to_numpy()
            out[est] = {"procesos": int(len(g)), "valor_puntos_del_precio_base": remuestreo_media(g, "valor"), "gana_de_cada_100": remuestreo_media(g, "gana", escala=100),
                        "valor_sin_piso": float(g["valor_sin_piso"].mean()), "valor_con_piso_solo_ofertas_reales": float(g["valor_ext"].mean()),
                        "valor_ponderado_por_precio_base": float((v * w).sum() / w.sum()) if w.sum() > 0 else None,
                        "precio_medio_efectivo_pct": 100 * float(g.loc[g["oferto"] == 1, "b_efectiva"].mean()) if (g["oferto"] == 1).any() else None,
                        "subio_por_costo_pct": 100 * float(g["subio_por_costo"].mean()), "no_oferto_pct": 100 * float(1 - g["oferto"].mean())}
        return out
    def dif(D, a, b):
        W = D[D["estrategia"].isin([a, b])].pivot_table(index=["portafolio", "codigo_entidad"], columns="estrategia", values="valor").reset_index().dropna(subset=[a, b])
        W = W.assign(d=W[a] - W[b]); return {"procesos_emparejados": int(len(W)), **remuestreo_media(W, "d")}
    for nombre, filtro in [("3_o_mas", E["n"] >= 3), ("todos", E["n"] >= 1), ("1_o_2", E["n"] <= 2)]:
        D = E[filtro]; R[nombre] = {}
        for c in COSTOS:
            Dc = D[D["costo"] == c]
            R[nombre][str(c)] = {"resumen": resumen(Dc), "diferencias": {f"{a} − {b}": dif(Dc, a, b) for a, b in [("V_const_ano_anterior", "B2_Detekta_hoy"), ("C96.5", "B2_Detekta_hoy"), ("V_comparables", "B2_Detekta_hoy"),
                                                                            ("V_comparables", "V_const_ano_anterior"), ("Piso_comparables", "V_const_ano_anterior"), ("C96.5", "V_const_ano_anterior"), ("B2_Detekta_hoy", "B0_88")]}}
    json.dump(R, open(os.path.join(salida, f"valor_esperado_val{anio_val}.json"), "w"), ensure_ascii=False, indent=1, default=lambda o: float(o) if isinstance(o, np.floating) else int(o) if isinstance(o, np.integer) else str(o))
    print("listo")

if __name__ == "__main__":
    main()
