#!/bin/bash
# aws-provision.sh
# Run this on a fresh Ubuntu 22.04 EC2 instance to set up K3s for the portfolio

set -e

echo "Starting K3s installation for Portfolio..."

# 1. Install K3s (Lightweight Kubernetes)
# We disable traefik here if we want to use the ingress.yaml natively, but k3s comes with traefik out of the box.
# For our portfolio, we will use the built-in traefik.
curl -sfL https://get.k3s.io | sh -

# Wait for node to be ready
echo "Waiting for k3s to be ready..."
sleep 15
sudo k3s kubectl get node

# 2. Setup KUBECONFIG for ubuntu user
mkdir -p ~/.kube
sudo cp /etc/rancher/k3s/k3s.yaml ~/.kube/config
sudo chown ubuntu:ubuntu ~/.kube/config
echo "export KUBECONFIG=~/.kube/config" >> ~/.bashrc
export KUBECONFIG=~/.kube/config

# 3. Install Cert-Manager for HTTPS (Let's Encrypt)
echo "Installing cert-manager..."
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml

echo "Waiting for cert-manager pods to be ready..."
kubectl wait --for=condition=Ready pods --all -n cert-manager --timeout=300s

# 4. Clone repository (assuming you have pushed it to GitHub)
# echo "Cloning portfolio repository..."
# git clone https://github.com/faizanfirdousi/k8s-portfolio.git
# cd k8s-portfolio

echo "==========================================================="
echo "K3s is up and running!"
echo ""
echo "Next Steps:"
echo "1. Ensure AWS Security Group allows inbound on TCP 80 and 443."
echo "2. Point your domain (e.g., k8s.dev) to this EC2 instance's Elastic IP."
echo "3. Update your Kubernetes manifests (in manifests/ deployment files) to pull images from Docker Hub instead of locally built images."
echo "   Example: image: yourdockerhubuser/portfolio-frontend:latest"
echo "4. Apply your manifests:"
echo "   kubectl apply -f manifests/namespaces.yaml"
echo "   kubectl apply -R -f manifests/"
echo "==========================================================="
