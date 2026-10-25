#!/usr/bin/env python3
"""Robustez de H13: diferencia de valor «constante del año anterior − B2 (Detekta hoy)» bajo otras lecturas del rechazo, por modalidad y por número de ofertas.
Uso:  python3 -I tools/analisis/valor_robustez.py <valor_esperado_valAAAA.csv.gz> <salida.json>   (el CSV sale de valor_esperado.py; pesa MB y no se versiona)
"""
import sys, os, json
import numpy as np, pandas as pd
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from hipotesis import remuestreo_media

E = pd.read_csv(sys.argv[1]); R = {}
LECTURAS = [("3_o_mas_con_piso_base", lambda D: D.n >= 3, "valor"), ("3_o_mas_sin_piso", lambda D: D.n >= 3, "valor_sin_piso"),
            ("3_o_mas_piso_solo_ofertas_reales", lambda D: D.n >= 3, "valor_ext"), ("3_o_mas_licitacion", lambda D: (D.n >= 3) & (D.modalidad == "licitacion"), "valor"),
            ("3_o_mas_menor_cuantia", lambda D: (D.n >= 3) & (D.modalidad == "menor_cuantia"), "valor"), ("todos", lambda D: D.n >= 1, "valor"), ("solo_1_o_2_ofertas", lambda D: D.n <= 2, "valor")]
for c in sorted(E["costo"].unique()):
    if round(c, 2) not in (0.78, 0.82, 0.86, 0.90): continue
    D0 = E[E["costo"] == c]; R[str(round(c, 2))] = {}
    for nombre, filtro, col in LECTURAS:
        W = D0[filtro(D0) & D0["estrategia"].isin(["V_const_ano_anterior", "B2_Detekta_hoy"])].pivot_table(index=["portafolio", "codigo_entidad"], columns="estrategia", values=col).reset_index().dropna(subset=["V_const_ano_anterior", "B2_Detekta_hoy"])
        W = W.assign(d=W["V_const_ano_anterior"] - W["B2_Detekta_hoy"])
        R[str(round(c, 2))][nombre] = {"procesos": int(len(W)), "constante": float(W["V_const_ano_anterior"].mean()), "B2": float(W["B2_Detekta_hoy"].mean()), "constante_menos_B2": remuestreo_media(W, "d")}
json.dump(R, open(sys.argv[2], "w"), ensure_ascii=False, indent=1)
