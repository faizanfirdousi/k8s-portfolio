# services/blog/Dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install --only=production

FROM node:20-alpine
LABEL maintainer="Faizan Firdousi"
LABEL portfolio.section="blog"
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY src/ ./src/
# Bake the markdown posts into the image (they're static files committed to the repo)
COPY posts/ ./posts/
COPY package.json ./
USER node
EXPOSE 3000
HEALTHCHECK --interval=10s --timeout=3s --start-period=5s \
  CMD wget -qO- http://localhost:3000/healthz || exit 1
CMD ["node", "src/index.js"]
