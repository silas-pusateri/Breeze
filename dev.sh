#!/bin/bash
# Clean up any existing containers
docker compose down

# Remove all images to ensure fresh build
docker compose down --rmi all

# Build and start services in detached mode
docker compose up -d --build

# Show logs
docker compose logs -f 