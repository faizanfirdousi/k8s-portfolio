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

echo "==> Make sure you are logged in to Docker Hub!"
echo "If this fails, run 'docker login' first."
echo ""

SERVICES=(about projects skills blog contact proxy frontend)
NODE_SERVICES=(projects blog contact)

for SERVICE in "${SERVICES[@]}"; do
  IMAGE_NAME="${DOCKER_USER}/portfolio-${SERVICE}:latest"
  echo "🚀 Building ${IMAGE_NAME}..."
  
  if [[ " ${NODE_SERVICES[*]} " == *" ${SERVICE} "* ]]; then
    # Node services need the parent 'services' directory as context to access shared code
    docker build \
      -t "${IMAGE_NAME}" \
      -f "$ROOT_DIR/services/$SERVICE/Dockerfile" \
      "$ROOT_DIR/services"
  else
    # Other services can use their own directory as context
    docker build \
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
echo "Next steps for production deployment:"
echo "1. Go to your 'manifests/' folder."
echo "2. Find the 'deployment.yaml' files for each service."
echo "3. Update the 'image:' line to point to your new images."
echo "   Example: 'image: portfolio/about:local' -> 'image: ${DOCKER_USER}/portfolio-about:latest'"
echo "4. Change 'imagePullPolicy: Never' to 'imagePullPolicy: Always'."
