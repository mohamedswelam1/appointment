.PHONY: dev prod down logs

# Development environment
dev:
	docker-compose -f docker-compose.dev.yml up -d

# Production environment
prod:
	docker-compose up -d

# Stop all containers
down:
	docker-compose -f docker-compose.dev.yml down
	docker-compose down

# View logs
logs-dev:
	docker-compose -f docker-compose.dev.yml logs -f app

logs-prod:
	docker-compose logs -f app

# Run migrations
migrate-dev:
	docker-compose -f docker-compose.dev.yml exec app npx prisma migrate dev

migrate-prod:
	docker-compose exec app npx prisma migrate deploy 