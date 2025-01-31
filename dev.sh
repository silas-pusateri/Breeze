#!/bin/bash

# Don't exit on error - we want to handle errors gracefully
set +e

echo "Starting Breeze in development mode..."

# Move the function definition to the top of the file, after the shebang
wait_for_supabase() {
    echo "Waiting for Supabase to be ready..."
    max_attempts=30
    attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s http://localhost:54321/rest/v1/ > /dev/null; then
            echo "Supabase is ready!"
            return 0
        fi
        echo "Attempt $attempt of $max_attempts: Supabase not ready yet..."
        sleep 5
        attempt=$((attempt + 1))
    done
    
    echo "Error: Supabase failed to start after $max_attempts attempts"
    return 1
}

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

# Function to generate Supabase Docker configuration
generate_supabase_config() {
    echo "Generating Supabase configuration..."
    
    # Only run init if the project hasn't been initialized
    if [ ! -f ".supabase/config.toml" ]; then
        supabase init
    fi
    
    # Start Supabase with the correct flags
    supabase start
}

# Modified cleanup function to handle all containers
cleanup_containers() {
    echo "Cleaning up existing containers..."
    
    # Get project name for filtering
    project_name=$(basename "$(pwd)" | tr '[:upper:]' '[:lower:]')
    
    # Stop application containers
    docker compose down || true
    # Stop Supabase using CLI
    supabase stop || true
    
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

# Generate Supabase configuration
generate_supabase_config

# Clean up any existing containers
cleanup_containers

# Create a combined network for all containers
docker network create breeze_network 2>/dev/null || true

# Start Supabase containers first
echo "Starting Supabase services..."
if [ -f ".supabase/docker/docker-compose.yml" ]; then
    docker compose -f .supabase/docker/docker-compose.yml up -d
else
    echo "Error: Supabase docker-compose.yml not found. Running supabase start to generate it..."
    supabase start
fi

# Wait for Supabase to be ready
wait_for_supabase

if [ $? -ne 0 ]; then
    echo "Failed to start Supabase. Check the logs with 'docker compose logs supabase'"
    exit 1
fi

# Get and export Supabase credentials
SUPABASE_LOCAL_URL="http://localhost:54321"
# Extract keys from supabase status output
SUPABASE_STATUS=$(supabase status)
SUPABASE_LOCAL_ANON_KEY=$(echo "$SUPABASE_STATUS" | grep "anon key:" | tail -n1 | awk '{print $3}')
SUPABASE_LOCAL_SERVICE_KEY=$(echo "$SUPABASE_STATUS" | grep "service_role key:" | tail -n1 | awk '{print $3}')

# Update .env file
if [ ! -f .env ]; then
    cp .env.example .env
fi

# Update environment variables
sed -i.bak '/SUPABASE_LOCAL_URL/d' .env
sed -i.bak '/SUPABASE_LOCAL_ANON_KEY/d' .env
sed -i.bak '/SUPABASE_LOCAL_SERVICE_KEY/d' .env
sed -i.bak '/IS_LOCAL/d' .env

echo "SUPABASE_LOCAL_URL=$SUPABASE_LOCAL_URL" >> .env
echo "SUPABASE_LOCAL_ANON_KEY=$SUPABASE_LOCAL_ANON_KEY" >> .env
echo "SUPABASE_LOCAL_SERVICE_KEY=$SUPABASE_LOCAL_SERVICE_KEY" >> .env
echo "IS_LOCAL=true" >> .env

rm -f .env.bak

# Start application containers
echo "Starting application services..."
if ! docker compose up --build; then
    echo "Error: Failed to start services. Check the error message above."
    exit 1
fi