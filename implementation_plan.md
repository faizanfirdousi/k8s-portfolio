# Portfolio Reimagined: "My Portfolio Is a Kubernetes Cluster"

## Summary

The existing portfolio already has solid foundations: correct API hooks (`useTopology`, `useEvents`, `usePodDetail`), a three-column dashboard layout, a 2D cluster architecture diagram, and a pod detail drawer. The backend is untouched.

The redesign replaces the 2D `ClusterArchitecture` SVG diagram with a **real 3D Three.js / React Three Fiber scene** (borrowed from `k3s-observatory`), integrates the **3D force graph visual vocabulary** of `kube-universe`, and elevates every panel with the cinematic dark-infrastructure aesthetic described in the brief.

Key constraint: the portfolio currently has **no Three.js / R3F dependency**. We will install `@react-three/fiber`, `@react-three/drei`, and `three` (matching the versions already present in `k3s-observatory`), and add these as lazy-loaded components so the portfolio remains functional if WebGL is unavailable.

---

## What Changes (and What Doesn't)

| Layer | Change |
|---|---|
| **Backend / APIs** | ❌ No change. All existing endpoints (`/api/topology`, `/api/events`, `/api/pods/:ns/:name`) are reused. |
| **Hooks** | ❌ No change. `useTopology`, `useEvents`, `usePodDetail` are untouched. |
| **Types** | ❌ No change. `topology.ts` types are reused. |
| **Header** | ✅ Revised: add view toggle (Cluster View / Table View), tighter design. |
| **Sidebar** | ✅ Revised: larger identity block, improved nav with status badges, terminal `kubectl get pods` line. |
| **MainContent** | ✅ Replaced: the hero + 2D diagram area becomes the new 3D cluster scene (default) or table view. |
| **ClusterArchitecture** | 🔄 Replaced by new `ClusterScene3D` component (3D). The old 2D arch is kept as the "Table View" fallback. |
| **MetricsPanel** | ✅ Revised: add live activity feed (HTTP request style), add request particle trigger on events, improve visual hierarchy. |
| **PodDetailDrawer** | ✅ Revised: add "Open Page" action button for portfolio sections, improve design. |
| **index.css** | ✅ Major update: richer design tokens, glow effects, connection line animations, particle keyframes, pod-detail panel styles. |
| **New: ClusterScene3D** | 🆕 Three.js/R3F scene with: central `k8s.dev` deployment node, 6 orbiting pod nodes (`/`, `/about`, `/projects`, `/skills`, `/blog`, `/contact`), connection lines with animated particles, hover/select states, camera transitions, idle float animation, live K8s pods overlay. |
| **New: NodeInfoPanel** | 🆕 Compact floating info panel that appears when a cluster node is clicked (status, metrics, open-page CTA). |
| **New: RequestParticle** | 🆕 CSS animation element that fires a request "packet" across the topology when a route is navigated. |
| **New: LiveActivityFeed** | 🆕 Updated MetricsPanel section showing recent HTTP requests in `GET /about 200 182ms` format. |
| **New: TerminalWidget** | 🆕 Small terminal-style widget with `$ whoami` output and simulated kubectl auto-complete. |

---

## Architecture

```
App.tsx (unchanged structure)
├── Header (revised)
├── MobileNav (unchanged)
├── dash-body
│   ├── Sidebar (revised: identity + kubectl line)
│   ├── MainContent (revised)
│   │   ├── [view=cluster] → ClusterScene3D (new, lazy)
│   │   │   ├── Three.js Canvas (R3F)
│   │   │   │   ├── CentralNode (k8s.dev / portfolio)
│   │   │   │   ├── PortfolioNode × 6 (pods/pages)
│   │   │   │   ├── ConnectionLines (with particle animation)
│   │   │   │   └── OrbitControls + lighting
│   │   │   └── NodeInfoPanel (floating overlay, selected node)
│   │   └── [view=table] → ClusterArchitecture (existing 2D, improved)
│   └── MetricsPanel (revised)
│       ├── ClusterDetails (from /api/topology)
│       ├── LiveActivityFeed (new style)
│       └── KubectlTerminal (revised, shows pods table)
└── PodDetailDrawer (revised)
```

---

## Open Questions

> [!IMPORTANT]
> **Three.js version lock**: `k3s-observatory` uses `three@^0.172.0` and React 18. The portfolio uses React 19. We'll install the latest compatible Three.js / R3F (which supports React 19 with `@react-three/fiber@^9`). This is the only new dependency set added.

> [!NOTE]
> **Portfolio route nodes** (`/`, `/about`, `/projects`, `/skills`, `/blog`, `/contact`) are portfolio _pages_ running as pods, not the actual Kubernetes pods (which have names like `frontend-pod-abc123`). The 3D scene represents these as "portfolio service nodes", while the MetricsPanel still shows the real K8s pods from `/api/topology`. Both are clearly distinguished visually.

> [!NOTE]
> **Live HTTP metrics** (response time, request count per route) — the existing backend provides Kubernetes events and pod data, not HTTP request logs. The live activity feed will show K8s events (as currently), styled in an HTTP-log aesthetic (`GET /about 200 182ms`). If the backend has no route-level metrics, we'll display K8s events with the matching visual treatment.

---

## Proposed Changes

### Dependencies

