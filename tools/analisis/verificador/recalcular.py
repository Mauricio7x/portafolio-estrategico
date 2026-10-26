#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Recálculo independiente del conteo de la Fase 0.

Implementa LITERALMENTE ESPECIFICACION.md, sin haber visto ningún otro código del estudio.
Solo biblioteca estándar.

Uso:  python3 -I recalcular.py <carpeta_datos> <salida.json> [--sin-sensibilidad]

Lee de <carpeta_datos> únicamente:
  - p6dx_obra.json          (filas crudas, una por fase de un proceso)
  - ofertas_cruzadas.json   (pares [id_del_portafolio, [grupos de oferta]])

Donde la especificación es ambigua se elige UNA lectura (la "base"), se anota en "notas" y,
cuando es barato, se mide cuánto cambiarían los totales con la lectura alternativa
(clave "sensibilidad" de la salida). Esa medición NO altera la tabla principal.
"""
import sys
import json
import re
import time
import unicodedata
from decimal import Decimal, getcontext, ROUND_HALF_UP
from functools import lru_cache
from collections import defaultdict, Counter

# Aritmética exacta (sumas, restas y productos de montos con centavos no se redondean).
getcontext().prec = 60

ANIOS = ["2020", "2021", "2022", "2023", "2024", "2025", "2026"]
OTRO = "otro_o_sin_fecha"
MODALIDADES = ["licitacion", "menor_cuantia", "minima"]
COLUMNAS = ["adjudicados", "a", "b", "c", "d", "usable"]

# ---------------------------------------------------------------------------------------------
# Opciones de lectura. Los valores de OPC_BASE son la lectura elegida; las variantes cambian UNA.
# ---------------------------------------------------------------------------------------------
OPC_BASE = {
    "a_pb": "fila",              # `a` usa el precio_base de la fila elegida (alt.: el único positivo del proceso)
    "pb_excl": "proceso",        # precio base del proceso = único positivo entre TODAS sus filas (alt.: solo fila elegida)
    "conf_todos": False,         # conflicto NIT->nombres se mide sobre grupos que pasan 1 y 2 (alt.: todos los grupos)
    "conf_nombres_todos": False, # en el conflicto solo cuentan nombres que identifican (alt.: cualquier nombre, incl. vacío/no definido)
    "d_nivel": "componente",     # `d`: la identidad del oferente (unión de sus grupos) incluye un NIT válido (alt.: el grupo conservado)
    "cod_union": True,           # grupos identificados solo por código con el mismo código = mismo oferente (alt.: nunca se unen)
    "adj_cod": False,            # identidad del adjudicatario sin código de proveedor (alt.: con `codigoproveedor` si no hay NIT ni nombre)
    "union_finales": False,      # unión transitiva sobre grupos que pasan 1-3 (alt.: solo sobre los que además pasan 5 y 6)
    "sas": "palabra",            # "s a s"->"sas" como palabras sueltas (alt.: como subcadena)
    "empate": "ultimo",          # a igual clave de ordenamiento gana la última fila del archivo (alt.: la primera)
}

VARIANTES = {
    "a_con_precio_base_del_proceso": {"a_pb": "proceso"},
    "precio_base_solo_fila_elegida": {"pb_excl": "elegida"},
    "conflicto_nit_sobre_todos_los_grupos": {"conf_todos": True},
    "conflicto_nit_cuenta_cualquier_nombre": {"conf_nombres_todos": True},
    "d_con_nit_del_grupo_conservado": {"d_nivel": "grupo"},
    "codigo_nunca_une_grupos": {"cod_union": False},
    "adjudicatario_tambien_por_codigo": {"adj_cod": True},
    "union_solo_sobre_ofertas_finales": {"union_finales": True},
    "sas_como_subcadena": {"sas": "subcadena"},
    "empate_gana_la_primera_fila": {"empate": "primero"},
}

# ---------------------------------------------------------------------------------------------
# Utilidades de texto y números
# ---------------------------------------------------------------------------------------------
RE_NUMERO = re.compile(r"-?[0-9]+(?:\.[0-9]+)?")


def a_numero(v):
    """Número solo si el texto (sin espacios a los lados) casa con ^-?\\d+(\\.\\d+)?$.
    Devuelve Decimal, o None = «sin dato» (jamás 0)."""
    if isinstance(v, bool):
        return None
    if isinstance(v, (int, float)):   # no ocurre en estos archivos (todo viene como texto)
        v = str(v)
    if not isinstance(v, str):
        return None
    t = v.strip()
    if not RE_NUMERO.fullmatch(t):
        return None
    return Decimal(t)


def sin_tildes(s):
    """Quita las marcas diacríticas (NFD y descarta categoría Mn)."""
    return "".join(c for c in unicodedata.normalize("NFD", s) if unicodedata.category(c) != "Mn")


def espacios_simples(s):
    return " ".join(s.split())


def norm_modalidad(s):
    if not isinstance(s, str):
        return ""
    return espacios_simples(sin_tildes(s).lower())


MAPA_MODALIDAD = {
    "licitacion publica": "licitacion",
    "licitacion publica obra publica": "licitacion",
    "seleccion abreviada de menor cuantia": "menor_cuantia",
    "seleccion abreviada menor cuantia sin manifestacion interes": "menor_cuantia",
    "minima cuantia": "minima",
}

# Caracteres que se eliminan del nombre: . , ; : ( ) " ' ´ `
_PUNTUACION = str.maketrans("", "", ".,;:()\"'´`")
# "s a s" y "s a" solo como palabras sueltas (inicio/espacio antes y espacio/fin después)
_RE_SAS = re.compile(r"(?<![^ ])s a s(?![^ ])")
_RE_SA = re.compile(r"(?<![^ ])s a(?![^ ])")


@lru_cache(maxsize=None)
def nombre_comp_palabra(s):
    """Nombre comparable: sin tildes, minúsculas, sin . , ; : ( ) " ' ´ `, 's a s'->'sas', 's a'->'sa'."""
    t = sin_tildes(s).lower().translate(_PUNTUACION)
    t = espacios_simples(t)
    t = _RE_SAS.sub("sas", t)
    t = _RE_SA.sub("sa", t)
    return espacios_simples(t)


