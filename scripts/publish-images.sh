#!/usr/bin/env bash
# publish-images.sh — Builds and pushes portfolio images to Docker Hub
#
# Usage: ./scripts/publish-images.sh <dockerhub-username>

set -euo pipefail

if [ -z "${1:-}" ]; then
  echo "Error: Please provide your Docker Hub username."
  echo "Usage: ./scripts/publish-images.sh <dockerhub-username>"
  exit 1
fi

DOCKER_USER="$1"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
DOCKER_BUILD_OPTS="${DOCKER_BUILD_OPTS:-}"

if [[ "${NO_CACHE:-}" == "1" ]]; then
  DOCKER_BUILD_OPTS+=" --no-cache"
fi

echo "==> Make sure you are logged in to Docker Hub!"
echo "If this fails, run 'docker login' first."
echo ""

SERVICES=(about projects skills blog contact proxy frontend)
NODE_SERVICES=(projects blog contact)

for SERVICE in "${SERVICES[@]}"; do
  IMAGE_NAME="${DOCKER_USER}/portfolio-${SERVICE}:latest"
  echo "🚀 Building ${IMAGE_NAME}..."
  
  if [[ "$SERVICE" == "frontend" ]]; then
    (cd "$ROOT_DIR/services/frontend" && npm ci && npm run build)
    # shellcheck disable=SC2086
    docker build ${DOCKER_BUILD_OPTS} -t "${IMAGE_NAME}" "$ROOT_DIR/services/frontend"
  elif [[ " ${NODE_SERVICES[*]} " == *" ${SERVICE} "* ]]; then
    # shellcheck disable=SC2086
    docker build ${DOCKER_BUILD_OPTS} \
      -t "${IMAGE_NAME}" \
      -f "$ROOT_DIR/services/$SERVICE/Dockerfile" \
      "$ROOT_DIR/services"
  else
    # shellcheck disable=SC2086
    docker build ${DOCKER_BUILD_OPTS} \
      -t "${IMAGE_NAME}" \
      "$ROOT_DIR/services/$SERVICE"
  fi
  
  echo "⬆️ Pushing ${IMAGE_NAME} to Docker Hub..."
  docker push "${IMAGE_NAME}"
  echo "✅ Successfully pushed ${IMAGE_NAME}"
  echo "----------------------------------------"
done

echo "🎉 All images have been built and pushed to Docker Hub!"
echo ""
echo "Deploy: push to main (GitHub Actions), or:"
echo "  EC2_HOST=<ec2-ip> ./scripts/deploy-to-aws.sh"
