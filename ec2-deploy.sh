#!/bin/bash

# Exit on any error
set -e

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

    # Try AWS CLI
    if command -v aws &> /dev/null; then
        INSTANCE_ID=$(curl -s http://169.254.169.254/latest/meta-data/instance-id 2>/dev/null)
        if [ ! -z "$INSTANCE_ID" ]; then
            IP=$(aws ec2 describe-instances --instance-ids "$INSTANCE_ID" --query 'Reservations[0].Instances[0].PublicIpAddress' --output text 2>/dev/null)
            if [ ! -z "$IP" ] && [ "$IP" != "None" ]; then
                echo "$IP"
                return 0
            fi
        fi
    fi

    # Try external IP lookup service
    IP=$(curl -s https://api.ipify.org 2>/dev/null)
    if [ ! -z "$IP" ]; then
        echo "$IP"
        return 0
    fi

    # If all methods fail
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

echo "Starting deployment process..."

# Ensure script is run with correct permissions
if ! groups | grep -q docker && [ "$(id -u)" != "0" ]; then
    echo "Adding current user to docker group..."
    sudo usermod -aG docker $USER
    echo "Please log out and log back in for group changes to take effect, then run this script again."
    exit 1
fi

# Install Docker if not already installed
if ! command -v docker &> /dev/null; then
    echo "Installing Docker..."
    sudo yum update -y
    sudo yum install -y docker
    sudo systemctl start docker
    sudo systemctl enable docker
    echo "Docker installed successfully"
fi

# Install Docker Compose if not already installed
if ! command -v docker-compose &> /dev/null; then
    echo "Installing Docker Compose..."
    # Install docker-compose binary
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
    sudo ln -sf /usr/local/bin/docker-compose /usr/bin/docker-compose
    echo "Docker Compose installed successfully"
    # Verify installation
    docker-compose --version
fi

# Create production environment file
echo "Setting up environment files..."
cat > .env.prod << EOL
EC2_PUBLIC_IP=$EC2_PUBLIC_IP
EOL

# Ensure .env file exists
if [ ! -f ".env" ]; then
    echo "Error: .env file not found!"
    echo "Please create .env with required environment variables:"
    echo "SUPABASE_URL=your_supabase_url"
    echo "SUPABASE_KEY=your_supabase_key"
    exit 1
fi

# Remove version from docker-compose.prod.yml if it exists
sed -i '/^version:/d' docker-compose.prod.yml

# Ensure docker is running
if ! sudo systemctl is-active --quiet docker; then
    echo "Starting Docker daemon..."
    sudo systemctl start docker
fi

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