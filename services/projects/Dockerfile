# services/projects/Dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY projects/package*.json ./
RUN npm install --only=production

FROM node:20-alpine
LABEL maintainer="Faizan Firdousi"
LABEL portfolio.section="projects"
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY shared/metrics-panel.js ./src/metrics-panel.js
COPY projects/src/ ./src/
COPY projects/package.json ./
USER node
EXPOSE 3000
HEALTHCHECK --interval=10s --timeout=3s --start-period=5s \
  CMD wget -qO- http://localhost:3000/healthz || exit 1
CMD ["node", "src/index.js"]
