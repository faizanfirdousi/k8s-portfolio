# services/projects/Dockerfile
#
# Multi-stage build for the Node.js projects service.
#
# STAGE 1 (builder): Install all npm dependencies
# STAGE 2 (runner): Copy only what's needed — no dev tooling in the final image
#
# Why multi-stage?
#   npm install pulls in a LOT of files (node_modules).
#   Some of those are build tools only needed at install time.
#   By using two stages, the final image only contains runtime code.
#   Smaller image = faster pulls, smaller attack surface.

# Stage 1: Install dependencies
# We use node:20-alpine (Alpine Linux = tiny base image)
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files FIRST, then install dependencies.
# WHY this order? Docker layer caching.
# If only your source code changes (not package.json), Docker skips the
# `npm install` layer and uses the cached node_modules. Builds are much faster.
COPY package*.json ./
RUN npm install --only=production
# `npm ci` (clean install) is preferred over `npm install` in Dockerfiles:
#   - Installs EXACTLY what's in package-lock.json (reproducible)
#   - Fails if package-lock.json is missing
#   - Faster than npm install for clean environments

# Stage 2: Final runtime image
FROM node:20-alpine

LABEL maintainer="Faizan Firdousi"
LABEL portfolio.section="projects"

WORKDIR /app

# Copy node_modules from the builder stage (not from your local machine!)
COPY --from=builder /app/node_modules ./node_modules

# Copy the application source code
COPY src/ ./src/
COPY package.json ./

# Run as a non-root user for security.
# The node:alpine image has a built-in "node" user (UID 1000).
# Running as root inside a container is a security risk.
USER node

EXPOSE 3000

# Health check at Docker level (separate from K8s probes, but useful for debugging)
HEALTHCHECK --interval=10s --timeout=3s --start-period=5s \
  CMD wget -qO- http://localhost:3000/healthz || exit 1

# Start the application
CMD ["node", "src/index.js"]
