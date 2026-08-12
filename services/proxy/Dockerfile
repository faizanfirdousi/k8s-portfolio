# services/proxy/Dockerfile
#
# Multi-stage build for the Go proxy.
# This is where Go really shines: the final binary is a single static file
# with NO external dependencies — we can run it in a "scratch" or "distroless" image.
#
# Stage 1: Build the Go binary
# Stage 2: Run the binary in a minimal image (no Go toolchain, no shell)

# Stage 1: Build
FROM golang:1.22-alpine AS builder

# Install git (needed for go mod download to fetch from GitHub)
RUN apk add --no-cache git ca-certificates

WORKDIR /app

# Copy go.mod and go.sum first for layer caching
# If these don't change, Docker skips the `go mod download` step
COPY go.mod go.sum ./
RUN go mod download

# Copy source code and build
COPY main.go ./

# CGO_ENABLED=0: build a statically linked binary (no C library dependencies)
# GOOS=linux GOARCH=amd64: target Linux x86-64 (the k3d node OS/arch)
# -ldflags "-s -w": strip debug info and symbol table → smaller binary
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 \
    go build -ldflags="-s -w" -o proxy .

# Stage 2: Minimal runtime image
# We use "distroless" — a Google-maintained image with ONLY the OS-level basics.
# No shell, no package manager, no tools. Smallest possible attack surface.
# If an attacker compromises the proxy container, they can't do much without a shell.
FROM gcr.io/distroless/static:nonroot

LABEL maintainer="Faizan Firdousi"
LABEL portfolio.section="proxy"

# Copy the compiled binary from the builder stage
COPY --from=builder /app/proxy /proxy

# Copy CA certificates from builder (needed for HTTPS calls, though we don't make any here)
COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/

# Run as non-root user (distroless:nonroot sets this up for us)
USER nonroot:nonroot

EXPOSE 8080

# Just run the binary — no shell, no entrypoint script
ENTRYPOINT ["/proxy"]
