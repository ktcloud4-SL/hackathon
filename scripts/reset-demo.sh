#!/bin/bash
# OneReport Demo Scenario Reset Script
# Resets the database and containers for a fresh demo run.

set -e

KEY_PATH="infra/terraform/onereport-key.pem"
EC2_IP="13.125.52.10"

echo "============================================="
echo "   OneReport Demo Reset Tool"
echo "============================================="

if [ "$1" == "--local" ]; then
    echo "Resetting local environment..."
    docker compose down -v
    docker compose up -d
    echo "Local environment reset complete!"
    exit 0
fi

if [ -f "$KEY_PATH" ]; then
    echo "Resetting remote EC2 environment ($EC2_IP)..."
    ssh -o StrictHostKeyChecking=no -i "$KEY_PATH" ubuntu@$EC2_IP "cd /opt/onereport && docker compose down -v && docker compose up -d"
    echo "Remote environment reset complete!"
else
    echo "Key file $KEY_PATH not found. Running locally instead..."
    docker compose down -v
    docker compose up -d
fi

echo "Demo environment is clean and ready!"
