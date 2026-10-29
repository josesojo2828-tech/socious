#!/bin/sh

# Detener el script si ocurre un error
set -e

# Dentro de la red docker la base es el servicio "database" (puerto interno 5432).
# Las URLs que apunten a localhost/127.0.0.1 (puerto bind del HOST, p.ej. 11003)
# son inalcanzables desde el contenedor: se reescriben al host/port internos.
# Se puede overridear via DB_HOST / DB_PORT si se renombra el servicio de base.
DB_HOST="${DB_HOST:-database}"
DB_PORT="${DB_PORT:-5432}"

# Reescribe el host de una URL postgres si apunta al loopback del host.
# No toca user/password/base/query: solo host y puerto.
dockerize_url() {
  printf '%s' "$1" | sed -E "s#@(localhost|127\.0\.0\.1)(:[0-9]+)?/#@${DB_HOST}:${DB_PORT}/#g"
}

DATABASE_URL="$(dockerize_url "${DATABASE_URL:-}")"
DIRECT_URL="$(dockerize_url "${DIRECT_URL:-}")"
[ -n "$DATABASE_URL" ] && export DATABASE_URL
[ -n "$DIRECT_URL" ] && export DIRECT_URL

# Asegurar existencia y permisos de dist e i18n para evitar EACCES con el usuario node
echo "🧹 Verificando y preparando directorio dist y estructura i18n..."
mkdir -p dist 2>/dev/null || true

mkdir -p dist/i18n/not_en dist/i18n/es 2>/dev/null || true
if [ -d "src/i18n" ]; then
  for dir in src/i18n/*/; do
    if [ -d "$dir" ]; then
      dirname=$(basename "$dir")
      mkdir -p "dist/i18n/$dirname" 2>/dev/null || true
    fi
  done
fi

echo "🛠️  Generando cliente de Prisma..."
npx prisma generate

echo "🛠️  Aplicando migraciones de Prisma..."
npx prisma migrate deploy

if [ "${NODE_ENV:-development}" = "development" ] || [ ! -f "dist/main.js" ]; then
  echo "🛠️  Compilando la aplicación (npm run build)..."
  npm run build
fi

echo "🚀  Iniciando la aplicación..."
# Ejecuta el CMD de la imagen (npm run dev) en el mismo proceso (señales y logs).
exec "$@"
