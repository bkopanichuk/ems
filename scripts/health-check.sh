#!/bin/bash

MAX_RETRIES=30
RETRY_COUNT=0
BACKEND_URL="http://localhost:3000/api/health"
FRONTEND_URL="http://localhost:9000"

echo "🔍 Checking service health..."

# Check backend health
while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
  if curl -f $BACKEND_URL > /dev/null 2>&1; then
    echo "✅ Backend health check passed"
    break
  fi

  RETRY_COUNT=$((RETRY_COUNT + 1))
  echo "⏳ Backend health check attempt $RETRY_COUNT/$MAX_RETRIES failed, retrying..."
  sleep 2
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
  echo "❌ Backend health check failed after $MAX_RETRIES attempts"
  exit 1
fi

# Check frontend health
RETRY_COUNT=0
while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
  if curl -f $FRONTEND_URL > /dev/null 2>&1; then
    echo "✅ Frontend health check passed"
    break
  fi

  RETRY_COUNT=$((RETRY_COUNT + 1))
  echo "⏳ Frontend health check attempt $RETRY_COUNT/$MAX_RETRIES failed, retrying..."
  sleep 2
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
  echo "❌ Frontend health check failed after $MAX_RETRIES attempts"
  exit 1
fi

echo "✅ All health checks passed!"
exit 0