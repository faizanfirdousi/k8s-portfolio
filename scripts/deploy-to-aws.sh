#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
KUBECONFIG_PATH="${KUBECONFIG:-$ROOT_DIR/prod-kubeconfig.yaml}"
DOCKER_USER="${DOCKER_USER:-faizanfirdousi}"
PORTFOLIO_DOMAIN="${PORTFOLIO_DOMAIN:-}"

if [[ ! -f "$KUBECONFIG_PATH" ]]; then
  echo "ERROR: Kubeconfig not found at $KUBECONFIG_PATH"
  echo "Copy prod-kubeconfig.example.yaml to prod-kubeconfig.yaml and configure it."
  exit 1
fi

echo "🚀 Building and deploying all portfolio services..."

SERVICES=(about projects skills blog contact proxy frontend)
NODE_SERVICES=(projects blog contact)

for SERVICE in "${SERVICES[@]}"; do
  IMAGE="${DOCKER_USER}/portfolio-${SERVICE}:latest"
  echo "📦 Building ${IMAGE}..."

  if [[ "$SERVICE" == "frontend" ]]; then
    (cd "$ROOT_DIR/services/frontend" && npm run build)
    docker build -t "$IMAGE" "$ROOT_DIR/services/frontend"
  elif [[ " ${NODE_SERVICES[*]} " == *" ${SERVICE} "* ]]; then
    docker build \
      -t "$IMAGE" \
      -f "$ROOT_DIR/services/$SERVICE/Dockerfile" \
      "$ROOT_DIR/services"
  else
    docker build -t "$IMAGE" "$ROOT_DIR/services/$SERVICE"
  fi

  echo "⬆️  Pushing ${IMAGE}..."
  docker push "$IMAGE"
done

echo "🔄 Applying Kubernetes manifests..."
kubectl apply -f "$ROOT_DIR/manifests/namespaces.yaml" --kubeconfig "$KUBECONFIG_PATH"

for DIR in about projects skills blog contact proxy frontend; do
  kubectl apply -f "$ROOT_DIR/manifests/$DIR/" --kubeconfig "$KUBECONFIG_PATH"
done

kubectl apply -f "$ROOT_DIR/manifests/monitoring/" --kubeconfig "$KUBECONFIG_PATH"
kubectl apply -f "$ROOT_DIR/manifests/network-policies/" --kubeconfig "$KUBECONFIG_PATH"
kubectl apply -f "$ROOT_DIR/manifests/cross-namespace-services.yaml" --kubeconfig "$KUBECONFIG_PATH"
kubectl apply -f "$ROOT_DIR/manifests/ingress.yaml" --kubeconfig "$KUBECONFIG_PATH"

if [[ -n "$PORTFOLIO_DOMAIN" ]]; then
  echo "🔒 Applying TLS resources for $PORTFOLIO_DOMAIN..."
  kubectl delete ingressroute portfolio -n default --kubeconfig "$KUBECONFIG_PATH" --ignore-not-found
  sed "s/PORTFOLIO_DOMAIN/$PORTFOLIO_DOMAIN/g" "$ROOT_DIR/manifests/tls/certificate.yaml" | \
    kubectl apply -f - --kubeconfig "$KUBECONFIG_PATH"
  kubectl apply -f "$ROOT_DIR/manifests/tls/cluster-issuer.yaml" --kubeconfig "$KUBECONFIG_PATH"
  kubectl apply -f "$ROOT_DIR/manifests/tls/ingress-tls.yaml" --kubeconfig "$KUBECONFIG_PATH"
fi

echo "🔄 Restarting all deployments..."
for NS_SERVICE in \
  "about about" \
  "projects projects" \
  "skills skills" \
  "blog blog" \
  "contact contact" \
  "proxy proxy" \
  "frontend frontend"; do
  NS="${NS_SERVICE%% *}"
  SVC="${NS_SERVICE##* }"
  kubectl rollout restart "deployment/$SVC" -n "$NS" --kubeconfig "$KUBECONFIG_PATH"
done

echo "✅ Deploy complete!"
echo "   kubectl get pods -A --kubeconfig $KUBECONFIG_PATH"
