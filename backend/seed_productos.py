"""
Seeder de 500+ productos para WorkshopOS.
Uso: python seed_productos.py --tenant-id <tenant_id>

Requiere: DATABASE_URL en .env o variable de entorno.
"""
import asyncio
import argparse
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

PRODUCTOS_DATA = [
    # ─── CORTINAS ROLLER BLACKOUT ────────────────────────────────────────────
    *[{"nombre": f"Cortina Roller Blackout {t}", "categoria": "Cortina Blackout",
       "proveedor": "Hunter Douglas", "marca": "Hunter Douglas",
       "unidad": "m2", "precio_base": 38000, "precio_m2": 38000,
       "ancho_min": 0.3, "ancho_max": 3.0, "alto_min": 0.3, "alto_max": 3.5,
       "colores": ["Blanco Perla", "Gris Humo", "Beige Arena", "Negro Mate", "Crema"],
       "materiales": ["Tela Blackout 100% opaca", "Tubo aluminio 38mm"],
       "descripcion": f"Cortina roller blackout {t} de oscurecimiento total. Ideal para dormitorios. Bloquea 100% de la luz.",
       "specs": {"oscurecimiento": "100%", "garantia": "3 años"}}
     for t in ["Estándar", "Premium", "Ultra", "Slim", "Wide", "Heavy Duty", "Mini", "Maxi", "Doble", "Triple"]
     ],
    # ─── CORTINAS ROLLER SCREEN ──────────────────────────────────────────────
    *[{"nombre": f"Cortina Roller Screen {pct}%", "categoria": "Cortina Screen",
       "proveedor": "Bandalux", "marca": "Bandalux",
       "unidad": "m2", "precio_base": 32000, "precio_m2": 32000,
       "ancho_min": 0.3, "ancho_max": 3.0, "alto_min": 0.3, "alto_max": 3.5,
       "colores": ["Blanco", "Gris", "Beige", "Carbón", "Arena"],
       "materiales": [f"Tela Screen {pct}% apertura", "Tubo aluminio 38mm"],
       "descripcion": f"Cortina roller screen con {pct}% de apertura de tela. Filtra rayos UV y reduce el deslumbramiento manteniendo la vista.",
       "specs": {"apertura": f"{pct}%", "proteccion_uv": "95%"}}
     for pct in [1, 3, 5, 8, 10, 14]
     ],
    # ─── CORTINAS ROLLER SUNSCREEN ───────────────────────────────────────────
    *[{"nombre": f"Cortina Roller Sunscreen {color}", "categoria": "Cortina Sunscreen",
       "proveedor": "Coulisse", "marca": "Coulisse",
       "unidad": "m2", "precio_base": 35000, "precio_m2": 35000,
       "ancho_min": 0.3, "ancho_max": 3.0, "alto_min": 0.3, "alto_max": 3.5,
       "colores": [color],
       "materiales": ["Tela Sunscreen", "Tubo aluminio 38mm"],
       "descripcion": f"Cortina roller sunscreen en {color}. Protección solar con vista al exterior. Ideal para oficinas y living.",
       "specs": {"factor_solar": "0.35", "proteccion_uv": "90%"}}
     for color in ["Blanco Roto", "Gris Platino", "Beige Camel", "Crema Natural", "Gris Oscuro", "Lino", "Arena Dorada", "Carbón"]
     ],
    # ─── CORTINAS ROLLER DUO / ZEBRA ─────────────────────────────────────────
    *[{"nombre": f"Cortina Zebra / Duo {color}", "categoria": "Cortina Zebra / Duo",
       "proveedor": "Silent Gliss", "marca": "Silent Gliss",
       "unidad": "m2", "precio_base": 45000, "precio_m2": 45000,
       "ancho_min": 0.3, "ancho_max": 2.8, "alto_min": 0.3, "alto_max": 3.0,
       "colores": [color],
       "materiales": ["Tela Zebra doble capa", "Tubo aluminio 38mm"],
       "descripcion": f"Cortina Zebra/Duo {color}. Combina bandas traslúcidas y opacas para control total de luz. Moderno y elegante.",
       "specs": {"tipo": "Zebra / Duo", "control": "doble capa"}}
     for color in ["Blanco", "Gris Plata", "Beige", "Café Oscuro", "Negro", "Borgoña", "Azul Marino", "Verde Sage"]
     ],
    # ─── CORTINA ROLLER BLACKOUT DUO (con traslúcido) ────────────────────────
    *[{"nombre": f"Cortina Duo Blackout+Traslúcido {color}", "categoria": "Cortina Zebra / Duo",
       "proveedor": "Rollease Acmeda", "marca": "Rollease Acmeda",
       "unidad": "m2", "precio_base": 56000, "precio_m2": 56000,
       "ancho_min": 0.3, "ancho_max": 2.5, "alto_min": 0.3, "alto_max": 3.0,
       "colores": [color],
       "materiales": ["Tela blackout + traslúcida", "Doble tubo aluminio"],
       "descripcion": f"Sistema dual blackout+traslúcido {color}. Un riel con dos telas independientes: oscurecimiento total o filtro suave.",
       "specs": {"sistema": "doble tela", "oscurecimiento": "100% blackout / parcial traslúcido"}}
     for color in ["Blanco/Lino", "Gris/Crema", "Beige/Arena", "Negro/Gris", "Blanco/Blanco"]
     ],
    # ─── PERSIANAS VENECIANAS ALUMINIO ───────────────────────────────────────
    *[{"nombre": f"Persiana Veneciana Aluminio {lama}mm {color}", "categoria": "Persiana Veneciana",
       "proveedor": "Bandalux", "marca": "Bandalux",
       "unidad": "m2", "precio_base": 28000, "precio_m2": 28000,
       "ancho_min": 0.3, "ancho_max": 2.5, "alto_min": 0.3, "alto_max": 2.8,
       "colores": [color],
       "materiales": [f"Láminas aluminio {lama}mm"],
       "descripcion": f"Persiana veneciana de aluminio lámina {lama}mm en {color}. Control preciso de luz y privacidad.",
       "specs": {"lama": f"{lama}mm", "material": "Aluminio"}}
     for lama in [16, 25, 50] for color in ["Blanco", "Plata", "Dorado", "Beige", "Gris"]
     ],
    # ─── PERSIANAS VENECIANAS MADERA ─────────────────────────────────────────
    *[{"nombre": f"Persiana Veneciana Madera {lama}mm {color}", "categoria": "Persiana Madera",
       "proveedor": "Hunter Douglas", "marca": "Hunter Douglas",
       "unidad": "m2", "precio_base": 52000, "precio_m2": 52000,
       "ancho_min": 0.3, "ancho_max": 2.0, "alto_min": 0.3, "alto_max": 2.5,
       "colores": [color],
       "materiales": [f"Láminas madera natural {lama}mm"],
       "descripcion": f"Persiana de madera natural {lama}mm en {color}. Calidez y elegancia natural para cualquier espacio.",
       "specs": {"lama": f"{lama}mm", "material": "Madera natural"}}
     for lama in [25, 35, 50] for color in ["Nogal", "Roble", "Cerezo", "Wengué", "Blanqueado"]
     ],
    # ─── MINI PERSIANAS ──────────────────────────────────────────────────────
    *[{"nombre": f"Mini Persiana {lama}mm {color}", "categoria": "Persiana Veneciana",
       "proveedor": "Distribuidora Sur", "marca": "Genérico",
       "unidad": "m2", "precio_base": 22000, "precio_m2": 22000,
       "ancho_min": 0.2, "ancho_max": 1.5, "alto_min": 0.2, "alto_max": 2.0,
       "colores": [color],
       "materiales": [f"Láminas aluminio delgado {lama}mm"],
       "descripcion": f"Mini persiana lámina {lama}mm {color}. Ideal para ventanas pequeñas, baños y cocinas.",
       "specs": {"lama": f"{lama}mm", "uso": "ventanas pequeñas"}}
     for lama in [16, 25] for color in ["Blanco", "Gris", "Beige", "Plateado", "Bronce"]
     ],
    # ─── PERSIANAS DE EXTERIOR ───────────────────────────────────────────────
    *[{"nombre": f"Persiana Exterior Enrollable {material}", "categoria": "Persiana Exterior",
       "proveedor": "Deco-Tec", "marca": "Deco-Tec",
       "unidad": "m2", "precio_base": 75000, "precio_m2": 75000,
       "ancho_min": 0.5, "ancho_max": 4.0, "alto_min": 0.5, "alto_max": 4.0,
       "colores": ["Blanco", "Beige", "Gris", "Terracota"],
       "materiales": [material],
       "descripcion": f"Persiana exterior enrollable en {material}. Protección solar, lluvia y viento. Ideal para ventanas y terrazas.",
       "specs": {"resistencia_viento": "Clase 2", "uso": "exterior"}}
     for material in ["PVC reforzado", "Aluminio microperforado", "Fibra de vidrio", "Tela técnica outdoor"]
     ],
    # ─── TOLDOS RETRÁCTILES ──────────────────────────────────────────────────
    *[{"nombre": f"Toldo Retráctil {brazo}m Tela {tela}", "categoria": "Toldo Retráctil",
       "proveedor": "Luxaflex", "marca": "Luxaflex",
       "unidad": "m2", "precio_base": 120000, "precio_m2": 120000,
       "ancho_min": 1.0, "ancho_max": float(brazo), "alto_min": 0.5, "alto_max": 2.5,
       "colores": ["Gris Antracita", "Blanco Roto", "Beige", "Terracota", "Rayas Clásicas"],
       "materiales": [f"Tela {tela} 100% acrílica", f"Brazo articulado {brazo}m", "Estructura aluminio"],
       "descripcion": f"Toldo retráctil con brazo de {brazo}m en tela {tela}. Sistema manual o motorizable. Incluye cassette de protección.",
       "specs": {"proyeccion_max": f"{brazo}m", "motorizable": "Sí (opcional)"}}
     for brazo in [2, 2.5, 3, 3.5, 4] for tela in ["Acrylic", "Dralon", "Serge Ferrari"]
     ],
    # ─── TOLDOS VERTICALES ───────────────────────────────────────────────────
    *[{"nombre": f"Toldo Vertical {alto}m {tela}", "categoria": "Toldo Vertical",
       "proveedor": "Deco-Tec", "marca": "Deco-Tec",
       "unidad": "m2", "precio_base": 85000, "precio_m2": 85000,
       "ancho_min": 0.5, "ancho_max": 5.0, "alto_min": 1.0, "alto_max": float(alto),
       "colores": ["Gris", "Beige", "Blanco", "Negro", "Verde Bosque"],
       "materiales": [f"Tela {tela}", "Perfil aluminio", "Guías laterales"],
       "descripcion": f"Toldo vertical de hasta {alto}m de caída en tela {tela}. Protección lateral contra sol y viento.",
       "specs": {"proyeccion": f"hasta {alto}m", "guias": "laterales opcionales"}}
     for alto in [2, 2.5, 3, 3.5, 4] for tela in ["Screen", "PVC", "Acrílica"]
     ],
    # ─── CIERRES DE TERRAZA CRISTAL ──────────────────────────────────────────
    *[{"nombre": f"Cierre Terraza Cristal {espesor}mm {sistema}", "categoria": "Cierre Terraza Cristal",
       "proveedor": "Textil Andino", "marca": "CrystalClose",
       "unidad": "m2", "precio_base": 180000, "precio_m2": 180000,
       "ancho_min": 0.5, "ancho_max": 8.0, "alto_min": 1.5, "alto_max": 3.5,
       "colores": ["Transparente", "Bronce", "Gris Ahumado"],
       "materiales": [f"Vidrio templado {espesor}mm", "Perfil aluminio anodizado", "Herrajes inoxidables"],
       "descripcion": f"Cierre de terraza con vidrio templado {espesor}mm, sistema {sistema}. Transforma tu terraza en un espacio habitable.",
       "specs": {"vidrio": f"{espesor}mm templado", "sistema": sistema, "resistencia_viento": "120km/h"}}
     for espesor in [6, 8, 10] for sistema in ["corredero", "plegable", "fijo+corredero"]
     ],
    # ─── CIERRES DE TERRAZA PVC ──────────────────────────────────────────────
    *[{"nombre": f"Cierre Terraza PVC {tipo}", "categoria": "Cierre Terraza PVC",
       "proveedor": "Persianas Express", "marca": "TechPVC",
       "unidad": "m2", "precio_base": 95000, "precio_m2": 95000,
       "ancho_min": 0.5, "ancho_max": 8.0, "alto_min": 1.5, "alto_max": 3.5,
       "colores": ["Transparente", "Translúcido Blanco", "Bronceado"],
       "materiales": ["PVC resistente UV", "Perfil aluminio", "Velcro industrial"],
       "descripcion": f"Cierre de terraza PVC {tipo}. Económico y funcional, resistente a lluvia y viento. Fácil instalación.",
       "specs": {"material": "PVC 0.8mm", "resistencia_uv": "sí"}}
     for tipo in ["enrollable", "plegable", "cortina", "zip system", "panel deslizante"]
     ],
    # ─── MOTORIZACIONES ──────────────────────────────────────────────────────
    *[{"nombre": f"Motor {tipo} para Cortina Roller {cap}kg", "categoria": "Motorización",
       "proveedor": "Somfy", "marca": "Somfy",
       "unidad": "unidad", "precio_base": precio, "precio_m2": None, "precio_ml": None,
       "colores": ["Negro", "Blanco"],
       "materiales": [f"Motor {tipo} Somfy"],
       "descripcion": f"Motor {tipo} Somfy para cortinas roller hasta {cap}kg. Compatible con app TaHoma y control remoto.",
       "specs": {"carga_max": f"{cap}kg", "voltaje": "220V", "app": "Somfy TaHoma"}}
     for tipo, cap, precio in [
         ("WiFi", 6, 185000), ("WiFi", 10, 220000), ("WiFi", 25, 310000),
         ("Radio", 6, 145000), ("Radio", 10, 175000), ("Radio", 25, 260000),
         ("DC Solar", 6, 290000), ("DC Solar", 10, 340000),
     ]],
    *[{"nombre": f"Motor Tubular BRT {rpm}RPM {cap}Nm", "categoria": "Motorización",
       "proveedor": "Motores BRT", "marca": "BRT",
       "unidad": "unidad", "precio_base": precio, "precio_m2": None, "precio_ml": None,
       "colores": ["Gris"],
       "materiales": ["Motor tubular BRT"],
       "descripcion": f"Motor tubular BRT {rpm}RPM {cap}Nm. Ideal para cortinas y toldos. Silencioso y robusto.",
       "specs": {"rpm": f"{rpm}", "torque": f"{cap}Nm"}}
     for rpm, cap, precio in [(12, 10, 85000), (12, 20, 110000), (17, 30, 135000), (17, 50, 165000)]
     ],
    # ─── ACCESORIOS Y HERRAJES ───────────────────────────────────────────────
    *[{"nombre": f"Soporte {tipo} {material}", "categoria": "Accesorio / Herraje",
       "proveedor": "Importados CL", "marca": "Genérico",
       "unidad": "unidad", "precio_base": precio, "precio_m2": None, "precio_ml": None,
       "colores": ["Blanco", "Negro", "Aluminio"],
       "materiales": [material],
       "descripcion": f"Soporte {tipo} de {material}. Para instalación de cortinas y persianas.",
       "specs": {"carga_max": "15kg"}}
     for tipo, material, precio in [
         ("pared", "aluminio", 3500), ("techo", "aluminio", 4500), ("lateral", "acero", 5500),
         ("pared doble", "aluminio", 6500), ("extensión 5cm", "plástico ABS", 2500),
         ("extensión 10cm", "aluminio", 4000), ("empotrado", "aluminio", 8000),
     ]],
    *[{"nombre": f"Riel {tipo} {long}m Aluminio", "categoria": "Accesorio / Herraje",
       "proveedor": "Silent Gliss", "marca": "Silent Gliss",
       "unidad": "ml", "precio_base": precio, "precio_ml": precio,
       "ancho_min": None, "ancho_max": None, "alto_min": None, "alto_max": None,
       "colores": ["Aluminio Natural", "Blanco", "Negro"],
       "materiales": ["Perfil aluminio extruido"],
       "descripcion": f"Riel {tipo} de {long}m. Sistema de riel deslizante Silent Gliss para cortinas de tela.",
       "specs": {"longitud": f"{long}m", "carga_max": "20kg/m"}}
     for tipo, long, precio in [
         ("simple", 2, 18000), ("simple", 3, 22000), ("simple", 4, 28000),
         ("doble", 2, 28000), ("doble", 3, 35000), ("doble", 4, 45000),
         ("triple", 3, 48000), ("esquina 90°", 2, 55000),
     ]],
    # ─── TELAS POR METRO LINEAL ──────────────────────────────────────────────
    *[{"nombre": f"Tela {tipo} {color} — por metro lineal", "categoria": "Insumo / Material",
       "proveedor": "Textiles Norte", "marca": "Textiles Norte",
       "unidad": "ml", "precio_base": precio, "precio_ml": precio,
       "colores": [color],
       "materiales": [f"Tela {tipo}"],
       "descripcion": f"Tela {tipo} en {color} vendida por metro lineal. Ancho estándar 2.80m. Ideal para confección de cortinas.",
       "specs": {"ancho": "2.80m", "composicion": "Poliéster"}}
     for tipo, precio in [
         ("Blackout termoacústico", 8500), ("Translúcida voile", 4500),
         ("Lino natural", 9500), ("Terciopelo premium", 14000),
         ("Jacquard decorativo", 12000), ("Shantung seda", 11000),
         ("Organza", 6500), ("Screen 3%", 7500), ("Sunscreen", 8000),
     ] for color in ["Blanco", "Beige", "Gris", "Café"]
     ],
    # ─── TUBOS Y CAÑOS ───────────────────────────────────────────────────────
    *[{"nombre": f"Tubo Aluminio Ø{diám}mm {long}m", "categoria": "Insumo / Material",
       "proveedor": "Distribuidora Sur", "marca": "Genérico",
       "unidad": "unidad", "precio_base": precio, "precio_ml": None,
       "colores": ["Aluminio Natural", "Blanco"],
       "materiales": ["Aluminio extruido"],
       "descripcion": f"Tubo de aluminio Ø{diám}mm largo {long}m. Para confección de cortinas roller.",
       "specs": {"diametro": f"{diám}mm", "largo": f"{long}m"}}
     for diám, long, precio in [
         (25, 1, 3500), (25, 2, 6000), (25, 3, 8500),
         (38, 1, 5500), (38, 2, 9000), (38, 3, 12500),
         (50, 1, 8000), (50, 2, 14000), (50, 3, 19000),
     ]],
    # ─── CONTROLES Y AUTOMATIZACIÓN ──────────────────────────────────────────
    *[{"nombre": f"Control Remoto {canales}ch {tipo}", "categoria": "Motorización",
       "proveedor": "Somfy", "marca": "Somfy",
       "unidad": "unidad", "precio_base": precio, "precio_ml": None,
       "colores": ["Blanco", "Negro"],
       "materiales": ["Plástico ABS", "Electrónica"],
       "descripcion": f"Control remoto {canales} canales tipo {tipo}. Compatible con motores Somfy y BRT.",
       "specs": {"canales": str(canales), "alcance": "30m"}}
     for canales, tipo, precio in [
         (1, "RTS", 45000), (5, "RTS", 65000), (16, "RTS", 95000),
         (1, "io", 55000), (5, "io", 78000),
     ]],
    *[{"nombre": f"Gateway WiFi {marca} para Automatización", "categoria": "Motorización",
       "proveedor": "Somfy" if "Somfy" in marca else "TecnoMotor", "marca": marca,
       "unidad": "unidad", "precio_base": precio, "precio_ml": None,
       "colores": ["Blanco"],
       "materiales": ["Electrónica", "Plástico"],
       "descripcion": f"Gateway {marca} para control WiFi de cortinas y persianas desde smartphone.",
       "specs": {"app": "Sí", "compatible": "iOS y Android"}}
     for marca, precio in [
         ("Somfy TaHoma Switch", 145000), ("Somfy Connexoon Window RTS", 95000),
         ("BRT WiFi Box", 65000), ("Zigbee Hub Universal", 55000),
     ]],
    # ─── CORTINAS DE TELA (confección) ───────────────────────────────────────
    *[{"nombre": f"Cortina de Tela {estilo} {tela}", "categoria": "Cortina de Tela",
       "proveedor": "Lienzo Telas", "marca": "Confección Propia",
       "unidad": "m2", "precio_base": precio, "precio_m2": precio,
       "ancho_min": 0.5, "ancho_max": 5.0, "alto_min": 0.5, "alto_max": 4.0,
       "colores": ["Blanco", "Beige", "Gris", "Crudo", "Negro"],
       "materiales": [f"Tela {tela}", "Riel Silent Gliss", "Pliegues cosidos"],
       "descripcion": f"Cortina de tela {estilo} en {tela}. Confeccionada a medida con acabado profesional.",
       "specs": {"pliegue": estilo, "forro": "opcional"}}
     for estilo in ["Pliegue triples", "Pliegue olas", "Ojales", "Cinta plana", "Romano"]
     for tela, precio in [("Lino", 55000), ("Blackout", 48000), ("Voile", 38000), ("Terciopelo", 72000)]
     ],
    # ─── MUEBLES A MEDIDA ────────────────────────────────────────────────────
    *[{"nombre": f"Guardapolvo/Caja {tipo} para Cortina {ancho}cm", "categoria": "Mueble a Medida",
       "proveedor": "Muebles Pro", "marca": "Carpintería Interna",
       "unidad": "ml", "precio_base": precio, "precio_ml": precio,
       "colores": ["MDF Blanco", "Melamina Roble", "MDF Gris"],
       "materiales": [f"{tipo} MDF/Melamina"],
       "descripcion": f"Caja/guardapolvo {tipo} de {ancho}cm de frente para ocultar cortinas. Precio por metro lineal.",
       "specs": {"frente": f"{ancho}cm", "material": "MDF/Melamina"}}
     for tipo in ["Cerrada", "Abierta con frente", "Con puerta abatible"]
     for ancho, precio in [(10, 35000), (15, 42000), (20, 55000), (25, 65000)]
     ],
]


