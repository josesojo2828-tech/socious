.PHONY: up down build logs install

up:
	docker compose -f docker-compose.prod.yml up -d --build

qa:
	docker compose -f docker-compose.dev.yml up --build

dev:
	docker compose -f docker-compose.dev.yml down
	rm -rf webapp/.next serverapp/dist
	docker compose -f docker-compose.dev.yml up --build -d

down:
	docker compose -f docker-compose.dev.yml down && docker compose -f docker-compose.prod.yml down

build:
	docker compose -f docker-compose.prod.yml build

logs:
	docker compose -f docker-compose.prod.yml logs -f

install:
	cd serverapp && npm install
	cd webapp && npm install
