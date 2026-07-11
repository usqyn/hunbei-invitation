#!/bin/bash
set -e

echo "=== 婚贝请柬部署脚本 ==="

# Check if .env.docker exists
if [ ! -f .env.docker ]; then
  echo "ERROR: .env.docker not found. Please copy .env.docker.example to .env.docker and fill in the values."
  exit 1
fi

# Build admin panel
echo ">>> Building admin panel..."
cd admin && npm ci && npm run build && cd ..

# Build and start server
echo ">>> Building and starting Docker containers..."
docker compose --env-file .env.docker build
docker compose --env-file .env.docker up -d

# Wait for health check
echo ">>> Waiting for server to be healthy..."
sleep 5
for i in $(seq 1 30); do
  if curl -sf http://localhost:3001/api/health > /dev/null 2>&1; then
    echo "✓ Server is healthy!"
    docker compose ps
    exit 0
  fi
  echo "  Waiting... ($i/30)"
  sleep 2
done

echo "ERROR: Server health check failed!"
docker compose logs --tail=50 server
exit 1
