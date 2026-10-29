#!/bin/bash
# ────────────────────────────────────────────────────────────
# NUTRINGEST — SNAPSHOT COMPLETO DE PRODUCCIÓN
# Snapshot completo de la DB de Supabase (prod) para rollback
# antes de migración M:N patient-referral-groups.
#
# USO:
#   ./scripts/snapshot-prod.sh
#
# Crea un dump comprimido + schema-only en:
#   snapshots/prod-{YYYY-MM-DD_HHmmss}/
#
# Requisitos: pg_dump, pg_restore, psql (standard PostgreSQL).
# ────────────────────────────────────────────────────────────
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PRD_ENV="$ROOT/serverapp/.env.prd"

# ── Helper: leer var de un .env (respeta comillas) ──
get_var() {
  local env_file="$1" key="$2"
  grep -E "^${key}=" "$env_file" | head -1 | sed "s/^${key}=//" | tr -d '"'
}

# ── Origen: Supabase (session pooler, para dumps) ──
SUPA_DIRECT_URL="$(get_var "$PRD_ENV" DIRECT_URL)"
if [ -z "$SUPA_DIRECT_URL" ]; then
  echo "❌ No encontré DIRECT_URL en $PRD_ENV" >&2
  exit 1
fi

# ── Verificar conexión ──
echo "🔍 Verificando conexión a Supabase..."
psql "$SUPA_DIRECT_URL" -tAc "SELECT 1" >/dev/null
echo "✔ Supabase OK"

# ── Crear directorio de snapshot ──
TIMESTAMP="$(date +%Y-%m-%d_%H%M%S)"
SNAPSHOT_DIR="$ROOT/snapshots/prod-${TIMESTAMP}"
mkdir -p "$SNAPSHOT_DIR"
echo "📁 Snapshot dir: $SNAPSHOT_DIR"

# ── Dump completo (custom format, comprimido) ──
echo "💾 Volcando dump completo (format=custom)..."
pg_dump "$SUPA_DIRECT_URL" \
  --format=custom \
  --schema='public' \
  --no-owner \
  -f "$SNAPSHOT_DIR/nutrigest_prod.sql.gz" \
  2>/dev/null

# ── Schema-only (para diffing rápido) ──
echo "📐 Volcando schema-only..."
pg_dump "$SUPA_DIRECT_URL" \
  --schema-only \
  --schema='public' \
  --no-owner \
  -f "$SNAPSHOT_DIR/schema-only.sql" \
  2>/dev/null

# ── Listar contenido del dump ──
echo "📋 Contenido del dump (pg_restore --list):"
ITEM_COUNT=$(pg_restore --list "$SNAPSHOT_DIR/nutrigest_prod.sql.gz" 2>/dev/null | grep -c "^;" || true)
echo "   → ${ITEM_COUNT} items en el dump"

# ── Resumen ──
echo ""
echo "✅ Snapshot completado:"
echo "   Directorio: $SNAPSHOT_DIR"
echo "   Dump:       $SNAPSHOT_DIR/nutrigest_prod.sql.gz"
echo "   Schema:     $SNAPSHOT_DIR/schema-only.sql"
echo -n "   Tamaño:     "
du -sh "$SNAPSHOT_DIR" | cut -f1