@lru_cache(maxsize=None)
def nombre_comp_subcadena(s):
    """Misma regla, pero 's a s' y 's a' se sustituyen donde aparezcan (variante de sensibilidad)."""
    t = sin_tildes(s).lower().translate(_PUNTUACION)
    t = espacios_simples(t)
    t = t.replace("s a s", "sas").replace("s a", "sa")
    return espacios_simples(t)


def nombre_comparable(v, modo):
    """Aplica la regla al campo crudo; un campo ausente o no-texto es nombre vacío."""
    if not isinstance(v, str):
        return ""
    return nombre_comp_palabra(v) if modo == "palabra" else nombre_comp_subcadena(v)


# Nombres que NO identifican (ya comparables)
NOMBRES_SIN_IDENTIDAD = frozenset(["", "no definido", "sin descripcion", "confidencial"])

_RE_QUITAR_NIT = re.compile(r"[\s.\-]")
_RE_SOLO_DIGITOS = re.compile(r"[0-9]{6,}")
_RE_DIGITO_Y_CEROS = re.compile(r"[1-9]0{5,}")


@lru_cache(maxsize=None)
def nit_valido(v):
    """NIT válido (texto de solo dígitos) o None.
    Quita espacios, puntos y guiones; solo dígitos, 6 o más; no un mismo dígito repetido; no un
    dígito 1-9 seguido de 5 o más ceros; no un prefijo de '1234567890'."""
    if not isinstance(v, str):
        return None
    s = _RE_QUITAR_NIT.sub("", v)
    if not _RE_SOLO_DIGITOS.fullmatch(s):
        return None
    if len(set(s)) == 1:
        return None
    if _RE_DIGITO_Y_CEROS.fullmatch(s):
        return None
    if "1234567890".startswith(s):
        return None
    return s


def codigo_identifica(v):
    """El código de proveedor identifica si no está vacío ni es todo ceros. Devuelve el código o None."""
    if not isinstance(v, str):
        return None
    c = v.strip()
    if not c or set(c) == {"0"}:
        return None
    return c


def entero_final(txt):
    """Número entero al final de id_del_proceso (-1 si no hay)."""
    if not isinstance(txt, str):
        return -1
    m = re.search(r"([0-9]+)$", txt)
    return int(m.group(1)) if m else -1


def a_peso(d):
    """Redondeo al peso (mitad hacia arriba) para comparar «al peso»."""
    return d.quantize(Decimal(1), rounding=ROUND_HALF_UP)


# ---------------------------------------------------------------------------------------------
# Unión transitiva (union-find) por proceso
# ---------------------------------------------------------------------------------------------
class UF:
    __slots__ = ("p",)

    def __init__(self, n):
        self.p = list(range(n))

    def find(self, x):
        p = self.p
        while p[x] != x:
            p[x] = p[p[x]]
            x = p[x]
        return x

    def union(self, a, b):
        ra, rb = self.find(a), self.find(b)
        if ra != rb:
            self.p[rb] = ra


