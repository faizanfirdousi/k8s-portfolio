#!/usr/bin/env bash
# local-down.sh — Tears down the local k8s-portfolio cluster
#
# This is the cleanup script. It:
#   1. Deletes the k3d cluster (removes all Docker containers for the cluster)
#   2. Removes the local Docker images we built (optional, but keeps things clean)
#
# Usage: ./scripts/local-down.sh

set -euo pipefail

echo "==> Deleting k3d cluster 'portfolio'..."
# This removes all Docker containers that make up the cluster.
# Your data (manifests, source code) is untouched — this only removes the running cluster.
k3d cluster delete portfolio

echo ""
echo "==> Removing local Docker images..."
# Remove the images we built — this is optional.
# Comment this out if you want to keep the images to avoid rebuilding next time.
SERVICES=(about projects skills blog contact proxy frontend)
for SERVICE in "${SERVICES[@]}"; do
  docker rmi "portfolio/$SERVICE:local" 2>/dev/null || echo "    (portfolio/$SERVICE:local not found — skipping)"
done

echo ""
echo "✅ Cluster torn down. Run ./scripts/local-up.sh to bring it back."
