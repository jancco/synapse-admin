# synapse-admin development workflow
# ====================================
#
# Quick start:
#   make dev          # start synapse + admin dev server with hot-reload
#   make admin        # create admin user
#   make logs         # tail dev logs
#   make down         # stop dev environment
#
# After testing fixes:
#   make build        # production docker build
#   make push         # push to registry
#   make deploy       # deploy to remote VM

.PHONY: dev admin logs down build push deploy all

COMPOSE_FILE := ops/docker-compose.dev.yml
REGISTRY     := ccr.ccs.tencentyun.com
NAMESPACE    := jancco
IMAGE        := synapse-admin
TAG          ?= latest
FULL_IMAGE   := $(REGISTRY)/$(NAMESPACE)/$(IMAGE):$(TAG)
REMOTE       ?= hermes-vm
NETWORK      := app_matrix

# ── Development ──────────────────────────────────────
dev:
	docker compose -f $(COMPOSE_FILE) up -d
	@echo "⏳ Starting... wait for Synapse health check (may take 30s)"
	@echo "   Then run: make admin"

admin:
	chmod +x ops/generate-admin.sh
	./ops/generate-admin.sh

logs:
	docker compose -f $(COMPOSE_FILE) logs -f

down:
	docker compose -f $(COMPOSE_FILE) down

# ── Production ───────────────────────────────────────
build:
	@echo "🔨 Building $(IMAGE)..."
	docker build -t $(FULL_IMAGE) .

push:
	@echo "📤 Pushing $(FULL_IMAGE)..."
	docker push $(FULL_IMAGE)

deploy:
	@echo "🚀 Deploying $(FULL_IMAGE) to $(REMOTE)..."
	ssh $(REMOTE) /bin/bash <<-SCRIPT
		set -e
		docker pull $(FULL_IMAGE)
		docker stop $(IMAGE) 2>/dev/null || true
		docker rm $(IMAGE) 2>/dev/null || true
		docker run -d \
			--name $(IMAGE) \
			--network $(NETWORK) \
			--restart unless-stopped \
			$(FULL_IMAGE)
		echo "✅ $(IMAGE) deployed"
	SCRIPT

# ── Full pipeline (test first, then build+push+deploy) ──
all: build push deploy
	@echo "✅ Full pipeline complete"
