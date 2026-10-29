#!/bin/bash
# ────────────────────────────────────────────────────────────
# NUTRINGEST — PULL DATOS DE SUPABASE A LOCAL
# Restaura los datos de producción (Supabase) en tu BD local de desarrollo.
#
# USO:
#   1) npx prisma migrate reset   (deja el schema local vacío, listo para datos)
#   2) ./scripts/pull-supabase-to-local.sh
#
# Requisitos: psql + pg_dump instalados.
# ────────────────────────────────────────────────────────────
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PRD_ENV="$ROOT/serverapp/.env.prd"
DEV_ENV="$ROOT/serverapp/.env.dev"

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

# ── Destino: BD local (docker) — se lee de serverapp/.env.dev ──
LOCAL_URL="$(get_var "$DEV_ENV" DATABASE_URL)"
if [ -z "$LOCAL_URL" ]; then
  echo "❌ No encontré DATABASE_URL en $DEV_ENV" >&2
  exit 1
fi

# Parsear postgresql://user:pass@host:port/db?opts
LOCAL_NOPROTO="${LOCAL_URL#*://}"
LOCAL_USER="$(echo "$LOCAL_NOPROTO" | cut -d: -f1)"
LOCAL_REST="${LOCAL_NOPROTO#*:}"
LOCAL_PASSWORD="$(echo "$LOCAL_REST" | cut -d@ -f1)"
LOCAL_HOSTPORT="$(echo "$LOCAL_REST" | cut -d@ -f2 | cut -d/ -f1)"
LOCAL_HOST="${LOCAL_HOSTPORT%%:*}"
LOCAL_PORT="${LOCAL_HOSTPORT##*:}"
LOCAL_DB="$(echo "$LOCAL_REST" | cut -d@ -f2 | cut -d/ -f2 | cut -d? -f1)"
DB_HOST="$LOCAL_HOST"
DB_PORT="$LOCAL_PORT"
DB_USER="$LOCAL_USER"
DB_PASSWORD="$LOCAL_PASSWORD"
DB_NAME="$LOCAL_DB"

echo "🔍 Verificando conexión a Supabase..."
psql "$SUPA_DIRECT_URL" -tAc "SELECT 1" >/dev/null
echo "✔ Supabase OK"

echo "💾 Volcando datos desde Supabase (sin _prisma_migrations)..."
DUMP_SQL=/tmp/nutrigest_supabase_pull.sql
pg_dump "$SUPA_DIRECT_URL" \
    --data-only \
    --schema='public' \
    --exclude-table='_prisma_migrations' \
    --no-owner \
    2>/dev/null \
  | grep -vE '^\\restrict|^\\unrestrict|^SET transaction_timeout' \
  > "$DUMP_SQL"

echo "🔌 Conectando a BD local: $DB_HOST:$DB_PORT/$DB_NAME"
export PGPASSWORD="$DB_PASSWORD"

# Parches de schema fuera de Prisma (Condiment, MenuCondiment, Menu.imageUrl)
echo "🧩 Aplicando patches de schema fuera de Prisma..."
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
  -v ON_ERROR_STOP=1 \
  -f "$ROOT/scripts/supabase-schema-patches.sql" >/dev/null

# session_replication_role=replica omite FKs (hay circulares: User→User, User→File)
echo "📥 Restaurando datos..."
{
  echo "SET session_replication_role = replica;"
  cat "$DUMP_SQL"
  echo "RESET session_replication_role;"
} | psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
  -v ON_ERROR_STOP=1 >/dev/null

echo "✔ Datos restaurados en local."

echo "📊 Conteo por tabla (Supabase → Local):"
SUPA_URL="$SUPA_DIRECT_URL"
LOCAL_MATCH_URL="postgresql://$DB_USER@$DB_HOST:$DB_PORT/$DB_NAME"
psql "$SUPA_DIRECT_URL" -tAc \
  "SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename <> '_prisma_migrations' ORDER BY tablename" \
  | while read -r t; do
      sc=$(psql "$SUPA_URL" -tAc "SELECT count(*) FROM \"$t\";" 2>/dev/null || echo '?')
      lc=$(PGPASSWORD="$DB_PASSWORD" psql "$LOCAL_MATCH_URL" -tAc "SELECT count(*) FROM \"$t\";" 2>/dev/null || echo '?')
      if [ "$sc" = "$lc" ]; then
        printf "  ✔ %-28s %s / %s\n" "$t" "$sc" "$lc"
      else
        printf "  ⚠ %-28s %s / %s   ← DIFIERE\n" "$t" "$sc" "$lc"
      fi
    done

echo "✅ Listo."