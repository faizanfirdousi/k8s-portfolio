---
title: "Why Your Portfolio Should Run on Kubernetes (And How This One Does)"
date: "2024-01-15"
excerpt: "Most Kubernetes portfolios show diagrams. This one runs on an actual cluster. Here's how and why."
tags: ["kubernetes", "devops", "portfolio"]
---

# Why Your Portfolio Should Run on Kubernetes

Most DevOps portfolios prove Kubernetes knowledge with a diagram. "Here's a box
labeled 'cluster' with arrows pointing to boxes labeled 'pods.'" Anyone can draw that.

This portfolio is different. Every page you visit is a real Pod. The topology graph
you see isn't a mockup — it's live data from the Kubernetes API.

## The Architecture

```
Browser → Traefik → Service → Pod
```

When you clicked "Blog" just now, this actually happened:

1. Your browser sent `GET /blog` to the Traefik ingress controller
2. Traefik matched the `/blog` path rule, stripped the prefix, and forwarded the request
3. The request hit the `blog` Service in the `blog` namespace
4. The Service selected this `blog-*` Pod via label selector
5. This Node.js process rendered the Markdown you're reading right now

You can verify this yourself if you have cluster access:

```bash
kubectl get pods -n blog
# NAME                    READY   STATUS    RESTARTS   AGE
# blog-7c9f4d-xk2p1       1/1     Running   0          10m
```

## Why This Matters

A portfolio that runs on the infrastructure it claims to know is a much stronger
signal than one that just talks about it. It shows:

- You can actually set up a cluster (not just describe one)
- You understand ingress routing (not just a textbook definition)
- You care about operational details (health checks, resource limits, RBAC)

## The Tricky Parts

**Nodes are cluster-scoped.** When I wrote the RBAC for the cluster-read proxy,
I initially tried a namespace-scoped `Role` with access to `nodes`. That fails.
Nodes exist outside namespaces. You need a `ClusterRole` for nodes even if you
scope everything else to a namespace.

**k3d image loading.** When running locally, your cluster can't pull from your
local Docker daemon. You have to explicitly import images: `k3d image import`.

**Path stripping with Traefik.** The IngressRoute routes `/about` → the about Service.
Traefik's StripPrefix middleware removes `/about` before forwarding, so the container
receives `/` — not `/about`. The nginx.conf serves at `location /` accordingly.

These are exactly the kinds of details that separate someone who has *run* a
cluster from someone who has only *read* about one.
