#!/bin/bash
set -euo pipefail

REMOTE_HOST="${1:-hermes-vm}"
REGISTRY="ccr.ccs.tencentyun.com"
NAMESPACE="jancco"
IMAGE_NAME="synapse-admin"
TAG="${2:-latest}"
FULL_IMAGE="${REGISTRY}/${NAMESPACE}/${IMAGE_NAME}:${TAG}"

echo "🚀 Deploying ${FULL_IMAGE} to ${REMOTE_HOST}..."

ssh "${REMOTE_HOST}" /bin/bash << EOF
  set -e
  echo "📥 Pulling ${FULL_IMAGE}..."
  docker pull "${FULL_IMAGE}"

  echo "🛑 Stopping old ${IMAGE_NAME}..."
  docker stop ${IMAGE_NAME} 2>/dev/null || true
  docker rm ${IMAGE_NAME} 2>/dev/null || true

  echo "🚀 Starting new ${IMAGE_NAME}..."
  docker run -d \
    --name ${IMAGE_NAME} \
    --network app_matrix \
    --restart unless-stopped \
    "${FULL_IMAGE}"

  echo "✅ ${IMAGE_NAME} is running"
EOF

echo "✅ Deployed ${FULL_IMAGE} on ${REMOTE_HOST}"
