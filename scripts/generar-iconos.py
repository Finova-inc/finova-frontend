# -*- coding: utf-8 -*-
"""Genera los iconos de Finova a partir de la marca en public/logo-finova.png.

---------------------------------------------------------------------------
DOS DECISIONES QUE NO SON OBVIAS
---------------------------------------------------------------------------

1. LA MARCA VA SOBRE UNA BALDOSA OSCURA, NO SOBRE TRANSPARENCIA.

   A 16 px, tres barras finas sobre el fondo de la pestana del navegador
   desaparecen, y ademas cambian de legibilidad segun si la persona usa el
   navegador en tema claro u oscuro. La baldosa da contraste constante.

2. LA MARCA SE RECOLOREA CON EL NARANJO DE MARCA.

   El logotipo original lleva un degradado de naranjo a plateado. Medido sobre
   el archivo real, la luminancia media de cada barra es 138, 85 y 65 sobre
   255: la tercera barra es gris oscuro y, contra una baldosa de luminancia 13,
   simplemente no se ve. A tamano hero eso es un detalle bonito; a 16 px
   convierte el icono en una mancha.

   Se conserva la SILUETA —que es lo que la gente reconoce— y se rellena con el
   degradado de los dos colores de destacador de la paleta (--color-marker y
   --color-highlight). Es practica habitual tener una version del logotipo
   especifica para iconos; no es tomarse una libertad con la marca.

Todas las salidas son REDUCCIONES de la fuente de 164 px de alto. No se amplia
nada: una marca ampliada se ve blanda, que es justo lo que se queria evitar.

USO
    python scripts/generar-iconos.py

    Requiere Pillow (pip install Pillow). Solo hay que volver a correrlo si
    cambia el logotipo de origen o los colores de marca: los archivos que
    genera estan versionados, no se construyen en cada despliegue.
"""

import os
from PIL import Image, ImageDraw

# La raiz del proyecto se deduce de la ubicacion del script, nunca se escribe
# fija: asi funciona en la maquina de cualquiera del equipo, y en CI.
RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FUENTE = os.path.join(RAIZ, "public", "logo-finova.png")

# Baldosa: degradado vertical sutil, como la vinieta apenas perceptible del
# logotipo original. Un color plano se ve pobre al lado de una marca que si
# tiene degradado.
TILE_TOP = (34, 29, 25)
TILE_BOTTOM = (20, 17, 15)

# Los dos colores de destacador de la paleta.
MARCA_A = (255, 106, 26)   # --color-marker
MARCA_B = (255, 197, 61)   # --color-highlight

# Supermuestreo: se dibuja 4x y se reduce al final, para que las esquinas
# redondeadas y las diagonales de la marca tengan antialias real.
SS = 4


def cargar_marca():
    """Marca recortada a su caja de contenido real."""
    marca = Image.open(FUENTE).convert("RGBA")
    return marca.crop(marca.getbbox())


def recolorear(marca):
    """Rellena la silueta con el degradado diagonal de marca.

    Se usa unicamente el canal alfa del original: la forma se respeta pixel a
    pixel, incluido el antialias de los bordes diagonales, y solo cambia el
    color. Asi el icono no queda con los bordes dentados que dejaria recortar
    la silueta a mano.
    """
    ancho, alto = marca.size
    alfa = marca.getchannel("A")

    degradado = Image.new("RGB", (ancho, alto))
    px = degradado.load()
    for y in range(alto):
        for x in range(ancho):
            # Diagonal: la marca esta inclinada, asi que un degradado que
            # recorre x+y sigue su eje en vez de cruzarlo.
            t = (x / max(1, ancho - 1) + y / max(1, alto - 1)) / 2
            px[x, y] = tuple(
                round(MARCA_A[i] + (MARCA_B[i] - MARCA_A[i]) * t) for i in range(3)
            )

    resultado = degradado.convert("RGBA")
    resultado.putalpha(alfa)
    return resultado


def baldosa(lado, radio_pct):
    """Baldosa cuadrada con degradado vertical y esquinas redondeadas."""
    grande = lado * SS

    columna = Image.new("RGB", (1, grande))
    for y in range(grande):
        t = y / max(1, grande - 1)
        columna.putpixel(
            (0, y),
            tuple(
                round(TILE_TOP[i] + (TILE_BOTTOM[i] - TILE_TOP[i]) * t)
                for i in range(3)
            ),
        )

    lienzo = Image.new("RGBA", (grande, grande), (0, 0, 0, 0))
    lienzo.paste(columna.resize((grande, grande)), (0, 0))

    if radio_pct > 0:
        mascara = Image.new("L", (grande, grande), 0)
        ImageDraw.Draw(mascara).rounded_rectangle(
            [0, 0, grande - 1, grande - 1],
            radius=round(grande * radio_pct),
            fill=255,
        )
        lienzo.putalpha(mascara)

    return lienzo


def componer(lado, alto_marca_pct, radio_pct, marca_base):
    """Baldosa + marca centrada, ocupando alto_marca_pct del lado."""
    grande = lado * SS
    lienzo = baldosa(lado, radio_pct)

    alto = round(grande * alto_marca_pct)
    ancho = round(marca_base.width * alto / marca_base.height)
    marca = marca_base.resize((ancho, alto), Image.LANCZOS)

    lienzo.alpha_composite(marca, ((grande - ancho) // 2, (grande - alto) // 2))
    return lienzo.resize((lado, lado), Image.LANCZOS)


def proporcion(lado):
    """Cuanto del lado ocupa la marca.

    A tamanos chicos ocupa mas: con el mismo margen relativo que a 256 px, a
    16 px las barras quedan a un pixel de ancho y se funden entre si.
    """
    if lado <= 16:
        return 0.78
    if lado <= 32:
        return 0.72
    if lado <= 48:
        return 0.68
    return 0.60


def main():
    original = cargar_marca()
    print("marca recortada:", original.size)
    marca = recolorear(original)

    # icon.png — el que usan los navegadores modernos y las vistas previas al
    # compartir el enlace.
    componer(256, proporcion(256), 0.22, marca).save(
        os.path.join(RAIZ, "app", "icon.png"), optimize=True
    )
    print("app/icon.png 256x256")

    # apple-icon.png — iOS aplica su propia mascara redondeada, asi que la
    # baldosa va cuadrada a sangre. Redondearla dejaria un doble borde.
    componer(180, 0.58, 0.0, marca).save(
        os.path.join(RAIZ, "app", "apple-icon.png"), optimize=True
    )
    print("app/apple-icon.png 180x180")

    # favicon.ico multi-tamano: el navegador elige la capa segun el contexto
    # (pestana, marcador, barra de tareas) sin tener que reescalar.
    capas = [componer(s, proporcion(s), 0.20, marca) for s in (16, 32, 48, 64)]
    capas[-1].save(
        os.path.join(RAIZ, "app", "favicon.ico"),
        format="ICO",
        sizes=[(16, 16), (32, 32), (48, 48), (64, 64)],
        append_images=capas[:-1],
    )
    print("app/favicon.ico 16/32/48/64")

    print()
    print("Listo. Next enlaza los tres archivos por convencion de nombre,")
    print("sin tener que declarar nada en el <head>.")


main()
