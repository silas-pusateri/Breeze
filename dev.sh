#!/bin/bash

# Don't exit on error - we want to handle errors gracefully
set +e

echo "Starting Breeze in development mode..."

# Function to check Docker availability
check_docker() {
    if ! docker info > /dev/null 2>&1; then
        if [ -f "/Applications/Docker.app" ]; then
            echo "Docker Desktop is installed but may not be running."
            echo "Please ensure Docker Desktop is running and try again."
            exit 1
        fi
        
        echo "Error: Cannot connect to Docker daemon."
        echo "Please ensure Docker Desktop is running and try again."
        echo "If the problem persists, try these steps:"
        echo "1. Open Docker Desktop"
        echo "2. Wait for it to fully start"
        echo "3. Run this script again"
        exit 1
    fi
}

# Function for robust cleanup
cleanup_containers() {
    echo "Cleaning up existing containers..."
    
    # Get project name for filtering
    project_name=$(basename "$(pwd)" | tr '[:upper:]' '[:lower:]')
    
    # Try compose down with background process and timer
    docker compose down &
    compose_pid=$!
    
    # Wait for compose down to finish or kill after 10 seconds
    for i in {1..10}; do
        if ! kill -0 $compose_pid 2>/dev/null; then
            break
        fi
        sleep 1
    done
    
    # If compose down is still running, kill it
    if kill -0 $compose_pid 2>/dev/null; then
        kill $compose_pid 2>/dev/null || true
    fi
    
    # If containers still exist, force remove them
    containers=$(docker ps -a --filter "name=${project_name}" -q)
    if [ ! -z "$containers" ]; then
        echo "Force stopping remaining containers..."
        docker stop $containers 2>/dev/null || true
        docker rm -f $containers 2>/dev/null || true
    fi
    
    # Clean up any dangling resources
    echo "Cleaning up project resources..."
    docker network prune -f --filter "name=${project_name}" 2>/dev/null || true
    docker volume prune -f --filter "name=${project_name}" 2>/dev/null || true
    
    echo "Cleanup complete"
}

# Ensure cleanup runs on script exit
trap cleanup_containers EXIT

# Check Docker availability
echo "Checking Docker availability..."
check_docker

# Clean up any existing containers
cleanup_containers

# Build and start services
echo "Building and starting services..."
if ! docker compose up --build; then
    echo "Error: Failed to start services. Check the error message above."
    exit 1
fi