# ---------------------------------------------------------------------------------------------
# Carga y reducción de los crudos
# ---------------------------------------------------------------------------------------------
CAMPOS_FILA = (
    "id_del_proceso", "adjudicado", "valor_total_adjudicacion", "fecha_adjudicacion",
    "fecha_de_publicacion_del", "precio_base", "modalidad_de_contratacion", "numero_de_lotes",
    "nit_del_proveedor_adjudicado", "nombre_del_proveedor", "codigoproveedor",
)


def texto_o_vacio(v):
    return v if isinstance(v, str) else ""


def cargar_procesos(ruta):
    """Agrupa las filas por id_del_portafolio (las que no lo tienen se ignoran).
    Devuelve (dict portafolio -> lista de filas reducidas, nº de filas leídas, nº sin portafolio)."""
    with open(ruta, encoding="utf-8") as f:
        filas = json.load(f)
    procesos = defaultdict(list)
    sin_portafolio = 0
    for r in filas:
        pid = r.get("id_del_portafolio")
        if not isinstance(pid, str) or not pid.strip():
            sin_portafolio += 1
            continue
        procesos[pid].append({k: r.get(k) for k in CAMPOS_FILA})
    return procesos, len(filas), sin_portafolio


def clave_orden(fila):
    """Clave de orden de la especificación (§1): adjudicado=Si, valor adjudicado > 0,
    fecha_adjudicacion, fecha_de_publicacion_del, entero final del id_del_proceso."""
    val = a_numero(fila["valor_total_adjudicacion"])
    return (
        1 if fila["adjudicado"] == "Si" else 0,
        1 if (val is not None and val > 0) else 0,
        texto_o_vacio(fila["fecha_adjudicacion"]),
        texto_o_vacio(fila["fecha_de_publicacion_del"]),
        entero_final(fila["id_del_proceso"]),
    )


def preparar_procesos(procesos, empate):
    """Elige la fila de cada proceso y precalcula lo que luego se usa.
    Orden ascendente por la clave y se toma la ÚLTIMA; a clave igual, la última del archivo
    (o la primera en la variante)."""
    out = {}
    for pid, filas in procesos.items():
        mejor = None
        mejor_k = None
        for fila in filas:
            k = clave_orden(fila)
            if mejor is None or (k >= mejor_k if empate == "ultimo" else k > mejor_k):
                mejor, mejor_k = fila, k
        bases = set()
        for fila in filas:
            pb = a_numero(fila["precio_base"])
            if pb is not None and pb > 0:
                bases.add(pb)
        mod = MAPA_MODALIDAD.get(norm_modalidad(mejor["modalidad_de_contratacion"]), "fuera")
        fa = texto_o_vacio(mejor["fecha_adjudicacion"])[:4]
        anio = fa if fa in ANIOS else OTRO
        out[pid] = {
            "fila": mejor,
            "adjudicado": mejor["adjudicado"] == "Si",
            "mod": mod,
            "anio": anio,
            "valor_adj": a_numero(mejor["valor_total_adjudicacion"]),
            "pb_fila": a_numero(mejor["precio_base"]),
            "bases": bases,
            "lotes": a_numero(mejor["numero_de_lotes"]),
        }
    return out


