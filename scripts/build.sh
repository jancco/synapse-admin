#!/bin/bash
# Build custom Synapse Admin Docker image
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
IMAGE="ccr.ccs.tencentyun.com/jancco/synapse-admin"
TAG="${1:-latest}"

cd "$REPO_ROOT"

echo "==> Building $IMAGE:$TAG"
docker build -t "$IMAGE:$TAG" .

echo "==> Done: $IMAGE:$TAG"
docker images "$IMAGE" --format "table {{.Repository}}:{{.Tag}}\t{{.Size}}"
