# Faizan Firdousi's K8s Portfolio

> A personal portfolio that doesn't just *run* on Kubernetes it *is* Kubernetes.

---

## About

Most portfolios are a single static site with a few pretty animations. I wanted mine to actually demonstrate the thing I'm good at, so instead of building a page *about* my infrastructure skills, I built a page that *is* my infrastructure.

Every section of this site - home, about, projects, blog, contact - is its own standalone microservice, deployed as a real Pod in a real Kubernetes cluster. Nothing here is a simulation or a mock diagram sitting next to the site for show.

The centerpiece is a live, interactive topology graph on the homepage. It doesn't render a static image of "here's roughly how my cluster looks" - it queries the Kubernetes API in real time and draws the actual, current state of the cluster: every Pod, Service, and Ingress route, as they exist *right now*. Scale a deployment, kill a pod, redeploy a service - watch the graph update live.

---

## How It Works

### Micro-frontends, but actually on Kubernetes

Instead of one monolithic frontend serving every route, each page of the site is its own deployment:

- Visit `/about` → Traefik routes you straight to a dedicated Nginx pod serving static HTML.
- Visit `/projects` → a Node/Express pod spins into action, fetching live stats from the GitHub API.
- Visit `/blog` → a separate Node/Express pod renders Markdown into blog posts on the fly.

Each route, each pod, each service — genuinely isolated, genuinely independent.

### Self-documenting infrastructure

The site quite literally shows you its own guts. The topology graph on the homepage isn't decorative - it's a live window into the cluster:

- If a pod crashes, you'll see it disappear.
- If something scales up, new nodes appear in the graph.
- If a deployment rolls out, you're watching real infrastructure change in real time, not a canned animation.

### The live cluster proxy

Powering the topology graph is a small Go service I wrote myself - a proxy that securely reads from the Kubernetes API (read-only) and exposes a clean topology endpoint for the frontend to consume. The React frontend, built with React Flow, takes that data and turns it into the interactive graph you see on screen.

---

## Architecture Flow

```text
Browser → Traefik Ingress → Service → Pod (per section)
                 ↓
          /api/topology → proxy Pod (Go) → Kubernetes API (read-only)
```

---

## Route Map

| Path | Namespace | Service | What it runs |
|------|-----------|---------|---------------|
| `/` | `frontend` | frontend | React app + live topology graph |
| `/about` | `about` | about | Nginx serving static HTML |
| `/projects` | `projects` | projects | Node/Express + GitHub API integration |
| `/blog` | `blog` | blog | Node/Express + Markdown renderer |
| `/contact` | `contact` | contact | Node/Express + contact form API |
| `/api/*` | `proxy` | proxy | Custom Go binary reading the K8s API |

---

## Tech Stack

- **Orchestration:** Kubernetes
- **Ingress:** Traefik
- **Frontend:** React + React Flow (for the live topology graph)
- **Backend services:** Node/Express, Nginx
- **Cluster proxy:** Go (custom-built, read-only K8s API access)
- **Content:** Markdown-driven blog rendering

---

## Why Build It This Way

Anyone can list "Kubernetes" on a resume. I wanted a portfolio that proves it instead of claiming it — where the infrastructure isn't a backstage detail but the whole point of the show. If it's live and you can watch it work, it's a lot harder to fake.

---

## Contact

Got questions about the architecture, or just want to talk Kubernetes? Reach out through the `/contact` page — yes, that one's a real pod too.