#### [MODIFY] [package.json](file:///home/faizan/crazy-portfolio/k8s_portfolio/services/frontend/package.json)
Add: `@react-three/fiber`, `@react-three/drei`, `three`, `@types/three`

---

### Core Design System

#### [MODIFY] [index.css](file:///home/faizan/crazy-portfolio/k8s_portfolio/services/frontend/src/index.css)
- Enhanced design tokens (deeper navy, refined glow palette)
- New utility classes: `.pod-running`, `.pod-idle`, `.pod-error`, `.glow-ring`, `.particle-trail`
- Orbital animation keyframes
- Node info panel styles
- Live activity feed styles (HTTP log aesthetic)
- Improved drawer styles
- Responsive 3D container sizing

---

### Components

#### [MODIFY] [Header.tsx](file:///home/faizan/crazy-portfolio/k8s_portfolio/services/frontend/src/components/Header.tsx)
- Add `view` / `onViewChange` props for Cluster/Table toggle
- Improve cluster status badge
- Add "Live Cluster" indicator

#### [MODIFY] [Sidebar.tsx](file:///home/faizan/crazy-portfolio/k8s_portfolio/services/frontend/src/components/Sidebar.tsx)
- Larger identity block with proper avatar styling
- Nav items show pod status dots (green/grey) from live topology data
- Terminal line: `> kubectl get pods --all-namespaces`
- Social links improved

#### [MODIFY] [MainContent.tsx](file:///home/faizan/crazy-portfolio/k8s_portfolio/services/frontend/src/components/MainContent.tsx)
- Hero section: personal identity text above the 3D scene
- View toggle: cluster vs. table
- Passes `view` state to parent / uses internally
- Lazy-loads `ClusterScene3D`

#### [NEW] [ClusterScene3D.tsx](file:///home/faizan/crazy-portfolio/k8s_portfolio/services/frontend/src/components/ClusterScene3D.tsx)
- React Three Fiber `<Canvas>` component
- `CentralNode`: glowing icosahedron at origin, label "k8s.dev / portfolio"
- `PortfolioNode` × 6: boxes/cubes for each portfolio section, orbiting in 3D at varied heights
- `ConnectionLines`: thin `<Line>` meshes with animated dash particles
- `OrbitControls` with autoRotate (slow, subtle)
- `hover`: scale + glow increase
- `select`: camera fly-to + NodeInfoPanel opens
- `idle`: gentle float animation per node (phase offset)
- `Particles`: ambient star-field (low count, 200-300)
- WebGL fallback: if canvas fails, renders the 2D ClusterArchitecture

#### [NEW] [NodeInfoPanel.tsx](file:///home/faizan/crazy-portfolio/k8s_portfolio/services/frontend/src/components/NodeInfoPanel.tsx)
- Floating overlay panel (positioned bottom-center of scene)
- Shows: route, status badge, pod data from topology (if matched), last-accessed time
- CTA: `[ Open /about ]` button → navigates to portfolio page
- Closes on click-outside or Escape

#### [MODIFY] [MetricsPanel.tsx](file:///home/faizan/crazy-portfolio/k8s_portfolio/services/frontend/src/components/MetricsPanel.tsx)
- ClusterDetails section: improved visual hierarchy, `clusterVersion` shown prominently
- Live Activity: HTTP log aesthetic with monospace, colored status dots
- kubectl pod table: kept, improved styling with better column fit
- Add legend section

#### [MODIFY] [PodDetailDrawer.tsx](file:///home/faizan/crazy-portfolio/k8s_portfolio/services/frontend/src/components/PodDetailDrawer.tsx)
- Redesigned layout with richer header
- "Open Page" action button for portfolio namespaces (about, projects, blog, contact)
- Resources section visual bars (like k3s-observatory)
- Container status with color-coded badges

#### [MODIFY] [App.tsx](file:///home/faizan/crazy-portfolio/k8s_portfolio/services/frontend/src/App.tsx)
- Add `view` state (`'cluster' | 'table'`)
- Pass `view`/`setView` to Header and MainContent

---

## Visual Design Highlights

- **Background**: `#070b14` deep navy, two radial purple/indigo glow blobs, subtle dot grid
- **Central node**: Glowing icosahedron with indigo emission, "k8s.dev" label above
- **Portfolio nodes**: Colored boxes (one color per section), floating at staggered heights
- **Connection lines**: Semi-transparent, thin, with 3-5 animated particles per line (green dots)
- **Hover state**: Node scales 1.2×, glow intensifies, route label appears
- **Selected state**: Camera smoothly flies toward node, `NodeInfoPanel` slides in
- **Idle animation**: Each node has a gentle sine-wave bob, phase-offset so they feel alive
- **Metrics panel**: Dark glass, monospace font, green/yellow/red status colors

---

## Verification Plan

### Automated
- `npm run build` — TypeScript compilation passes, no type errors

### Manual
1. Launch dev server: `npm run dev` (in the frontend directory)
2. Verify: 3D scene renders, nodes orbit, orbit controls work
3. Verify: hover → glow; click → camera transition + info panel
4. Verify: MetricsPanel updates from `/api/topology` poll
5. Verify: Table View toggle shows the 2D ClusterArchitecture
6. Verify: Pod drawer opens on table row click
7. Verify: Mobile layout collapses gracefully (no broken layout)
8. Verify: If WebGL unavailable (devtools override), 2D fallback renders
