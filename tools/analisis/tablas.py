#!/usr/bin/env python3
"""Tablas Markdown del backtest para el informe. Uso: python3 -I tools/analisis/tablas.py <carpeta_salida> <archivo_json> <etiqueta>"""
import sys, json, os
def f1(x): return "—" if x is None else f"{x:.1f}".replace(".", ",")
def tabla(v, clave, titulo):
    L = [f"**{titulo}**", "", "| Regla | Precio medio (% del presupuesto) | Gana (de cada 100) · todas las ofertas publicadas como hábiles | IC 95 % | Gana si quedar bajo mediana − σ es rechazo | IC 95 % | Queda bajo ese piso (de cada 100) |", "|---|---|---|---|---|---|---|"]
    rs = v[clave]["sin_piso"]["resumen"] if clave else v["sin_piso"]["resumen"]
    rc = v[clave]["con_piso"]["resumen"] if clave else v["con_piso"]["resumen"]
    for e in rs:
        a, b = rs[e], rc[e]
        L.append(f"| {e} | {f1(a['precio_medio_pct'])} | {f1(a['tasa_de_cada_100']['valor'])} | {f1(a['tasa_de_cada_100']['ic95'][0])}–{f1(a['tasa_de_cada_100']['ic95'][1])} | {f1(b['tasa_de_cada_100']['valor'])} | {f1(b['tasa_de_cada_100']['ic95'][0])}–{f1(b['tasa_de_cada_100']['ic95'][1])} | {f1(a['bajo_piso_de_cada_100'])} |")
    return "\n".join(L)
def difs(d, titulo):
    L = [f"**{titulo}** (diferencia por proceso, puntos de cada 100, IC 95 % por remuestreo de entidades)", "", "| Comparación | Diferencia | IC 95 % | Procesos emparejados |", "|---|---|---|---|"]
    for k, x in d.items():
        L.append(f"| {k} | {f1(x['valor'])} | {f1(x['ic95'][0])} a {f1(x['ic95'][1])} | {x['procesos_emparejados']:,} |".replace(",", "."))
    return "\n".join(L)
if __name__ == "__main__":
    salida, arch, et = sys.argv[1], sys.argv[2], sys.argv[3]
    r = json.load(open(os.path.join(salida, arch))); v = r[et]
    out = [tabla(v, None, f"{et} · todos los procesos ({v['procesos_evaluados']:,})".replace(",", ".")), "",
           tabla(v, "competencia_3_o_mas", f"{et} · solo procesos con 3 o más ofertas publicadas"), "",
           difs(v["competencia_3_o_mas"]["con_piso"]["diferencias_vs_C96.5"], f"{et} · 3+ ofertas, con el piso como rechazo: cada regla frente a la constante 96,5 %"), "",
           difs(v["competencia_3_o_mas"]["con_piso"]["diferencias_vs_B2"], f"{et} · 3+ ofertas, con el piso como rechazo: cada regla frente a B2 (Detekta hoy)")]
    print("\n".join(out))
