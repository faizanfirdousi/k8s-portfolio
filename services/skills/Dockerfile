# services/skills/Dockerfile
FROM nginx:alpine

LABEL maintainer="Faizan Firdousi"
LABEL portfolio.section="skills"

COPY content/ /usr/share/nginx/html/
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
RUN echo "ok" > /usr/share/nginx/html/healthz
