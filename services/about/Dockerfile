# services/about/Dockerfile
#
# Strategy: Use multi-stage build even though this is just static HTML.
# Why? It's a good habit that pays off when services become more complex.
# For now it's effectively a single stage.
#
# Base image: nginx:alpine
#   - nginx: industry-standard web server, perfect for serving static files
#   - alpine: minimal Linux (≈5MB) — keeps the image tiny, reduces attack surface

FROM nginx:alpine

# LABEL adds metadata to the image — useful for auditing/debugging
LABEL maintainer="Faizan Firdousi"
LABEL portfolio.section="about"

# Copy our static HTML files into Nginx's default serving directory.
# Nginx will serve anything in /usr/share/nginx/html.
# The trailing slash on the destination ensures the directory is created correctly.
COPY content/ /usr/share/nginx/html/

# Copy a custom Nginx configuration.
# The default nginx.conf doesn't understand that we're serving under the /about path prefix,
# so we provide our own minimal config.
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Port 80 is what Nginx listens on inside the container.
# Kubernetes Services will route traffic to this port.
# EXPOSE is documentation — it doesn't actually open the port; that's done in the K8s Service.
EXPOSE 80

# The healthz endpoint is a simple HTML file that returns 200 OK.
# Kubernetes uses this to check if the Pod is alive (liveness probe)
# and ready to receive traffic (readiness probe).
# We create it here directly in the Dockerfile to keep it simple.
RUN echo "ok" > /usr/share/nginx/html/healthz