# ---------------------------------------------------------------------------------------------
# Ofertas válidas de un proceso (§5)
# ---------------------------------------------------------------------------------------------
def analizar_ofertas(grupos, pb, p, opc, est=None):
    """Aplica los pasos 1-6 a los grupos de un proceso y devuelve un dict con lo necesario
    para b, c, d, usable y el rescate. `pb` = precio base positivo del proceso."""
    modo = opc["sas"]

    # Pasos 1 y 2 (en orden de grupos): confidencial por nombre; valor número > 0.
    cand = []        # (nit_valido|None, nombre_comparable, codigo_crudo, valor Decimal)
    todos = []       # (nit_valido|None, nombre_comparable) de TODOS los grupos (solo variante de conflicto)
    for g in grupos:
        if est is not None:
            est["grupos_vistos"] += 1
        nom = nombre_comparable(g.get("nombre_proveedor"), modo)
        if opc["conf_todos"]:
            todos.append((nit_valido(g.get("nit_del_proveedor")), nom))
        if "confidencial" in nom:
            if est is not None:
                est["paso1_descartado_confidencial"] += 1
            continue
        val = a_numero(g.get("valor_de_la_oferta"))
        if val is None or val <= 0:
            if est is not None:
                est["paso2_descartado_valor_sin_dato" if val is None else "paso2_descartado_valor_cero_o_negativo"] += 1
            continue
        cand.append((nit_valido(g.get("nit_del_proveedor")), nom, g.get("c_digo_proveedor"), val))

    # Paso 3, parte previa: un NIT que dentro del proceso aparece con 2 o más nombres comparables
    # distintos no identifica en ese proceso.
    nombres_por_nit = defaultdict(set)
    fuente = todos if opc["conf_todos"] else [(c[0], c[1]) for c in cand]
    for nit, nom in fuente:
        if nit is None:
            continue
        if nom in NOMBRES_SIN_IDENTIDAD and not opc["conf_nombres_todos"]:
            continue
        nombres_por_nit[nit].add(nom)
    conflicto = {n for n, s in nombres_por_nit.items() if len(s) >= 2}
    if est is not None and conflicto:
        est["procesos_con_algun_nit_en_conflicto"] += 1

    # Paso 3: identidad de cada grupo.
    nodos = []   # (claves, valor, tiene_nit_propio)
    for nit, nom, cod, val in cand:
        nit_ef = nit if (nit is not None and nit not in conflicto) else None
        nom_ef = nom if nom not in NOMBRES_SIN_IDENTIDAD else None
        claves = []
        if nit_ef is not None:
            claves.append(("n", nit_ef))
        if nom_ef is not None:
            claves.append(("m", nom_ef))
        if not claves:
            c = codigo_identifica(cod)
            if c is None:
                if est is not None:
                    est["paso3_descartado_sin_identidad"] += 1
                continue   # sin identidad: se descarta
            if est is not None:
                est["paso3_grupos_identificados_solo_por_codigo"] += 1
            claves.append(("c", c) if opc["cod_union"] else ("c", c, len(nodos)))
        nodos.append((claves, val, nit_ef is not None))

    # Rescate (solo para informar): grupos con valor entre 0 y 50 % del precio base, no confidenciales.
    adj_val = p["valor_adj"]
    rescate_exacto = rescate_peso = rescate_peso_ident = False
    if adj_val is not None and adj_val > 0:
        adj_peso = a_peso(adj_val)
        for _nit, _nom, _cod, val in cand:
            if val * 2 < pb:
                if val == adj_val:
                    rescate_exacto = True
                if a_peso(val) == adj_peso:
                    rescate_peso = True
        for _claves, val, _t in nodos:
            if val * 2 < pb and a_peso(val) == adj_peso:
                rescate_peso_ident = True

    # En la variante «unión solo sobre finales», se filtran por 5 y 6 ANTES de unir.
    if opc["union_finales"]:
        nodos = [n for n in nodos if not (n[1] > pb) and not (n[1] * 2 < pb)]

    # Unión transitiva dentro del proceso: comparten NIT válido o nombre comparable (o código, si aplica).
    uf = UF(len(nodos))
    primero = {}
    for i, (claves, _v, _t) in enumerate(nodos):
        for k in claves:
            if k in primero:
                uf.union(primero[k], i)
            else:
                primero[k] = i

    # Pasos 4, 5 y 6.
    vistos = set()
    validas = []     # (raíz, valor, grupo_tiene_nit)
    for i, (claves, val, tnit) in enumerate(nodos):
        r = uf.find(i)
        if (r, val) in vistos:
            if est is not None:
                est["paso4_descartado_repetido"] += 1
            continue            # 4. mismo (oferente, valor) repetido
        vistos.add((r, val))
        if val > pb:
            if est is not None:
                est["paso5_descartado_mayor_al_precio_base"] += 1
            continue            # 5. mayor que el precio base
        if val * 2 < pb:
            if est is not None:
                est["paso6_descartado_menor_al_50_por_ciento"] += 1
            continue            # 6. menor al 50 % del precio base (sin el rescate de otro dataset)
        validas.append((r, val, tnit))
        if est is not None:
            est["grupos_que_quedan_como_oferta_valida"] += 1

    # Un mismo oferente con 2 o más valores distintos válidos: el proceso se excluye (lote por ofertas).
    valores_por_oferente = defaultdict(set)
    for r, val, _t in validas:
        valores_por_oferente[r].add(val)
    lote_ofertas = any(len(s) >= 2 for s in valores_por_oferente.values())

    if est is not None:
        nits_por_raiz = defaultdict(set)
        noms_por_raiz = defaultdict(set)
        for i, (claves, _v, _t) in enumerate(nodos):
            rr = uf.find(i)
            for k in claves:
                if k[0] == "n":
                    nits_por_raiz[rr].add(k[1])
                elif k[0] == "m":
                    noms_por_raiz[rr].add(k[1])
        if any(len(x) >= 2 for x in nits_por_raiz.values()):
            est["procesos_con_oferente_unido_por_2_o_mas_NIT_distintos"] += 1
        if any(len(x) >= 2 for x in noms_por_raiz.values()):
            est["procesos_con_oferente_unido_por_2_o_mas_nombres_distintos"] += 1

    # Identidad con NIT: a nivel de oferente (alguna clave 'n' en su componente) o del grupo conservado.
    comp_con_nit = set()
    for i, (claves, _v, _t) in enumerate(nodos):
        if any(k[0] == "n" for k in claves):
            comp_con_nit.add(uf.find(i))

    # Adjudicatario: misma regla de identidad, con nit_del_proveedor_adjudicado y nombre_del_proveedor
    # de la fila elegida. Su NIT no identifica si en este proceso está en conflicto entre las ofertas.
    fila = p["fila"]
    adj_claves = []
    nit_a = nit_valido(fila["nit_del_proveedor_adjudicado"])
    if nit_a is not None and nit_a not in conflicto:
        adj_claves.append(("n", nit_a))
    nom_a = nombre_comparable(fila["nombre_del_proveedor"], modo)
    if nom_a not in NOMBRES_SIN_IDENTIDAD:
        adj_claves.append(("m", nom_a))
    if not adj_claves and opc["adj_cod"]:
        c = codigo_identifica(fila["codigoproveedor"])
        if c is not None:
            adj_claves.append(("c", c))
    raices_adj = {uf.find(primero[k]) for k in adj_claves if k in primero}
    n_adj = sum(1 for r, _v, _t in validas if r in raices_adj)
    oferta_adj = None
    if n_adj == 1:
        oferta_adj = next(v for r, v, _t in validas if r in raices_adj)

    if opc["d_nivel"] == "componente":
        todas_nit = all(r in comp_con_nit for r, _v, _t in validas)
    else:
        todas_nit = all(t for _r, _v, t in validas)

    return {
        "n_validas": len(validas),
        "lote_ofertas": lote_ofertas,
        "n_adj": n_adj,
        "oferta_adj": oferta_adj,
        "valores": {v for _r, v, _t in validas},
        "todas_nit": todas_nit,
        "rescate_exacto": rescate_exacto,
        "rescate_peso": rescate_peso,
        "rescate_peso_ident": rescate_peso_ident,
    }


