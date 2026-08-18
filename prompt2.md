i want you to reimagine my portfolio website , and integrate @kube-universe 's visual and graph based thing and also some settings of @k3s-observatory as you like 

Redesign the existing portfolio frontend around the concept:

**"My portfolio is a Kubernetes cluster."**

The backend, Kubernetes integration, APIs, and existing functionality are already implemented. Do NOT rebuild or replace the backend. First inspect the existing codebase and understand the current API/data structures, then adapt the frontend to achieve the following experience.

## Core idea

The homepage should simultaneously be:

1. A personal portfolio homepage.
2. An interactive 3D Kubernetes-style cluster visualization.
3. A live observability dashboard for the portfolio itself.

The visitor should immediately understand:

> This is a portfolio that is presented as a Kubernetes cluster.

The 3D visualization should not feel like a separate demo placed next to the portfolio. It should BE the primary visual representation of the portfolio.

## Visual direction

Use a sophisticated dark infrastructure/observability aesthetic.

Think:

* Kubernetes observability
* cloud infrastructure
* futuristic developer tooling
* terminal interfaces
* subtle neon/glow
* dark navy/black background
* restrained purple/blue/green accents
* thin connection lines
* floating 3D objects
* subtle particles
* smooth camera movement
* professional rather than "gaming"

Avoid excessive gradients, excessive animations, giant text, or visual clutter.

The existing portfolio's visual identity should be preserved where appropriate, but the homepage should feel substantially more intentional and cohesive.

## Homepage concept

The center of the screen should contain the interactive 3D cluster.

At the center is the portfolio itself:

**k8s.dev / portfolio**

Around it are the major sections of the website represented as nodes/pods:

* `/`
* `/about`
* `/projects`
* `/skills`
* `/blog`
* `/contact`

Visually communicate relationships between these nodes using connections.

The central object should feel like the "cluster/application", while the surrounding objects feel like services/pods/pages.

Do not make the scene a flat graph. Use actual 3D depth and spatial positioning.

## Personal identity

My identity should remain prominent.

Include something similar to:

> Hi, I'm Faizan
> Engineer. Problem Solver. Lifelong Learner.

The portfolio should communicate that I am a software/cloud/DevOps-oriented engineer without turning the homepage into a generic developer portfolio.

The Kubernetes visualization is the storytelling mechanism for my identity.

## Navigation

Keep navigation immediately understandable.

Possible structure:

Home / Cluster
About
Projects
Skills
Blog
Contact

The navigation can visually resemble Kubernetes/terminal concepts, but usability takes priority over gimmicks.

## 3D cluster

Use the existing 3D visualization implementation/library already present in the project if appropriate.

If the current implementation is based on Three.js / React Three Fiber / another existing visualization system, extend it rather than unnecessarily replacing it.

The visualization should have:

* smooth orbit controls
* zoom
* pan
* hover states
* object selection
* camera transitions
* subtle idle animation
* depth
* meaningful connections
* responsive behavior

Each portfolio route should be represented as a distinct 3D object.

Objects should have clear visual states:

Running → green

Recently accessed → temporary pulse

Error → red

Inactive → subdued

Do not constantly animate every object. Animation should communicate activity/state.

## The most important interaction

A visitor navigating the portfolio should feel like they are interacting with infrastructure.

For example, when `/about` is accessed:

A request particle should visually travel through the topology toward `/about`.

The `/about` node should briefly illuminate/pulse.

The live metrics should update.

The recent activity feed should show something like:

GET /about    200    182ms

Likewise for `/projects`, `/blog`, etc.

The exact implementation should use the existing backend/API rather than inventing fake data if real data is already available.

## Live metrics

Use the existing backend data wherever possible.

Display useful metrics such as:

* response time
* request count
* status
* uptime
* cluster/node/pod information
* recent requests
* activity/events

Make these metrics visually secondary to the 3D cluster.

The page should feel like an observability interface rather than a traditional analytics dashboard.

## Node interaction

Hovering over a node should reveal enough information to understand what it represents.

Clicking a node should:

* highlight it
* smoothly move/focus the camera toward it
* display a compact information panel
* show relevant metrics
* provide a clear action to open the corresponding portfolio page

For example:

`/projects`

Status: Running

Requests: ...
Latency: ...
Last accessed: ...

[ Open Projects ]

Do not make users understand Kubernetes terminology before they can navigate the site.

## Live activity

Include a compact live activity panel showing recent interactions/events.

Example:

LIVE ACTIVITY

● GET /
● GET /about
● GET /projects
● GET /blog

200    123ms
200    182ms
200    245ms
200    198ms

This should update from the existing backend data.

## Cluster information

Include a compact cluster information panel containing information that is actually available from the existing backend.

For example:

Kubernetes
v1.x

Nodes
5

Pods
12

Namespaces
6

Status
Healthy

Do not hardcode values that the backend already provides.

## Terminal element

Add a small terminal-style element somewhere in the interface:

`$ whoami`

followed by my identity.

Optionally provide a lightweight simulated `kubectl` interaction if the existing project architecture makes it easy.

This should be a UI interaction only, not arbitrary shell execution.

## Table / alternative view

If the current project already has a cluster/table view, preserve it and improve the relationship between the views.

Allow the user to switch between:

**Cluster View**

and

**Table View**

The 3D visualization is the default homepage experience.

## Performance

This is extremely important.

The 3D visualization must not destroy the actual performance of the portfolio.

Prioritize:

* lazy loading of 3D components
* efficient rendering
* reasonable particle counts
* instancing where appropriate
* avoiding unnecessary React re-renders
* responsive canvas sizing
* graceful degradation on low-end devices
* mobile fallback

The normal portfolio content must remain accessible even if WebGL is unavailable.

## Responsive design

Desktop should be the primary experience because the 3D visualization needs space.

On smaller screens, simplify the topology rather than trying to squeeze the desktop interface onto mobile.

Possible mobile layout:

Identity
↓
Cluster visualization
↓
Cluster status
↓
Selected node information
↓
Navigation

## Important design principle

Do NOT make this look like a Dribbble concept that happens to contain Kubernetes terminology.

It should feel like an actual developer's infrastructure dashboard that has been turned into a portfolio.

Every visual element should have a reason to exist.

The final experience should make someone think:

> "This person's portfolio is literally running like an observable Kubernetes system."

## Implementation approach

Before changing code:

1. Inspect the existing frontend architecture.
2. Identify the current 3D visualization implementation.
3. Identify the existing backend API/data structures.
4. Reuse the existing backend rather than creating mock APIs.
5. Identify existing components that can be retained.
6. Then redesign the frontend around this concept.

Do not rewrite working backend functionality.

Do not introduce unnecessary dependencies if the existing stack can achieve the result.

Focus primarily on improving:

* composition
* 3D topology
* interaction
* visual hierarchy
* animations
* information architecture
* connection between portfolio navigation and cluster visualization

The end result should feel like a polished, production-quality personal portfolio for a DevOps/cloud/software engineer, with the Kubernetes cluster metaphor being the central idea rather than a decorative gimmick.

