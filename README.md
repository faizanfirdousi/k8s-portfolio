# Faizan Firdousi — K8s Portfolio

A personal portfolio site that runs **on** a real Kubernetes cluster.
Each page you visit is a live Pod. The topology graph shows the cluster running underneath in real-time.

## Architecture

```
Browser → Traefik → Service → Pod (per section)
                ↓
         /api/topology → proxy Pod (Go) → Kubernetes API (read-only)
```

| Path | Namespace | Service | What it runs |
|------|-----------|---------|-------------|
| `/` | `frontend` | frontend | React app + topology graph |
| `/about` | `about` | about | Nginx + static HTML |
| `/projects` | `projects` | projects | Node/Express + GitHub API |
| `/blog` | `blog` | blog | Node/Express + Markdown renderer |
| `/contact` | `contact` | contact | Node/Express + contact form |
| `/api/*` | `proxy` | proxy | Go binary reading K8s API |

## Local Development

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/)
- [k3d](https://k3d.io/#installation) — `curl -s https://raw.githubusercontent.com/k3d-io/k3d/main/install.sh | bash`
- [kubectl](https://kubernetes.io/docs/tasks/tools/)

### Start the cluster

```bash
./scripts/local-up.sh
```

This script:
1. Creates a k3d cluster (1 server + 2 agents, mapped to localhost:8080)
2. Waits for Traefik (k3s built-in ingress controller)
3. Builds all 6 Docker images locally
4. Loads images into the cluster (`k3d image import`)
5. Applies all Kubernetes manifests

### Verify everything is running

```bash
kubectl get pods -A
# NAMESPACE      NAME                               READY   STATUS    RESTARTS
# about          about-xxx                          1/1     Running   0
# projects       projects-xxx                       1/1     Running   0
# blog           blog-xxx                           1/1     Running   0
# contact        contact-xxx                        1/1     Running   0
# proxy          proxy-xxx                          1/1     Running   0
# frontend       frontend-xxx                       1/1     Running   0
```

### Access the portfolio

```
http://localhost:8080            → Main portfolio
http://localhost:8080/about      → About section
http://localhost:8080/projects   → Projects (live GitHub stats)
http://localhost:8080/blog       → Blog posts
http://localhost:8080/contact    → Contact form
http://localhost:8080/api/topology → Live cluster topology JSON
```

### Tear down

```bash
./scripts/local-down.sh
```

## Production Deployment (Phase 5)

> [!NOTE]
> Requires a VPS with Ubuntu 22.04 and a domain name. See Phase 5 in the implementation plan.

```bash
# Install k3s on the VPS
curl -sfL https://get.k3s.io | sh -

# Install cert-manager
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml

# Apply all manifests (same as local, but against the production context)
kubectl config use-context <production-context>
./scripts/local-up.sh  # works for prod too, just uses a different context
```

## Security

This section documents the security review required by Phase 6.

### RBAC

The cluster-read proxy runs with a `ServiceAccount` bound to a `ClusterRole` with **read-only** access to pods and nodes only:

```yaml
rules:
  - apiGroups: [""]
    resources: ["pods", "nodes"]
    verbs: ["get", "list", "watch"]
    # No write verbs. No secrets. No configmaps. No other resources.
```

**Verified with:**
```bash
# Can it list pods? YES (expected)
kubectl auth can-i list pods --as=system:serviceaccount:proxy:topology-reader

# Can it delete pods? NO (expected)
kubectl auth can-i delete pods --as=system:serviceaccount:proxy:topology-reader

# Can it read secrets? NO (expected)
kubectl auth can-i get secrets --as=system:serviceaccount:proxy:topology-reader
```

### Network isolation (Phase 6)

- NetworkPolicy resources restrict inter-pod communication
- Section pods cannot reach each other or the proxy directly
- Only Traefik can initiate connections to section pods
- The proxy can only be reached via the IngressRoute at `/api/*`

### API server exposure

- The Kubernetes API server has no public NodePort or LoadBalancer
- Only the proxy Pod (inside the cluster) can call the API server
- The API server is not reachable from the internet

### Rate limiting

- `/api/topology` is rate-limited at the Traefik level (100 req/min per IP)

## Tech Stack

| Component | Technology | Why |
|-----------|-----------|-----|
| Local cluster | k3d | Docker-native, fast setup, easy multi-node |
| Production cluster | k3s | Lightweight, single binary, perfect for VPS |
| Ingress | Traefik (k3s built-in) | Lightweight, ships with k3s/k3d, IngressRoute CRDs |
| TLS | cert-manager + Let's Encrypt | Automated certificate management |
| Cluster proxy | Go + client-go | Tiny binary, native K8s library, low memory |
| About section | Nginx + HTML | Static content, no runtime needed |
| Projects section | Node/Express | GitHub API integration, caching |
| Blog section | Node/Express + Markdown | Server-rendered markdown posts |
| Contact section | Node/Express | Form handling, stdout logging |
| Frontend | React + Vite + React Flow | Topology graph, portfolio shell |

## Repository Structure

```
k8s-portfolio/
├── README.md
├── k3d-config.yaml                 ← Local cluster definition
├── manifests/
│   ├── namespaces.yaml             ← All namespace declarations
│   ├── cross-namespace-services.yaml ← ExternalName services for Ingress routing
│   ├── ingress.yaml                ← Traefik IngressRoute + Middleware routing rules
│   ├── about/                      ← About section K8s resources
│   ├── projects/                   ← Projects section K8s resources
│   ├── blog/                       ← Blog section K8s resources
│   ├── contact/                    ← Contact section K8s resources
│   ├── proxy/                      ← Proxy RBAC + deployment
│   ├── frontend/                   ← Frontend deployment
│   └── network-policies/           ← NetworkPolicy resources (Phase 6)
├── services/
│   ├── about/                      ← Dockerfile + static HTML
│   ├── projects/                   ← Dockerfile + Node service
│   ├── blog/                       ← Dockerfile + Node service + posts/
│   ├── contact/                    ← Dockerfile + Node service
│   ├── proxy/                      ← Dockerfile + Go binary
│   └── frontend/                   ← Dockerfile + React app
└── scripts/
    ├── local-up.sh                 ← Start everything locally
    └── local-down.sh               ← Tear down everything
```