# ---------------------------------------------------------------------------------------------
# Cálculo completo para un conjunto de opciones
# ---------------------------------------------------------------------------------------------
def calcular(procesos_crudos, ofertas, opc, est=None):
    prep = preparar_procesos(procesos_crudos, opc["empate"])
    tabla = {m: {a: dict.fromkeys(COLUMNAS, 0) for a in ANIOS + [OTRO]} for m in MODALIDADES}
    diag = {m: Counter() for m in MODALIDADES}
    diag["fuera_de_modalidad_adjudicados"] = 0
    diag["elegida_no_adjudicada"] = 0
    rescate = {m: {a: Counter() for a in ANIOS + [OTRO]} for m in MODALIDADES}

    for pid, p in prep.items():
        if not p["adjudicado"]:
            diag["elegida_no_adjudicada"] += 1
            continue
        mod, anio = p["mod"], p["anio"]
        if mod == "fuera":
            diag["fuera_de_modalidad_adjudicados"] += 1
            continue
        t = tabla[mod][anio]
        d = diag[mod]
        t["adjudicados"] += 1

        # a: valor adjudicado > 0, precio base > 0 y valor <= precio base
        pb_a = p["pb_fila"]
        if opc["a_pb"] == "proceso" and len(p["bases"]) == 1:
            pb_a = next(iter(p["bases"]))
        va = p["valor_adj"]
        if va is not None and va > 0 and pb_a is not None and pb_a > 0 and va <= pb_a:
            t["a"] += 1

        # Exclusiones del proceso, en este orden.
        bases = p["bases"]
        if opc["pb_excl"] == "elegida":
            if p["pb_fila"] is None or p["pb_fila"] <= 0:
                d["excl_sin_precio_base"] += 1
                continue
        if not bases:
            d["excl_sin_precio_base"] += 1
            continue
        if len(bases) >= 2:
            d["excl_varios_precios_base"] += 1
            continue
        if p["lotes"] is not None and p["lotes"] > 1:
            d["excl_numero_de_lotes_mayor_1"] += 1
            continue
        grupos = ofertas.get(pid)
        if not grupos:
            d["excl_sin_ofertas"] += 1
            continue
        pb = next(iter(bases))

        r = analizar_ofertas(grupos, pb, p, opc, est)
        d["analizados_con_ofertas"] += 1

        if r["rescate_peso"]:
            rescate[mod][anio]["peso"] += 1
            rescate[mod][anio]["peso_en_b" if (not r["lote_ofertas"] and r["n_validas"] >= 3) else "peso_no_b"] += 1
            if r["lote_ofertas"]:
                rescate[mod][anio]["peso_y_lote_por_ofertas"] += 1
            elif r["n_adj"] == 1:
                rescate[mod][anio]["peso_con_c"] += 1
            else:
                rescate[mod][anio]["peso_sin_c"] += 1
        if r["rescate_exacto"]:
            rescate[mod][anio]["exacto"] += 1
        if r["rescate_peso_ident"]:
            rescate[mod][anio]["peso_con_identidad"] += 1

        if r["lote_ofertas"]:
            d["excl_lote_por_ofertas"] += 1
            continue

        es_b = r["n_validas"] >= 3
        es_c = r["n_adj"] == 1
        if es_b:
            t["b"] += 1
            if r["todas_nit"]:
                t["d"] += 1
        if es_c:
            t["c"] += 1
        if es_b:
            d["con_b"] += 1
        if es_c:
            d["con_c"] += 1
        if es_b and es_c:
            # usable: b y c, valor adjudicado a no más del 1 % de la oferta del adjudicatario,
            # y no todas las válidas con el mismo valor.
            of = r["oferta_adj"]
            if va is not None and of is not None and abs(va - of) * 100 <= of and len(r["valores"]) > 1:
                t["usable"] += 1
    return tabla, diag, rescate, prep


