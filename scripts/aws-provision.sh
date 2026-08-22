#!/bin/bash
# aws-provision.sh
# Run on a fresh Ubuntu 22.04 EC2 instance to create a multi-node k3d cluster.
# The cluster API stays on localhost. Deploy via GitHub Actions or SSH — kubectl runs on this host.

set -euo pipefail

REPO_DIR="${REPO_DIR:-$HOME/k8s-portfolio}"
CERT_MANAGER_EMAIL="${CERT_MANAGER_EMAIL:-portfolio@example.com}"
PORTFOLIO_DOMAIN="${PORTFOLIO_DOMAIN:-}"

echo "==> Installing Docker..."
if ! command -v docker &>/dev/null; then
  curl -fsSL https://get.docker.com | sh
  sudo usermod -aG docker "$USER"
  echo "Docker installed. You may need to log out and back in for group membership."
fi

echo "==> Installing k3d..."
if ! command -v k3d &>/dev/null; then
  curl -s https://raw.githubusercontent.com/k3d-io/k3d/main/install.sh | bash
fi

echo "==> Installing kubectl..."
if ! command -v kubectl &>/dev/null; then
  curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
  chmod +x kubectl
  sudo mv kubectl /usr/local/bin/kubectl
fi

if [ ! -d "$REPO_DIR" ]; then
  echo "ERROR: Repository not found at $REPO_DIR"
  echo "Clone the repo first, e.g.:"
  echo "  git clone https://github.com/faizanfirdousi/k8s-portfolio.git $REPO_DIR"
  exit 1
fi

cd "$REPO_DIR"

echo "==> Creating multi-node k3d cluster (1 server + 2 agents)..."
if k3d cluster list 2>/dev/null | grep -q '^portfolio'; then
  echo "    Cluster 'portfolio' already exists — skipping creation"
else
  k3d cluster create --config "$REPO_DIR/k3d-ec2-config.yaml" \
    --volume "$REPO_DIR/manifests/traefik-helm-config.yaml:/var/lib/rancher/k3s/server/manifests/traefik-helm-config.yaml@server:*"
fi

export KUBECONFIG="$HOME/.kube/config"
mkdir -p "$HOME/.kube"
k3d kubeconfig merge portfolio --kubeconfig-merge-default --kubeconfig-switch-context

echo "==> Waiting for Traefik..."
kubectl rollout status deployment/traefik -n kube-system --timeout=300s

echo "==> Installing cert-manager..."
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml
kubectl wait --for=condition=Ready pods --all -n cert-manager --timeout=300s

if [ -n "$PORTFOLIO_DOMAIN" ]; then
  echo "==> Configuring TLS for $PORTFOLIO_DOMAIN..."
  sed "s/portfolio@example.com/$CERT_MANAGER_EMAIL/g" manifests/tls/cluster-issuer.yaml | kubectl apply -f -
  sed "s/PORTFOLIO_DOMAIN/$PORTFOLIO_DOMAIN/g" manifests/tls/certificate.yaml | kubectl apply -f -
  kubectl delete ingressroute portfolio -n default --ignore-not-found
  kubectl apply -f manifests/tls/ingress-tls.yaml
else
  echo "    Skipping TLS (set PORTFOLIO_DOMAIN to enable Let's Encrypt)."
fi

echo "==========================================================="
echo "k3d cluster is ready on this EC2 instance."
echo ""
echo "Security:"
echo "  - Only ports 80 and 443 are published to the internet."
echo "  - The Kubernetes API is NOT exposed publicly."
echo ""
echo "Deploy (push to main, or manual from laptop):"
echo "  EC2_HOST=<ec2-ip> ./scripts/deploy-to-aws.sh"
echo "  kubectl get pods -A   # run on this EC2 instance"
echo "==========================================================="
