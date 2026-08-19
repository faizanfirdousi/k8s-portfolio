# services/proxy/Dockerfile
FROM golang:1.22-alpine AS builder

RUN apk add --no-cache git ca-certificates

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY main.go ./

RUN CGO_ENABLED=0 go build -ldflags="-s -w" -o proxy .

FROM gcr.io/distroless/static:nonroot

LABEL maintainer="Faizan Firdousi"
LABEL portfolio.section="proxy"

COPY --from=builder /app/proxy /proxy
COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/

USER 65532:65532

EXPOSE 8080

ENTRYPOINT ["/proxy"]
