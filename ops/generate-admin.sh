#!/bin/bash
# Create an admin user in the dev Synapse container.
# Prerequisite: docker-compose -f ops/docker-compose.dev.yml up -d
set -euo pipefail

CONTAINER="synapse-admin-dev-synapse"
ADMIN_USER="admin"
ADMIN_PASS="${1:-adminpassword}"

echo "⏳ Waiting for Synapse health check..."
for i in $(seq 1 30); do
  if docker exec "$CONTAINER" curl -sf http://127.0.0.1:8008/_matrix/client/versions > /dev/null 2>&1; then
    break
  fi
  sleep 2
done

echo "👤 Registering admin user: $ADMIN_USER"
docker exec "$CONTAINER" register_new_matrix_user \
  http://127.0.0.1:8008 \
  -c /data/homeserver.yaml \
  -u "$ADMIN_USER" \
  -p "$ADMIN_PASS" \
  -a 2>&1 || echo "(may already exist, ignore)"

echo ""
echo "✅ Dev environment ready!"
echo "   Synapse:    http://localhost:8008"
echo "   Admin UI:   http://localhost:5173"
echo "   Login:      $ADMIN_USER / $ADMIN_PASS at http://localhost:8008"
