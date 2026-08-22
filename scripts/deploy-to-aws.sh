#!/usr/bin/env bash
# Build images, push to Docker Hub, deploy on EC2.
# kubectl runs on the server — no local kubeconfig or SSH tunnel needed.
#
# Production path: push to main → GitHub Actions (.github/workflows/deploy.yml)
#
# Manual fallback:
#   EC2_HOST=1.2.3.4 ./scripts/deploy-to-aws.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
DOCKER_USER="${DOCKER_USER:-faizanfirdousi}"
EC2_HOST="${EC2_HOST:?Set EC2_HOST to your EC2 public IP}"
EC2_USER="${EC2_USER:-ubuntu}"
SSH_KEY="${SSH_KEY:-}"
EC2_REPO_DIR="${EC2_REPO_DIR:-~/k8s-portfolio}"
PORTFOLIO_DOMAIN="${PORTFOLIO_DOMAIN:-}"

if [[ -z "$SSH_KEY" ]] && command -v aws >/dev/null 2>&1; then
  key_name="$(aws ec2 describe-instances \
    --filters "Name=ip-address,Values=${EC2_HOST}" \
    --query 'Reservations[0].Instances[0].KeyName' \
    --output text 2>/dev/null || true)"
  if [[ -n "$key_name" && "$key_name" != "None" ]]; then
    for candidate in "$HOME/.ssh/${key_name}.pem" "$HOME/Downloads/${key_name}.pem"; do
      if [[ -f "$candidate" ]]; then
        SSH_KEY="$candidate"
        break
      fi
    done
  fi
fi

SSH_OPTS=(-o StrictHostKeyChecking=accept-new)
if [[ -n "$SSH_KEY" ]]; then
  SSH_OPTS+=(-i "$SSH_KEY")
fi

echo "🚀 Building and pushing images..."
NO_CACHE=1 "$SCRIPT_DIR/publish-images.sh" "$DOCKER_USER"

echo "🔄 Deploying on EC2 (${EC2_USER}@${EC2_HOST})..."
REMOTE_SCRIPT=$(cat <<'REMOTE'
set -euo pipefail
cd EC2_REPO_DIR_PLACEHOLDER
git pull
PORTFOLIO_DOMAIN='PORTFOLIO_DOMAIN_PLACEHOLDER' ./scripts/apply-ec2-manifests.sh
echo "==> Restarting deployments to pick up new images..."
for ns_svc in "about about" "projects projects" "skills skills" "blog blog" "contact contact" "proxy proxy" "frontend frontend"; do
  ns="${ns_svc%% *}"
  svc="${ns_svc##* }"
  kubectl rollout restart "deployment/$svc" -n "$ns"
  kubectl rollout status "deployment/$svc" -n "$ns" --timeout=120s
done
REMOTE
)
REMOTE_SCRIPT="${REMOTE_SCRIPT//EC2_REPO_DIR_PLACEHOLDER/$EC2_REPO_DIR}"
REMOTE_SCRIPT="${REMOTE_SCRIPT//PORTFOLIO_DOMAIN_PLACEHOLDER/$PORTFOLIO_DOMAIN}"

if ! ssh "${SSH_OPTS[@]}" "${EC2_USER}@${EC2_HOST}" "$REMOTE_SCRIPT"; then
  cat >&2 <<EOF

ERROR: SSH failed. Set your EC2 key:
  SSH_KEY=~/Downloads/aws_haha.pem EC2_HOST=${EC2_HOST} ./scripts/deploy-to-aws.sh

For GitHub Actions, add EC2_SSH_KEY as a repo secret (contents of the .pem file).
EOF
  exit 1
fi

echo "✅ Deploy complete!"
