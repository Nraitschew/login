#!/bin/bash
# Quick health check script

echo "Testing Anymize Login Server Health..."
echo "======================================"

# Test health endpoint
echo -n "Testing /health endpoint... "
response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:7500/health)
if [ $response -eq 200 ]; then
    echo "✅ OK"
else
    echo "❌ Failed (HTTP $response)"
fi

# Test login page
echo -n "Testing login page... "
response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:7500/)
if [ $response -eq 200 ]; then
    echo "✅ OK"
else
    echo "❌ Failed (HTTP $response)"
fi

# Test API endpoint
echo -n "Testing API endpoint... "
response=$(curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:7500/api/auth/request-code)
if [ $response -eq 400 ]; then
    echo "✅ OK (Expected 400 for empty request)"
else
    echo "❌ Failed (HTTP $response)"
fi

echo "======================================"
echo "Health check complete!"