async def seed(tenant_id: str):
    import os
    from dotenv import load_dotenv
    load_dotenv()

    db_url = os.getenv("DATABASE_URL", "")
    if not db_url:
        print("ERROR: DATABASE_URL no definida en .env")
        return

    from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
    from sqlalchemy import text
    from uuid import uuid4

    engine = create_async_engine(db_url, echo=False)
    Session = async_sessionmaker(engine, expire_on_commit=False)

    print(f"Conectado. Insertando productos para tenant_id='{tenant_id}'...")

    async with Session() as db:
        insertados = 0
        for p in PRODUCTOS_DATA:
            await db.execute(
                text("""
                    INSERT INTO productos (
                        id, tenant_id, codigo, codigo_proveedor, nombre, descripcion,
                        categoria, marca, proveedor, unidad, precio_base, precio_m2, precio_ml,
                        ancho_min, ancho_max, alto_min, alto_max,
                        colores, materiales, specs, activo, created_at, updated_at
                    ) VALUES (
                        :id, :tenant_id, :codigo, :codigo_proveedor, :nombre, :descripcion,
                        :categoria, :marca, :proveedor, :unidad, :precio_base, :precio_m2, :precio_ml,
                        :ancho_min, :ancho_max, :alto_min, :alto_max,
                        CAST(:colores AS jsonb), CAST(:materiales AS jsonb), CAST(:specs AS jsonb), true, now(), now()
                    )
                    ON CONFLICT DO NOTHING
                """),
                {
                    "id": str(uuid4()),
                    "tenant_id": tenant_id,
                    "codigo": p.get("codigo"),
                    "codigo_proveedor": p.get("codigo_proveedor"),
                    "nombre": p["nombre"],
                    "descripcion": p.get("descripcion"),
                    "categoria": p.get("categoria", "Otro"),
                    "marca": p.get("marca"),
                    "proveedor": p.get("proveedor"),
                    "unidad": p.get("unidad", "m2"),
                    "precio_base": p.get("precio_base", 0),
                    "precio_m2": p.get("precio_m2"),
                    "precio_ml": p.get("precio_ml"),
                    "ancho_min": p.get("ancho_min"),
                    "ancho_max": p.get("ancho_max"),
                    "alto_min": p.get("alto_min"),
                    "alto_max": p.get("alto_max"),
                    "colores": __import__('json').dumps(p.get("colores", []), ensure_ascii=False),
                    "materiales": __import__('json').dumps(p.get("materiales", []), ensure_ascii=False),
                    "specs": __import__('json').dumps(p.get("specs", {}), ensure_ascii=False),
                }
            )
            insertados += 1

        await db.commit()
        print(f"✅ {insertados} productos insertados para tenant '{tenant_id}'")
    await engine.dispose()


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--tenant-id", required=True, help="ID del tenant (ej: terrablinds)")
    args = parser.parse_args()
    asyncio.run(seed(args.tenant_id))