def totales(tabla):
    tot = dict.fromkeys(COLUMNAS, 0)
    for m in tabla:
        for a in tabla[m]:
            for c in COLUMNAS:
                tot[c] += tabla[m][a][c]
    return tot


# ---------------------------------------------------------------------------------------------
# Programa principal
# ---------------------------------------------------------------------------------------------
def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    flags = [a for a in sys.argv[1:] if a.startswith("--")]
    if len(args) != 2:
        print("Uso: python3 -I recalcular.py <carpeta_datos> <salida.json> [--sin-sensibilidad]", file=sys.stderr)
        sys.exit(2)
    carpeta, salida = args
    con_sens = "--sin-sensibilidad" not in flags
    t0 = time.time()

    procesos, n_filas, sin_portafolio = cargar_procesos(carpeta.rstrip("/") + "/p6dx_obra.json")
    t_carga_p = time.time() - t0

    with open(carpeta.rstrip("/") + "/ofertas_cruzadas.json", encoding="utf-8") as f:
        pares = json.load(f)
    ofertas = {}
    pares_repetidos = 0
    n_grupos = 0
    for par in pares:
        pid, gs = par[0], par[1]
        if pid in ofertas:
            pares_repetidos += 1
            ofertas[pid] = ofertas[pid] + gs
        else:
            ofertas[pid] = gs
        n_grupos += len(gs)
    del pares
    t_carga = time.time() - t0

    # --- cálculo principal ---
    t1 = time.time()
    est_base = Counter()
    tabla, diag, rescate, prep = calcular(procesos, ofertas, OPC_BASE, est_base)
    t_calculo = time.time() - t1

    ids_ofertas_sin_proceso = sum(1 for k in ofertas if k not in procesos)

    # --- sensibilidad a las lecturas alternativas ---
    sens = {}
    t_sens = 0.0
    if con_sens:
        t2 = time.time()
        base_tot = totales(tabla)
        sens["totales_lectura_base"] = base_tot
        for nombre, cambio in VARIANTES.items():
            opc = dict(OPC_BASE)
            opc.update(cambio)
            tb, _dg, _rs, _pp = calcular(procesos, ofertas, opc)
            tt = totales(tb)
            sens[nombre] = {
                "cambio": cambio,
                "totales": tt,
                "diferencia_vs_base": {c: tt[c] - base_tot[c] for c in COLUMNAS},
            }
        t_sens = time.time() - t2

    # --- armado de la salida ---
    por_modalidad = {m: {a: tabla[m][a] for a in ANIOS + [OTRO]} for m in MODALIDADES}
    tot_mod = {m: totales({m: tabla[m]}) for m in MODALIDADES}

    resc = {}
    resc_tot = Counter()
    for m in MODALIDADES:
        resc[m] = {}
        for a in ANIOS + [OTRO]:
            c = rescate[m][a]
            resc[m][a] = dict(c)
            resc_tot.update(c)
    rescate_posible = {
        "definicion": (
            "Procesos analizados (adjudicados, sin exclusión previa, con ofertas) en los que alguna oferta NO "
            "confidencial con valor entre 0 y 50 % del precio base (0 < valor < 0.5*precio_base) es igual al valor "
            "adjudicado. 'peso' compara ambos redondeados al peso (mitad hacia arriba); 'exacto' compara los "
            "decimales completos; 'peso_con_identidad' exige además que la oferta baja tenga identidad (paso 3). "
            "Esas ofertas las descartaría mi paso 6; la lectura con rescate podría conservarlas."
        ),
        "total_procesos_peso": resc_tot["peso"],
        "total_procesos_exacto": resc_tot["exacto"],
        "total_procesos_peso_con_identidad": resc_tot["peso_con_identidad"],
        "de_los_peso__hoy_en_b": resc_tot["peso_en_b"],
        "de_los_peso__hoy_no_b": resc_tot["peso_no_b"],
        "de_los_peso__con_exactamente_una_oferta_del_adjudicatario_hoy": resc_tot["peso_con_c"],
        "de_los_peso__sin_c_hoy": resc_tot["peso_sin_c"],
        "de_los_peso__excluidos_por_lote_por_ofertas": resc_tot["peso_y_lote_por_ofertas"],
        "por_modalidad_y_anio": resc,
    }

    diagnostico = {
        "filas_leidas_p6dx": n_filas,
        "filas_sin_id_del_portafolio_ignoradas": sin_portafolio,
        "procesos_distintos": len(procesos),
        "procesos_elegida_con_adjudicado_No": diag["elegida_no_adjudicada"],
        "procesos_adjudicados_en_modalidad_fuera": diag["fuera_de_modalidad_adjudicados"],
        "ofertas_cruzadas_ids": len(ofertas),
        "ofertas_cruzadas_ids_repetidos": pares_repetidos,
        "ofertas_cruzadas_grupos": n_grupos,
        "ofertas_cruzadas_ids_sin_proceso_en_p6dx": ids_ofertas_sin_proceso,
        "recuento_de_grupos_y_casos_(lectura_base)": dict(est_base),
        "totales_por_modalidad": tot_mod,
        "totales_generales": totales(tabla),
        "exclusiones_y_conteos_por_modalidad": {m: dict(diag[m]) for m in MODALIDADES},
        "procesos_cuya_fila_elegida_tiene_precio_base_distinto_del_unico_positivo": sum(
            1 for p in prep.values()
            if p["adjudicado"] and p["mod"] != "fuera" and len(p["bases"]) == 1
            and (p["pb_fila"] is None or p["pb_fila"] != next(iter(p["bases"])))
        ),
    }

    notas = [
        "Rescate NO implementado (según indicación): mis ofertas válidas pueden diferir de las de la base por esa causa; ver 'rescate_posible'.",
        "Se usa Decimal exacto para todas las comparaciones de montos (sin redondeo de coma flotante). Un valor que no casa con ^-?\\d+(\\.\\d+)?$ (p. ej. ausente o con notación científica) es 'sin dato' y nunca 0.",
        "§1 empate: si dos filas tienen la misma clave de ordenamiento completa gana la ÚLTIMA en el orden del archivo (ordenamiento estable ascendente, se toma el último). Variante 'empate_gana_la_primera_fila' medida en 'sensibilidad'.",
        "§1 adjudicado: la comparación es exacta con el texto 'Si' (los datos solo traen 'Si' y 'No'). 'Fecha como texto' se usa tal cual viene (sin recortar espacios); campo ausente = ''.",
        "§1 último entero del id_del_proceso: dígitos al final de la cadena sin espacios posteriores; si no hay, -1.",
        "§2 solo se reportan las tres modalidades; un proceso adjudicado cuya fila elegida es 'fuera' no se cuenta en ninguna tabla (se cuenta en diagnostico.procesos_adjudicados_en_modalidad_fuera).",
        "§4 año: se toman los 4 primeros caracteres de fecha_adjudicacion de la fila elegida; si no está en 2020-2026 (o falta) va a 'otro_o_sin_fecha'. Un proceso cuenta en la tabla solo si la fila elegida tiene adjudicado == 'Si'.",
        "§5 precio base del proceso: las exclusiones leen TODAS las filas del proceso (conjunto de precio_base numéricos > 0): vacío -> 'sin precio base'; 2 o más valores numéricamente distintos -> 'lote'; si hay uno solo, ese es el precio base que se usa para filtrar ofertas (aunque la fila elegida no lo traiga). Variante 'precio_base_solo_fila_elegida' medida.",
        "§5 columna a: usa valor_total_adjudicacion y precio_base de la FILA ELEGIDA (independiente de las exclusiones). Variante con el precio base único del proceso medida ('a_con_precio_base_del_proceso').",
        "§5 numero_de_lotes de la fila elegida: solo excluye si es un número > 1; un valor no numérico (sin dato) no excluye.",
        "§5 ofertas (paso 1): 'confidencial' se busca como subcadena del nombre comparable. Un grupo sin 'valor_de_la_oferta' (ausente) es sin dato y se descarta en el paso 2.",
        "§5 paso 3, conflicto de NIT: se evalúa sobre los grupos que pasan los pasos 1 y 2, contando solo nombres comparables que identifican (no vacío/no definido/sin descripcion/confidencial). Variantes 'conflicto_nit_sobre_todos_los_grupos' y 'conflicto_nit_cuenta_cualquier_nombre' medidas.",
        "§5 paso 3, quitar 'espacios, puntos y guiones' del NIT: se quitan todos los espacios en blanco (\\s), '.' y '-'. 'Dígitos' = solo 0-9.",
        "§5 paso 3, 's a s'->'sas' y 's a'->'sa': se aplican a palabras sueltas (limitadas por espacio o extremo) tras quitar la puntuación y compactar espacios; primero 's a s' y luego 's a'. Variante como subcadena medida ('sas_como_subcadena').",
        "§5 paso 3, 'no hay NIT ni nombre': significa sin NIT válido y no en conflicto, y sin nombre que identifique. El código c_digo_proveedor se recorta; identifica si no es vacío ni todo '0'. Dos grupos identificados solo por código y con el mismo código se consideran el MISMO oferente (variante 'codigo_nunca_une_grupos' medida).",
        "§5 paso 3, unión transitiva: se calcula sobre los grupos que superan los pasos 1-3 (incluso si luego caen por 5 o 6). Variante 'union_solo_sobre_ofertas_finales' medida (filtra por 5 y 6 antes de unir).",
        "§5 pasos 4-6: se aplican en ese orden sobre cada grupo identificado; el mismo (oferente, valor) se compara numéricamente (100 == 100.00). 'valor < 50 %' es estricto (valor*2 < precio_base); 'valor > precio_base' es estricto.",
        "§5 lote por ofertas: si algún oferente conserva 2 o más valores distintos válidos, el proceso queda fuera de b, c, d y usable (no de adjudicados ni de a).",
        "§5 c: no exige b. El adjudicatario es una identidad (NIT válido de nit_del_proveedor_adjudicado, no en conflicto en el proceso, y nombre comparable de nombre_del_proveedor que identifique); NO se usa su código (variante 'adjudicatario_tambien_por_codigo' medida). Cuenta las ofertas válidas cuyo oferente (componente de la unión) comparte alguna clave con esa identidad; c = exactamente una.",
        "§5 d: dentro de b, cada oferta válida debe tener un NIT (clave 'n') en la identidad de su oferente, es decir, en alguno de los grupos unidos a ese oferente. Variante con el NIT del grupo conservado medida ('d_con_nit_del_grupo_conservado').",
        "§5 usable: b y c, valor adjudicado numérico, |valor adjudicado - oferta del adjudicatario| * 100 <= oferta del adjudicatario (la base del 1 % es la oferta del adjudicatario), y más de un valor distinto entre las válidas.",
        "Rescate_posible: cuenta procesos con una oferta no confidencial con 0 < valor < 50 % del precio base igual al valor adjudicado 'al peso' (ambos redondeados al peso, mitad hacia arriba); también se da el conteo exacto y el conteo exigiendo identidad.",
    ]

    resultado = {
        "por_modalidad": por_modalidad,
        "rescate_posible": rescate_posible,
        "notas": notas,
        "diagnostico": diagnostico,
        "sensibilidad": sens,
        "tiempos_s": {
            "carga_p6dx": round(t_carga_p, 1),
            "carga_total": round(t_carga, 1),
            "calculo_principal": round(t_calculo, 1),
            "sensibilidad": round(t_sens, 1),
            "total": round(time.time() - t0, 1),
        },
    }
    with open(salida, "w", encoding="utf-8") as f:
        json.dump(resultado, f, ensure_ascii=False, indent=1)

    # Resumen legible por la salida estándar
    print("modalidad       anio              adjudic.      a      b      c      d  usable")
    for m in MODALIDADES:
        for a in ANIOS + [OTRO]:
            r = por_modalidad[m][a]
            print("%-15s %-16s %9d %6d %6d %6d %6d %6d" % (
                m, a, r["adjudicados"], r["a"], r["b"], r["c"], r["d"], r["usable"]))
    print("tiempos:", resultado["tiempos_s"])


if __name__ == "__main__":
    main()
