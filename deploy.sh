#!/bin/bash

# Colores para la terminal
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color
BOLD='\033[1m'

echo -e "${CYAN}${BOLD}🚀 Iniciando proceso de despliegue seguro...${NC}\n"

# 1. Descargar los últimos cambios (sincronización exacta con origin/main)
echo -e "${YELLOW}📥 Sincronizando con la rama origin/main...${NC}"
git fetch origin main
git reset --hard origin/main

# 2. Construir las imágenes PRIMERO. Si falla, el sistema viejo sigue corriendo.
echo -e "\n${YELLOW}🏗️  Construyendo imágenes de Docker (Pre-build)...${NC}"
if docker compose -f docker-compose.prod.yml build; then
    echo -e "${GREEN}✔ Construcción exitosa de las imágenes de Docker.${NC}"
else
    echo -e "${RED}❌ Error: Falló la construcción de la imagen. Despliegue abortado para no interrumpir el servicio activo.${NC}"
    exit 1
fi

# 3. Si la construcción fue exitosa, tumbamos la versión vieja y levantamos los nuevos contenedores
echo -e "\n${YELLOW}🛑 Deteniendo contenedores de producción actuales...${NC}"
docker compose -f docker-compose.prod.yml down

# 4. Levantamos la nueva versión con las imágenes recién construidas
echo -e "\n${GREEN}🚀 Levantando servicios actualizados...${NC}"
docker compose -f docker-compose.prod.yml up -d

# 5. Limpieza de imágenes huérfanas
echo -e "\n${YELLOW}🧹 Limpiando imágenes antiguas en desuso...${NC}"
docker image prune -f

echo -e "\n${GREEN}${BOLD}✅ ¡Despliegue finalizado con éxito y sin interrupciones previas!${NC}"
