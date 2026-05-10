#!/bin/bash
set -euo pipefail

REGISTRY="ccr.ccs.tencentyun.com"
NAMESPACE="jancco"
IMAGE_NAME="synapse-admin"
TAG="${1:-latest}"
FULL_IMAGE="${REGISTRY}/${NAMESPACE}/${IMAGE_NAME}:${TAG}"

echo "🔨 Building ${IMAGE_NAME}..."
docker build -t "${FULL_IMAGE}" .

echo "📤 Pushing ${FULL_IMAGE}..."
docker push "${FULL_IMAGE}"

echo "✅ Done: ${FULL_IMAGE}"
