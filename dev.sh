#!/bin/bash

# Don't exit on error - we want to handle errors gracefully
set +e

echo "Starting Breeze in development mode..."

# Function to check Docker availability
check_docker() {
    # First try the default socket
    if docker info > /dev/null 2>&1; then
        return 0
    fi

    # Check if Docker Desktop is running but socket is mismatched
    if [ -f "/Applications/Docker.app" ]; then
        echo "Docker Desktop is installed but may not be running."
        echo "Please ensure Docker Desktop is running and try again."
        exit 1
    fi

    # Check alternative socket locations
    if [ -S "$HOME/.docker/run/docker.sock" ]; then
        export DOCKER_HOST="unix://$HOME/.docker/run/docker.sock"
    elif [ -S "/var/run/docker.sock" ]; then
        export DOCKER_HOST="unix:///var/run/docker.sock"
    fi

    # Try again with potentially updated socket
    if docker info > /dev/null 2>&1; then
        return 0
    fi

    echo "Error: Cannot connect to Docker daemon."
    echo "Please ensure Docker Desktop is running and try again."
    echo "If the problem persists, try these steps:"
    echo "1. Open Docker Desktop"
    echo "2. Wait for it to fully start"
    echo "3. Run this script again"
    exit 1
}

# Function for robust cleanup
cleanup_containers() {
    echo "Performing thorough cleanup..."
    
    # Try compose down first
    docker compose down 2>/dev/null || true
    
    # If compose down fails, try direct container removal
    project_name=$(basename "$(pwd)" | tr '[:upper:]' '[:lower:]')
    
    # Find and stop containers
    containers=$(docker ps -a --filter "name=${project_name}" -q)
    if [ ! -z "$containers" ]; then
        echo "Stopping containers..."
        docker stop $containers 2>/dev/null || true
        echo "Removing containers..."
        docker rm -f $containers 2>/dev/null || true
    fi
    
    # Remove project networks
    networks=$(docker network ls --filter "name=${project_name}" -q)
    if [ ! -z "$networks" ]; then
        echo "Removing networks..."
        docker network rm $networks 2>/dev/null || true
    fi
    
    # Remove project volumes
    volumes=$(docker volume ls --filter "name=${project_name}" -q)
    if [ ! -z "$volumes" ]; then
        echo "Removing volumes..."
        docker volume rm $volumes 2>/dev/null || true
    fi
    
    echo "Cleanup complete"
}

# Function to check if a port is in use
check_port() {
    local port=$1
    if lsof -i :$port > /dev/null 2>&1; then
        echo "Port $port is already in use."
        echo "Would you like to kill the process using port $port? (y/n)"
        read -r response
        if [[ "$response" =~ ^[Yy]$ ]]; then
            echo "Killing process on port $port..."
            lsof -ti :$port | xargs kill -9 2>/dev/null
            sleep 2
        else
            echo "Port $port must be free to continue. Please free up the port and try again."
            exit 1
        fi
    fi
}

# Add cleanup on script exit
trap cleanup_containers EXIT

# Check Docker availability
echo "Checking Docker availability..."
check_docker

# Check if required ports are available
echo "Checking if required ports are available..."
check_port 3000
check_port 5001

# Clean up any existing containers
echo "Cleaning up existing containers..."
cleanup_containers

# Build and start services
echo "Building and starting services..."
if ! docker compose up --build; then
    echo "Error: Failed to start services. Check the error message above."
    exit 1
fi