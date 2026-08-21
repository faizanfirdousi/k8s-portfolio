#!/usr/bin/env bash
# apply-ec2-manifests.sh — Apply the full portfolio stack on the EC2 k3d cluster.
# Run from the repo root on EC2: ./scripts/apply-ec2-manifests.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
PORTFOLIO_DOMAIN="${PORTFOLIO_DOMAIN:-}"

echo "==> Applying namespaces..."
kubectl apply -f "$ROOT_DIR/manifests/namespaces.yaml"

echo "==> Applying service manifests..."
for DIR in about projects skills blog contact proxy frontend; do
  kubectl apply -f "$ROOT_DIR/manifests/$DIR/"
done

echo "==> Applying monitoring..."
kubectl apply -f "$ROOT_DIR/manifests/monitoring/"

echo "==> Applying network policies..."
kubectl apply -f "$ROOT_DIR/manifests/network-policies/"

echo "==> Applying cross-namespace services..."
kubectl apply -f "$ROOT_DIR/manifests/cross-namespace-services.yaml"

echo "==> Applying Traefik middlewares + HTTP ingress routes..."
kubectl apply -f "$ROOT_DIR/manifests/ingress.yaml"

if [[ -n "$PORTFOLIO_DOMAIN" ]]; then
  echo "==> Applying TLS for $PORTFOLIO_DOMAIN..."
  kubectl delete ingressroute portfolio -n default --ignore-not-found
  sed "s/PORTFOLIO_DOMAIN/$PORTFOLIO_DOMAIN/g" "$ROOT_DIR/manifests/tls/certificate.yaml" | kubectl apply -f -
  kubectl apply -f "$ROOT_DIR/manifests/tls/cluster-issuer.yaml"
  kubectl apply -f "$ROOT_DIR/manifests/tls/ingress-tls.yaml"
fi

echo ""
echo "==> Verifying IngressRoutes..."
kubectl get ingressroutes.traefik.io -A 2>/dev/null || kubectl get ingressroute -A

echo ""
echo "==> Pod status..."
kubectl get pods -A | grep -E 'NAMESPACE|frontend|about|skills|projects|blog|contact|proxy|traefik' || kubectl get pods -A

echo ""
echo "==> Smoke test..."
curl -s -o /dev/null -w "  /          → HTTP %{http_code}\n" http://localhost/
curl -s -o /dev/null -w "  /about     → HTTP %{http_code}\n" http://localhost/about
curl -s -o /dev/null -w "  /api/topology → HTTP %{http_code}\n" http://localhost/api/topology

echo ""
echo "✅ Manifests applied."
