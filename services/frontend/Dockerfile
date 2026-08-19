# services/frontend/Dockerfile
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:1.27-alpine
LABEL maintainer="Faizan Firdousi"
LABEL portfolio.section="frontend"

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

# Configure Nginx for unprivileged non-root execution
RUN sed -i 's|pid\s*/run/nginx.pid;|pid /tmp/nginx.pid;|g' /etc/nginx/nginx.conf && \
    sed -i 's|error_log.*|error_log /dev/stderr notice;|g' /etc/nginx/nginx.conf && \
    sed -i 's|access_log.*|access_log /dev/stdout main;|g' /etc/nginx/nginx.conf && \
    sed -i '/http {/a \    client_body_temp_path /tmp/client_temp;\n    proxy_temp_path /tmp/proxy_temp_path;\n    fastcgi_temp_path /tmp/fastcgi_temp;\n    uwsgi_temp_path /tmp/uwsgi_temp;\n    scgi_temp_path /tmp/scgi_temp;' /etc/nginx/nginx.conf && \
    echo "ok" > /usr/share/nginx/html/healthz && \
    chown -R 101:101 /usr/share/nginx/html /etc/nginx /tmp

USER 101:101

EXPOSE 8080
