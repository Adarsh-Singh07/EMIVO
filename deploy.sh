#!/bin/bash
echo "Waiting for GitHub action to finish..."
while gh run view 32749853669 --json status -q ".status" | grep -q "in_progress"; do
  sleep 10
done
echo "GitHub action finished. Pulling images..."
docker compose -f compose.prod.vm1.yaml pull
echo "Restarting services..."
docker compose -f compose.prod.vm1.yaml up -d
echo "Deployment complete."
