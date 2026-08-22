#!/usr/bin/env bash
# recreate-ec2-cluster.sh — Recreate the k3d cluster on EC2 and apply all manifests.
# Run on EC2 from anywhere: ~/k8s-portfolio/scripts/recreate-ec2-cluster.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
TRAEFIK_CONFIG="$ROOT_DIR/manifests/traefik-helm-config.yaml"

echo "==> Recreating k3d cluster (1 server + 2 agents)..."
k3d cluster delete portfolio 2>/dev/null || true

k3d cluster create --config "$ROOT_DIR/k3d-ec2-config.yaml" \
  --volume "$TRAEFIK_CONFIG:/var/lib/rancher/k3s/server/manifests/traefik-helm-config.yaml@server:*"

mkdir -p "$HOME/.kube"
k3d kubeconfig merge portfolio --kubeconfig-merge-default --kubeconfig-switch-context

echo "==> Waiting for Traefik..."
kubectl rollout status deployment/traefik -n kube-system --timeout=300s

echo "==> Applying portfolio manifests..."
"$SCRIPT_DIR/apply-ec2-manifests.sh"

echo ""
echo "==> Verifying API is localhost-only (should NOT show 0.0.0.0:35953)..."
sudo ss -tlnp | grep -E ':(80|443|6443|35953)\s' || true

echo ""
echo "✅ Cluster recreated. Site should be at http://<ec2-public-ip>/"
