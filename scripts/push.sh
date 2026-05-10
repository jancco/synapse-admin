#!/bin/bash
# Push custom Synapse Admin image to Tencent Cloud registry
set -euo pipefail

IMAGE="ccr.ccs.tencentyun.com/jancco/synapse-admin"
TAG="${1:-latest}"

echo "==> Login to Tencent Cloud registry..."
# Docker login handled via stored credentials or interactive prompt
echo "==> Pushing $IMAGE:$TAG"
docker push "$IMAGE:$TAG"

echo "==> Done"
