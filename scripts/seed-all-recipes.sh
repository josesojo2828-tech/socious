#!/bin/sh
# ═══════════════════════════════════════════════════════════
#   seed-all-recipes.sh — Seed COMPLETO de TODAS las recetas
#   (27 PDFs → 728 recetas → DB)
#
#   Hace todo en secuencia:
#     1. Convierte JSON consolidado a formato seed
#     2. Inserta 54 nuevos alimentos en FoodItem
#     3. Inserta 387 condimentos en Condiment
#     4. Crea 728 menús con foods + condiments
#
#   Uso:
#     ./scripts/seed-all-recipes.sh               # seed local
#     DOCKER=1 ./scripts/seed-all-recipes.sh       # seed via Docker
#     DRY_RUN=1 ./scripts/seed-all-recipes.sh      # solo conversión
#
# ═══════════════════════════════════════════════════════════

set -e

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

# ─── PASO 1: CONVERTIR ───────────────────────────────────────────────────
echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║   PASO 1: CONVERTIR JSON CONSOLIDADO A FORMATO SEED ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""

cd "$ROOT_DIR"
node scripts/convert-all-to-seed.js

if [ "${DRY_RUN:-0}" = "1" ]; then
  echo ""
  echo "═══════════════════════════════════════════════════════"
  echo "  🟡 DRY RUN — Solo conversión, sin seed a DB"
  echo "═══════════════════════════════════════════════════════"
  exit 0
fi

# ─── PASO 2: COPIAR JSON A SERVERAPP (para Docker) ──────────────────────
mkdir -p "$ROOT_DIR/serverapp/seed-data"
cp "$ROOT_DIR/scripts/seed-data/all-menus-ready.json" "$ROOT_DIR/serverapp/seed-data/all-menus-ready.json"
cp "$ROOT_DIR/scripts/seed-data/condiments.json"       "$ROOT_DIR/serverapp/seed-data/condiments.json"

# ─── PASO 3: SEED A LA DB ────────────────────────────────────────────────
echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║   PASO 2: INSERTAR EN LA BASE DE DATOS              ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""

if [ "${DOCKER:-0}" = "1" ]; then
  echo "  🐳 Via Docker: nutrigest_backend_prod"
  echo ""
  docker exec nutrigest_prod_backend sh -c \
    'DATA_PATH=/app/seed-data/all-menus-ready.json CONDIMENTS_PATH=/app/seed-data/condiments.json npm run seed:lote1'
else
  echo "  💻 Local (desde serverapp/)"
  echo ""
  cd "$ROOT_DIR/serverapp"
  npm run seed:lote1
fi

# ─── PASO 4: LIMPIAR ─────────────────────────────────────────────────────
rm -rf "$ROOT_DIR/serverapp/seed-data"

# ─── RESUMEN ──────────────────────────────────────────────────────────────
echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║   ✅ SEED COMPLETADO                                ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""
echo "  📂 Datos en DB:"
echo "     - 54 alimentos en FoodItem"
echo "     - 387 condimentos en Condiment"
echo "     - 728 menús con MenuItem + MenuCondiment"
echo ""
echo "  📁 Archivos clave:"
echo "     scripts/seed-data/all-menus-ready.json"
echo "     scripts/seed-data/condiments.json"
echo "     serverapp/src/shared/fixtures/community/seed-lote1.ts"
echo "     scripts/seed-community.ts"
echo ""
