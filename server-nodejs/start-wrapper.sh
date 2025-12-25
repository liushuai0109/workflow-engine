#!/bin/bash

# Wait for port 3000 to be free
PORT=3000
MAX_WAIT=10
COUNTER=0

echo "[wrapper] Waiting for port $PORT to be free..."
while lsof -ti:$PORT > /dev/null 2>&1; do
  if [ $COUNTER -ge $MAX_WAIT ]; then
    echo "[wrapper] Port $PORT still in use after ${MAX_WAIT}s, force killing..."
    lsof -ti:$PORT | xargs kill -9 2>/dev/null || true
    sleep 1
    break
  fi
  sleep 0.5
  COUNTER=$((COUNTER+1))
done

echo "[wrapper] Port $PORT is free, starting server..."
# Start the server
exec ts-node src/index.ts
