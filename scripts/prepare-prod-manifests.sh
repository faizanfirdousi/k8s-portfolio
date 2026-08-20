#!/usr/bin/env bash
# prepare-prod-manifests.sh — Updates Kubernetes manifests to use Docker Hub images
#
# Usage: ./scripts/prepare-prod-manifests.sh <dockerhub-username>

set -euo pipefail

if [ -z "${1:-}" ]; then
  echo "Error: Please provide your Docker Hub username."
  echo "Usage: ./scripts/prepare-prod-manifests.sh <dockerhub-username>"
  exit 1
fi

DOCKER_USER="$1"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
MANIFESTS_DIR="$ROOT_DIR/manifests"

echo "Updating manifests in $MANIFESTS_DIR to use Docker Hub user: $DOCKER_USER"

# Use sed to replace local images with docker hub images
# Example: portfolio/about:local -> DOCKER_USER/portfolio-about:latest
# And: imagePullPolicy: Never -> imagePullPolicy: Always

# Find all yaml files in the manifests directory
find "$MANIFESTS_DIR" -type f -name "*.yaml" | while read -r file; do
  # Replace image names
  sed -i "s|image: portfolio/\(.*\):local|image: $DOCKER_USER/portfolio-\1:latest|g" "$file"
  
  # Replace image pull policy
  sed -i "s|imagePullPolicy: Never|imagePullPolicy: Always|g" "$file"
done

echo "✅ Manifests updated successfully!"
echo "Please review the changes with 'git diff' to ensure everything looks correct."
