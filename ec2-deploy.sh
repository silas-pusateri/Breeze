#!/bin/bash

# Exit on any error
set -e

# Check if the public IP is provided
if [ -z "$1" ]; then
    echo "Usage: ./ec2-deploy.sh <public-ip>"
    exit 1
fi

EC2_PUBLIC_IP=$1
REPO_URL="https://github.com/silaspusateri/GauntletAI.git"
DEPLOY_DIR="/home/ubuntu/breeze-deploy"

echo "Starting deployment process..."

# Install Docker if not already installed
if ! command -v docker &> /dev/null; then
    echo "Installing Docker..."
    sudo apt-get update
    sudo apt-get install -y apt-transport-https ca-certificates curl software-properties-common
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo apt-key add -
    sudo add-apt-repository "deb [arch=amd64] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable"
    sudo apt-get update
    sudo apt-get install -y docker-ce docker-ce-cli containerd.io
    sudo usermod -aG docker $USER
fi

# Install Docker Compose if not already installed
if ! command -v docker-compose &> /dev/null; then
    echo "Installing Docker Compose..."
    sudo curl -L "https://github.com/docker/compose/releases/download/v2.24.1/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
fi

# Create deployment directory
echo "Setting up deployment directory..."
mkdir -p $DEPLOY_DIR
cd $DEPLOY_DIR

# Clone/pull the repository
if [ -d "Project2" ]; then
    echo "Updating existing repository..."
    cd Project2
    git pull
else
    echo "Cloning repository..."
    git clone $REPO_URL Project2
    cd Project2
fi

# Create production environment file
echo "Setting up environment files..."
echo "EC2_PUBLIC_IP=$EC2_PUBLIC_IP" > .env.prod

# Ensure .env file exists and has required variables
if [ ! -f "Breeze/.env" ]; then
    echo "Error: Breeze/.env file not found!"
    echo "Please create Breeze/.env with required environment variables:"
    echo "SUPABASE_URL=your_supabase_url"
    echo "SUPABASE_KEY=your_supabase_key"
    exit 1
fi

# Stop any running containers
echo "Stopping existing containers..."
docker-compose -f docker-compose.prod.yml down || true

# Build and start containers
echo "Building and starting containers..."
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