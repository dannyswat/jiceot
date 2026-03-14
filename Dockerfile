# Stage 1: Build Go application
FROM golang:1.24-alpine AS builder-go

WORKDIR /app/server

# Install build tools if necessary (e.g., git for private modules)
# RUN apk add --no-cache git

# Copy Go module files
COPY server/go.mod server/go.sum ./
# Ensure go.mod and go.sum are at the root of the 'server' directory in your project
# If they are in a subdirectory of 'server', adjust the COPY path accordingly.
RUN go mod download && go mod verify

COPY server/. .

RUN CGO_ENABLED=0 GOOS=linux go build -v -o /app/jiceot-server -ldflags="-s -w" ./cmd/api/main.go

# Stage 2: Build React client
FROM node:24-alpine AS builder-client

WORKDIR /app/client2

COPY client2/package.json client2/package-lock.json* ./

RUN npm install

COPY client2/. .

RUN npm run build:docker

# Stage 3: Final image
FROM alpine:latest

RUN apk add --no-cache ca-certificates postgresql-client

# Create a non-root user for security
RUN addgroup -g 1001 -S jiceot && \
    adduser -S jiceot -u 1001

WORKDIR /app

COPY --from=builder-go /app/jiceot-server .

COPY --from=builder-client /app/client2/dist ./client

# Create necessary directories and set permissions
RUN mkdir -p data && \
    chown -R jiceot:jiceot /app

# Switch to non-root user
USER jiceot

# Expose the port
EXPOSE 8080

# Set environment variables
ENV PORT=8080
ENV DATABASE_URL=postgres://jiceot:jiceot@postgres:5432/jiceot?sslmode=disable
ENV JWT_EXPIRY=24h

# Start the application
CMD ["./jiceot-server"]
