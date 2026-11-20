# Hackmap: hackathones en España

Web estática con los próximos hackathones **presenciales** de España, un mapa por comunidades autónomas y rankings (racha de años seguidos, ediciones, veteranía).

## Ver en local

`fetch` no funciona abriendo el HTML con doble clic, hace falta un servidor:

```bash
python -m http.server 8000
# http://localhost:8000
```

## Publicar en GitHub Pages

1. Sube la carpeta a un repositorio.
2. Settings → Pages → Deploy from a branch → `main` / `(root)`.

No hay build: D3, topojson-client y d3-composite-projections se cargan desde jsDelivr.

## Añadir o corregir un hackathon

Todo está en [`data/hackathones.json`](data/hackathones.json). Cada entrada:

```jsonc
{
  "id": "hackupc",
  "nombre": "HackUPC",
  "organizador": "Hackers@UPC",
  "ciudad": "Barcelona",
  "provincia": "Barcelona",
  "ccaa": "Cataluña",              // nombre exacto de la lista de comunidades de app.js
  "web": "https://hackupc.com/",
  "tematica": ["general"],
  "duracion_h": 36,
  "participantes": 600,
  "ediciones": [
    { "anio": 2015, "formato": "presencial" },
    { "anio": 2020, "formato": "online" },
    { "anio": 2018 },                       // se celebró, formato desconocido
    { "anio": 2019, "verificada": false }   // sin fuente clara
  ],
  "proxima": { "inicio": "2027-05-07", "fin": "2027-05-09", "confirmada": true }
  // o, si aún no hay fecha: { "mes_estimado": "2027-05", "confirmada": false }
}
```

- Las rachas y rankings se calculan solos a partir de `ediciones`.
- La racha actual sigue viva si la última edición fue este año o el anterior.
- Las ediciones online (pandemia) cuentan para la racha, pero en el histórico se pintan distinto.
- Cuando pase una edición, muévela de `proxima` a `ediciones` y actualiza `actualizado`.

Mapa: [es-atlas](https://github.com/martgnz/es-atlas) (datos del IGN).
