#!/bin/bash

# Colores para la terminal
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color
BOLD='\033[1m'

echo -e "${CYAN}${BOLD}"
echo "=========================================================="
echo "          🥦 NUTRINGEST - LAUNCHPAD 🥦                    "
echo "=========================================================="
echo -e "${NC}"

# Función para verificar dependencias
check_dependency() {
    if ! command -v "$1" &> /dev/null; then
        echo -e "${RED}❌ Error: '$1' no está instalado en el sistema.${NC}"
        echo -e "${YELLOW}Por favor, instalalo antes de continuar.${NC}"
        exit 1
    fi
}

# Verificaciones iniciales
echo -e "${CYAN}🔍 Verificando dependencias del sistema...${NC}"
check_dependency "docker"

# Detectar comando docker compose
if docker compose version &> /dev/null; then
    DOCKER_COMPOSE_CMD="docker compose"
elif command -v docker-compose &> /dev/null; then
    DOCKER_COMPOSE_CMD="docker-compose"
else
    echo -e "${RED}❌ Error: No se detectó 'docker compose' ni 'docker-compose' instalado.${NC}"
    echo -e "${YELLOW}Por favor, instala Docker Compose para poder correr los contenedores.${NC}"
    exit 1
fi

# Verificar si el demonio de Docker está corriendo
if ! docker info &> /dev/null; then
    echo -e "${RED}❌ Error: El servicio de Docker no está corriendo.${NC}"
    echo -e "${YELLOW}Asegúrate de iniciar el servicio de Docker (ej. 'sudo systemctl start docker' o abre Docker Desktop).${NC}"
    exit 1
fi
echo -e "${GREEN}✔ Docker está corriendo y listo.${NC}"

# Verificar y configurar variables de entorno (.env)
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠️  No se encontró el archivo .env en la raíz del proyecto.${NC}"
    if [ -f .env.example ]; then
        echo -e "${CYAN}Copianado .env.example a .env...${NC}"
        cp .env.example .env
        echo -e "${GREEN}✔ Se ha creado el archivo .env a partir de .env.example con valores por defecto.${NC}"
        echo -e "${YELLOW}Tip: Podes editar el archivo .env para cambiar puertos o contraseñas.${NC}"
    else
        echo -e "${RED}❌ Error crítico: No se encontró ni .env ni .env.example en la raíz.${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}✔ Archivo .env detectado correctamente.${NC}"
fi

# Mostrar puertos y configuración relevante
echo -e "\n${BOLD}🔌 Configuración de red del proyecto (.env):${NC}"
grep -E "^(FRONTEND_PORT|BACKEND_PORT|DB_PORT_BIND|MINIO_API_PORT|MINIO_CONSOLE_PORT|NGINX_HTTP_PORT)=" .env || true
echo ""

# Menú interactivo
echo -e "${BOLD}¿Qué entorno querés levantar hoy, loco? Seleccioná una opción:${NC}"
echo -e "${GREEN}1)${NC} Desarrollo (Limpia cachés, compila y levanta en segundo plano)"
echo -e "${GREEN}2)${NC} QA (Levanta en primer plano para ver los logs en vivo)"
echo -e "${GREEN}3)${NC} Producción (Optimizado, corre en segundo plano)"
echo -e "${YELLOW}4)${NC} Apagar todo (Detiene y limpia contenedores dev y prod)"
echo -e "${CYAN}5)${NC} Ver logs en tiempo real (Producción)"
echo -e "${RED}6)${NC} Salir"
echo -n "Opción: "
read -r OPCION

case $OPCION in
    1)
        echo -e "\n${CYAN}🚀 Levantando entorno de DESARROLLO...${NC}"
        if command -v make &> /dev/null; then
            make dev
        else
            $DOCKER_COMPOSE_CMD -f docker-compose.dev.yml down
            rm -rf webapp/.next serverapp/dist
            $DOCKER_COMPOSE_CMD -f docker-compose.dev.yml up --build -d
        fi
        echo -e "\n${GREEN}✔ Entorno de desarrollo levantado con éxito.${NC}"
        echo -e "${CYAN}Frontend:${NC} http://localhost:3050"
        echo -e "${CYAN}Backend:${NC}  http://localhost:3001"
        ;;
    2)
        echo -e "\n${CYAN}🚀 Levantando entorno de QA...${NC}"
        if command -v make &> /dev/null; then
            make qa
        else
            $DOCKER_COMPOSE_CMD -f docker-compose.dev.yml up --build
        fi
        ;;
    3)
        echo -e "\n${CYAN}🚀 Levantando entorno de PRODUCCIÓN...${NC}"
        if command -v make &> /dev/null; then
            make up
        else
            $DOCKER_COMPOSE_CMD -f docker-compose.prod.yml up -d --build
        fi
        echo -e "\n${GREEN}✔ Entorno de producción levantado con éxito.${NC}"
        ;;
    4)
        echo -e "\n${YELLOW}🛑 Deteniendo todos los contenedores...${NC}"
        if command -v make &> /dev/null; then
            make down
        else
            $DOCKER_COMPOSE_CMD -f docker-compose.dev.yml down
            $DOCKER_COMPOSE_CMD -f docker-compose.prod.yml down
        fi
        echo -e "\n${GREEN}✔ Todos los contenedores detenidos.${NC}"
        ;;
    5)
        echo -e "\n${CYAN}📄 Mostrando logs de producción (Ctrl+C para salir)...${NC}"
        if command -v make &> /dev/null; then
            make logs
        else
            $DOCKER_COMPOSE_CMD -f docker-compose.prod.yml logs -f
        fi
        ;;
    6)
        echo -e "\n${YELLOW}¡Nos vemos, loco! Cuidate.${NC}"
        exit 0
        ;;
    *)
        echo -e "\n${RED}❌ Opción no válida.${NC}"
        exit 1
        ;;
esac
