#!/bin/bash

# Exit on any error
set -e

# Get the instance's public IP automatically
EC2_PUBLIC_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)

echo "Starting deployment process..."
echo "Detected public IP: $EC2_PUBLIC_IP"

# Ensure we're in the correct directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
cd "$SCRIPT_DIR"

# Install Docker if not already installed
if ! command -v docker &> /dev/null; then
    echo "Installing Docker..."
    sudo yum update -y
    sudo yum install -y docker
    sudo service docker start
    sudo usermod -aG docker $USER
fi

# Install Docker Compose if not already installed
if ! command -v docker-compose &> /dev/null; then
    echo "Installing Docker Compose..."
    sudo curl -L "https://github.com/docker/compose/releases/download/v2.24.1/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
fi

# Create production environment file
echo "Setting up environment files..."
cat > .env.prod << EOL
EC2_PUBLIC_IP=$EC2_PUBLIC_IP
EOL

# Ensure .env file exists and has the required variables
if [ ! -f ".env" ]; then
    if [ -f "web/.env" ]; then
        cp web/.env .env
    else
        echo "Error: .env file not found!"
        echo "Please create .env with required environment variables:"
        echo "SUPABASE_URL=your_supabase_url"
        echo "SUPABASE_KEY=your_supabase_key"
        exit 1
    fi
fi

# Remove version from docker-compose.prod.yml if it exists
sed -i '/^version:/d' docker-compose.prod.yml

# Stop any running containers
echo "Stopping existing containers..."
docker-compose -f docker-compose.prod.yml down || true

# Build and start containers
echo "Building and starting containers..."
export EC2_PUBLIC_IP
docker-compose -f docker-compose.prod.yml up --build -d

# Clean up old images
echo "Cleaning up old images..."
docker image prune -f

# Check container status
echo "Checking container status..."
docker-compose -f docker-compose.prod.yml ps

echo "Deployment complete!"
echo "Frontend should be available at: http://$EC2_PUBLIC_IP"
echo "Backend should be available at: http://$EC2_PUBLIC_IP:5001" 