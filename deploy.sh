#!/bin/bash

# Exit on any error
set -e

echo "Starting Breeze deployment in production mode..."

# Function to get public IP using different methods
get_public_ip() {
    # Try EC2 metadata service v2
    TOKEN=$(curl -X PUT "http://169.254.169.254/latest/api/token" -H "X-aws-ec2-metadata-token-ttl-seconds: 21600" 2>/dev/null) || true
    if [ ! -z "$TOKEN" ]; then
        IP=$(curl -H "X-aws-ec2-metadata-token: $TOKEN" http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null)
        if [ ! -z "$IP" ]; then
            echo "$IP"
            return 0
        fi
    fi

    # Try EC2 metadata service v1
    IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null)
    if [ ! -z "$IP" ]; then
        echo "$IP"
        return 0
    fi

    # Try external IP lookup service as fallback
    IP=$(curl -s https://api.ipify.org 2>/dev/null)
    if [ ! -z "$IP" ]; then
        echo "$IP"
        return 0
    fi

    return 1
}

# Get the instance's public IP
echo "Detecting public IP..."
EC2_PUBLIC_IP=$(get_public_ip)
if [ -z "$EC2_PUBLIC_IP" ]; then
    echo "Error: Could not detect public IP. Please provide it manually:"
    read -p "Enter public IP: " EC2_PUBLIC_IP
    if [ -z "$EC2_PUBLIC_IP" ]; then
        echo "No IP provided. Exiting."
        exit 1
    fi
fi

echo "Using public IP: $EC2_PUBLIC_IP"

# Ensure required files exist
if [ ! -f "docker-compose.prod.yml" ]; then
    echo "Error: docker-compose.prod.yml not found!"
    exit 1
fi

if [ ! -f ".env" ]; then
    echo "Error: .env file not found!"
    echo "Please create .env with required environment variables:"
    echo "SUPABASE_URL=your_supabase_url"
    echo "SUPABASE_KEY=your_supabase_key"
    exit 1
fi

# Export environment variables
export EC2_PUBLIC_IP

# Stop any running containers
echo "Stopping existing containers..."
docker compose -f docker-compose.prod.yml down

# Build and start containers
echo "Building and starting containers in production mode..."
docker compose -f docker-compose.prod.yml up --build -d

# Show status
echo "Checking container status..."
docker compose -f docker-compose.prod.yml ps

echo "Deployment complete!"
echo "Frontend: http://$EC2_PUBLIC_IP"
echo "Backend: http://$EC2_PUBLIC_IP:5001"
echo ""
echo "To view logs, run: docker compose -f docker-compose.prod.yml logs -f" 