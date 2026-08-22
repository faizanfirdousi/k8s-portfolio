# services/blog/Dockerfile
FROM node:20.18-alpine AS builder
WORKDIR /app
COPY blog/package*.json ./
RUN npm ci --omit=dev || npm install --omit=dev

FROM node:20.18-alpine
LABEL maintainer="Faizan Firdousi"
LABEL portfolio.section="blog"
WORKDIR /app
COPY --from=builder --chown=1000:1000 /app/node_modules ./node_modules
COPY --chown=1000:1000 blog/src/ ./src/
COPY --chown=1000:1000 shared/metrics-panel.js ./src/metrics-panel.js
COPY --chown=1000:1000 blog/package.json ./

USER 1000:1000

EXPOSE 3000
HEALTHCHECK --interval=10s --timeout=3s --start-period=5s \
  CMD wget -qO- http://localhost:3000/healthz || exit 1
CMD ["node", "src/index.js"]
