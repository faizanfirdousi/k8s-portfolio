#!/bin/bash
set -e

echo "🚀 Building and deploying updates to AWS EC2 cluster..."

echo "📦 Building Proxy Image..."
cd services/proxy
docker build -t faizanfirdousi/portfolio-proxy:latest .
docker push faizanfirdousi/portfolio-proxy:latest
cd ../..

echo "📦 Building Frontend Image..."
cd services/frontend
npm run build
docker build -t faizanfirdousi/portfolio-frontend:latest .
docker push faizanfirdousi/portfolio-frontend:latest
cd ../..

echo "🔄 Applying Kubernetes Manifests..."
kubectl apply -f manifests/ --recursive --kubeconfig prod-kubeconfig.yaml

echo "🔄 Restarting Deployments..."
kubectl rollout restart deployment/proxy -n proxy --kubeconfig prod-kubeconfig.yaml
kubectl rollout restart deployment/frontend -n frontend --kubeconfig prod-kubeconfig.yaml

echo "✅ Deploy complete! Run 'kubectl get pods -A --kubeconfig prod-kubeconfig.yaml' to check status."
