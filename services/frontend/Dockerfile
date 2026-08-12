# services/frontend/Dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
LABEL maintainer="Faizan Firdousi"
LABEL portfolio.section="frontend"

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built react app
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80
