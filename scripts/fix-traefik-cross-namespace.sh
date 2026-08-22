#!/usr/bin/env bash
# fix-traefik-cross-namespace.sh
# Traefik must allow cross-namespace IngressRoute backends (portfolio in default → services in other NS).

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

echo "==> Applying Traefik HelmChartConfig..."
kubectl apply -f "$ROOT_DIR/manifests/traefik-helm-config.yaml"

echo "==> Ensuring allowCrossNamespace is enabled on Traefik..."
ARGS="$(kubectl get deployment traefik -n kube-system -o jsonpath='{.spec.template.spec.containers[0].args[*]}' 2>/dev/null || true)"

if [[ "$ARGS" != *"allowcrossnamespace=true"* ]]; then
  echo "    Patching Traefik deployment args..."
  kubectl patch deployment traefik -n kube-system --type='json' -p='[
    {"op": "add", "path": "/spec/template/spec/containers/0/args/-", "value": "--providers.kubernetescrd.allowcrossnamespace=true"}
  ]'
else
  echo "    allowCrossNamespace already set."
fi

echo "==> Restarting Traefik..."
kubectl rollout restart deployment/traefik -n kube-system
kubectl rollout status deployment/traefik -n kube-system --timeout=120s

echo "==> Waiting for Traefik to reconcile routes..."
sleep 5

if kubectl logs -n kube-system deployment/traefik --tail=20 2>/dev/null | grep -q 'subset not found'; then
  echo "    Still seeing subset errors — forcing Helm chart reinstall..."
  kubectl delete helmchart traefik -n kube-system --ignore-not-found
  sleep 15
  kubectl rollout status deployment/traefik -n kube-system --timeout=180s
fi

echo "✅ Traefik cross-namespace routing enabled."
