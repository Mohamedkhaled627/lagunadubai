#!/bin/bash
# Start the waiter notifications service and keep it running
cd /home/z/my-project/mini-services/waiter-notifications

while true; do
  echo "[$(date)] Starting waiter-notifications service..."
  bun index.ts >> /tmp/waiter-notif.log 2>&1
  EXIT_CODE=$?
  echo "[$(date)] Service exited with code $EXIT_CODE. Restarting in 2s..."
  sleep 2
done
