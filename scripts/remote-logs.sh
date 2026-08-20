#!/bin/bash
# View live container logs on EC2
KEY_PATH="infra/terraform/onereport-key.pem"
EC2_IP="13.125.52.10"

if [ ! -f "$KEY_PATH" ]; then
    echo "Error: Key file $KEY_PATH not found. Run terraform output first."
    exit 1
fi

echo "Connecting to OneReport EC2 ($EC2_IP) logs..."
ssh -o StrictHostKeyChecking=no -i "$KEY_PATH" ubuntu@$EC2_IP "cd /opt/onereport && docker compose logs -f --tail=100 $@"
