#!/usr/bin/env bash
# local-up.sh — Spins up the full k8s-portfolio stack locally
#
# What this script does, in order:
#   1. Create the k3d cluster (if it doesn't already exist)
#   2. Wait for Traefik (k3s built-in ingress controller) to become ready
#   3. Build all 6 Docker images on your local machine
#   4. Load those images INTO the cluster (k3d clusters can't pull from your local Docker daemon by default)
#   5. Apply all Kubernetes manifests (namespaces, deployments, services, ingress, etc.)
#
# Usage: ./scripts/local-up.sh
# Prerequisites: k3d, kubectl, docker must all be installed

# "set -euo pipefail" means:
#   -e  → exit immediately if any command fails (don't silently continue on errors)
#   -u  → treat unset variables as errors
#   -o pipefail → if any command in a pipe fails, the whole pipe fails
set -euo pipefail

# Get the directory where this script lives, so we can reference other files relative to it
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"   # the repo root (one level up from scripts/)

echo "==> [1/5] Creating k3d cluster..."

# Check if a cluster named "portfolio" already exists
# `k3d cluster list -o json` outputs JSON; we grep for the cluster name
if k3d cluster list | grep -q "portfolio"; then
  echo "    Cluster 'portfolio' already exists — skipping creation"
else
  # Create the cluster using our config file
  # The config defines: 1 server + 2 agents, port mapping 8080→80, Traefik enabled
  k3d cluster create --config "$ROOT_DIR/k3d-config.yaml"
  echo "    Cluster created!"
fi

# Switch kubectl context to our new cluster
# kubectl uses "contexts" to know which cluster to talk to
# k3d names the context "k3d-<cluster-name>"
kubectl config use-context k3d-portfolio

echo ""
echo "==> [2/5] Waiting for Traefik ingress controller..."
# k3s ships Traefik as the default ingress controller — no separate install step.
# Traefik watches for IngressRoute and Middleware CRDs and configures routing rules.
echo "    Waiting for Traefik deployment to be ready..."
kubectl rollout status deployment/traefik \
  --namespace kube-system \
  --timeout=120s

echo ""
echo "==> [3/5] Building Docker images..."
# We build each service's Docker image locally.
# The image name format is: portfolio/<service-name>:local
# We tag them with ":local" so we know these are local builds, not pulled from a registry.

SERVICES=(about projects blog contact proxy frontend)
for SERVICE in "${SERVICES[@]}"; do
  echo "    Building portfolio/$SERVICE:local..."
  docker build \
    -t "portfolio/$SERVICE:local" \
    "$ROOT_DIR/services/$SERVICE"
done

echo ""
echo "==> [4/5] Loading images into k3d cluster..."
# This is the critical k3d-specific step!
#
# By default, when Kubernetes tries to pull an image, it looks in a registry (like Docker Hub).
# Our images are only on our local machine — they're not pushed to any registry.
# k3d's solution: you can "import" local images directly into the cluster's container runtime.
# After this, when a Pod spec says `image: portfolio/about:local`, the cluster finds it.
#
# We also set imagePullPolicy: Never in our manifests (you'll see this later) to tell
# Kubernetes: "don't try to pull this from a registry — it's already there."
for SERVICE in "${SERVICES[@]}"; do
  echo "    Loading portfolio/$SERVICE:local..."
  k3d image import "portfolio/$SERVICE:local" -c portfolio
done

echo ""
echo "==> [5/5] Applying Kubernetes manifests..."
# Apply manifests in order. Order matters because:
#   - Namespaces must exist before you can create resources inside them
#   - ServiceAccounts must exist before Deployments that reference them
#   - Services must exist before the Ingress that routes to them

# First: create all namespaces
kubectl apply -f "$ROOT_DIR/manifests/namespaces.yaml"

# Then: apply each service's manifests
for DIR in about projects blog contact proxy frontend; do
  kubectl apply -f "$ROOT_DIR/manifests/$DIR/"
done

# Then: ExternalName services in default namespace (bridges IngressRoute → cross-namespace services)
kubectl apply -f "$ROOT_DIR/manifests/cross-namespace-services.yaml"

# Then: the IngressRoute (routes traffic to services that now exist)
kubectl apply -f "$ROOT_DIR/manifests/ingress.yaml"

echo ""
echo "=========================================="
echo "✅ Portfolio cluster is up!"
echo ""
echo "   kubectl get pods -A        → see all running pods"
echo "   curl localhost:8080/about  → test the about section"
echo "   curl localhost:8080/api/topology → test the proxy"
echo "=========================================="
