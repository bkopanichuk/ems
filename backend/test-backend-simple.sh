#!/bin/bash

# Simple Backend Testing Script for EMS
# Tests core functionality

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Config
BASE_URL="http://localhost:3000/api"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}EMS BACKEND TEST SUITE${NC}"
echo -e "${BLUE}========================================${NC}"

# Variables to store tokens
ACCESS_TOKEN=""
REFRESH_TOKEN=""
USER_ID=""

echo -e "\n${YELLOW}1. HEALTH CHECKS${NC}"

# Test health endpoint
echo -n "Testing health endpoint... "
HEALTH=$(curl -s $BASE_URL/health)
if echo "$HEALTH" | grep -q '"status":"ok"'; then
    echo -e "${GREEN}✓ PASSED${NC}"
else
    echo -e "${RED}✗ FAILED${NC}"
fi

# Test readiness
echo -n "Testing readiness endpoint... "
READY=$(curl -s $BASE_URL/health/ready)
if echo "$READY" | grep -q '"database":"up"'; then
    echo -e "${GREEN}✓ PASSED${NC}"
else
    echo -e "${RED}✗ FAILED${NC}"
fi

echo -e "\n${YELLOW}2. AUTHENTICATION${NC}"

# Test login with valid credentials
echo -n "Testing admin login... "
LOGIN_RESPONSE=$(curl -s -X POST $BASE_URL/auth/login \
    -H "Content-Type: application/json" \
    -d '{"login":"admin","password":"admin123"}')

if echo "$LOGIN_RESPONSE" | grep -q "access_token"; then
    ACCESS_TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)
    REFRESH_TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"refresh_token":"[^"]*' | cut -d'"' -f4)
    echo -e "${GREEN}✓ PASSED${NC}"
    echo "  Access token: ${ACCESS_TOKEN:0:20}..."
    echo "  Refresh token: ${REFRESH_TOKEN:0:20}..."
else
    echo -e "${RED}✗ FAILED${NC}"
    echo "  Response: $LOGIN_RESPONSE"
fi

# Test login with invalid password
echo -n "Testing login with wrong password... "
INVALID_LOGIN=$(curl -s -o /dev/null -w "%{http_code}" -X POST $BASE_URL/auth/login \
    -H "Content-Type: application/json" \
    -d '{"login":"admin","password":"wrongpass"}')

if [ "$INVALID_LOGIN" = "401" ]; then
    echo -e "${GREEN}✓ PASSED (401)${NC}"
else
    echo -e "${RED}✗ FAILED (Got: $INVALID_LOGIN)${NC}"
fi

# Test refresh token
if [ ! -z "$REFRESH_TOKEN" ]; then
    echo -n "Testing refresh token... "
    REFRESH_RESPONSE=$(curl -s -X POST $BASE_URL/auth/refresh \
        -H "Content-Type: application/json" \
        -d "{\"refresh_token\":\"$REFRESH_TOKEN\"}")

    if echo "$REFRESH_RESPONSE" | grep -q "access_token"; then
        NEW_ACCESS_TOKEN=$(echo "$REFRESH_RESPONSE" | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)
        ACCESS_TOKEN=$NEW_ACCESS_TOKEN
        echo -e "${GREEN}✓ PASSED${NC}"
    else
        echo -e "${RED}✗ FAILED${NC}"
    fi
fi

# Test protected endpoint
echo -n "Testing protected endpoint with token... "
PROFILE=$(curl -s -X GET $BASE_URL/auth/profile \
    -H "Authorization: Bearer $ACCESS_TOKEN")

if echo "$PROFILE" | grep -q '"login":"admin"'; then
    echo -e "${GREEN}✓ PASSED${NC}"
else
    echo -e "${RED}✗ FAILED${NC}"
fi

# Test protected endpoint without token
echo -n "Testing protected endpoint without token... "
NO_AUTH=$(curl -s -o /dev/null -w "%{http_code}" $BASE_URL/auth/profile)

if [ "$NO_AUTH" = "401" ]; then
    echo -e "${GREEN}✓ PASSED (401)${NC}"
else
    echo -e "${RED}✗ FAILED (Got: $NO_AUTH)${NC}"
fi

echo -e "\n${YELLOW}3. USER MANAGEMENT${NC}"

# Create a test user
echo -n "Creating test user... "
CREATE_USER=$(curl -s -X POST $BASE_URL/users \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"login":"testuser","password":"Test123A","displayName":"Test User","role":"USER"}')

if echo "$CREATE_USER" | grep -q '"id"'; then
    USER_ID=$(echo "$CREATE_USER" | grep -o '"id":"[^"]*' | cut -d'"' -f4)
    echo -e "${GREEN}✓ PASSED${NC}"
    echo "  User ID: $USER_ID"
else
    echo -e "${RED}✗ FAILED${NC}"
    echo "  Response: $CREATE_USER"
fi

# Get all users
echo -n "Getting all users... "
GET_USERS=$(curl -s -X GET $BASE_URL/users \
    -H "Authorization: Bearer $ACCESS_TOKEN")

if echo "$GET_USERS" | grep -q "testuser"; then
    echo -e "${GREEN}✓ PASSED${NC}"
else
    echo -e "${RED}✗ FAILED${NC}"
fi

# Update user
if [ ! -z "$USER_ID" ]; then
    echo -n "Updating user... "
    UPDATE_USER=$(curl -s -X PATCH $BASE_URL/users/$USER_ID \
        -H "Authorization: Bearer $ACCESS_TOKEN" \
        -H "Content-Type: application/json" \
        -d '{"displayName":"Updated User"}')

    if echo "$UPDATE_USER" | grep -q "Updated User"; then
        echo -e "${GREEN}✓ PASSED${NC}"
    else
        echo -e "${RED}✗ FAILED${NC}"
    fi

    # Block user
    echo -n "Blocking user... "
    BLOCK_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST $BASE_URL/users/$USER_ID/block \
        -H "Authorization: Bearer $ACCESS_TOKEN")

    if [ "$BLOCK_STATUS" = "200" ] || [ "$BLOCK_STATUS" = "201" ]; then
        echo -e "${GREEN}✓ PASSED${NC}"

        # Test blocked user login
        echo -n "Testing blocked user cannot login... "
        BLOCKED_LOGIN=$(curl -s -o /dev/null -w "%{http_code}" -X POST $BASE_URL/auth/login \
            -H "Content-Type: application/json" \
            -d '{"login":"testuser","password":"Test123A"}')

        if [ "$BLOCKED_LOGIN" = "403" ] || [ "$BLOCKED_LOGIN" = "401" ]; then
            echo -e "${GREEN}✓ PASSED (User blocked)${NC}"
        else
            echo -e "${RED}✗ FAILED (Got: $BLOCKED_LOGIN)${NC}"
        fi

        # Unblock user
        echo -n "Unblocking user... "
        UNBLOCK_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST $BASE_URL/users/$USER_ID/unblock \
            -H "Authorization: Bearer $ACCESS_TOKEN")

        if [ "$UNBLOCK_STATUS" = "200" ] || [ "$UNBLOCK_STATUS" = "201" ]; then
            echo -e "${GREEN}✓ PASSED${NC}"
        else
            echo -e "${RED}✗ FAILED${NC}"
        fi
    else
        echo -e "${RED}✗ FAILED (Got: $BLOCK_STATUS)${NC}"
    fi

    # Delete user
    echo -n "Deleting user... "
    DELETE_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X DELETE $BASE_URL/users/$USER_ID \
        -H "Authorization: Bearer $ACCESS_TOKEN")

    if [ "$DELETE_STATUS" = "200" ]; then
        echo -e "${GREEN}✓ PASSED${NC}"
    else
        echo -e "${RED}✗ FAILED (Got: $DELETE_STATUS)${NC}"
    fi
fi

echo -e "\n${YELLOW}4. INPUT VALIDATION${NC}"

# Wait a bit to avoid rate limiting from previous tests
sleep 2

# Test empty login
echo -n "Testing empty login credentials... "
EMPTY_LOGIN=$(curl -s -o /dev/null -w "%{http_code}" -X POST $BASE_URL/auth/login \
    -H "Content-Type: application/json" \
    -d '{}')

if [ "$EMPTY_LOGIN" = "400" ] || [ "$EMPTY_LOGIN" = "401" ]; then
    echo -e "${GREEN}✓ PASSED (Rejected)${NC}"
else
    echo -e "${RED}✗ FAILED (Got: $EMPTY_LOGIN)${NC}"
fi

# Test short username
echo -n "Testing short username validation... "
SHORT_USER=$(curl -s -o /dev/null -w "%{http_code}" -X POST $BASE_URL/auth/login \
    -H "Content-Type: application/json" \
    -d '{"login":"ab","password":"password123"}')

if [ "$SHORT_USER" = "400" ] || [ "$SHORT_USER" = "401" ]; then
    echo -e "${GREEN}✓ PASSED (Rejected)${NC}"
else
    echo -e "${RED}✗ FAILED (Got: $SHORT_USER)${NC}"
fi

# Test invalid characters
echo -n "Testing invalid username characters... "
INVALID_CHARS=$(curl -s -o /dev/null -w "%{http_code}" -X POST $BASE_URL/auth/login \
    -H "Content-Type: application/json" \
    -d '{"login":"user@#$","password":"password123"}')

if [ "$INVALID_CHARS" = "400" ] || [ "$INVALID_CHARS" = "401" ]; then
    echo -e "${GREEN}✓ PASSED (Rejected)${NC}"
else
    echo -e "${RED}✗ FAILED (Got: $INVALID_CHARS)${NC}"
fi

# Test weak password
echo -n "Testing weak password validation... "
WEAK_PASS=$(curl -s -X POST $BASE_URL/users \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"login":"weakuser","password":"weak","displayName":"Weak User"}')

if echo "$WEAK_PASS" | grep -q "error"; then
    echo -e "${GREEN}✓ PASSED${NC}"
else
    echo -e "${RED}✗ FAILED${NC}"
fi

echo -e "\n${YELLOW}5. RATE LIMITING${NC}"

# Test login rate limiting
echo -n "Testing login rate limiting (6 attempts)... "
for i in {1..6}; do
    STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST $BASE_URL/auth/login \
        -H "Content-Type: application/json" \
        -d '{"login":"admin","password":"wrongpass"}')
    if [ $i -eq 6 ] && [ "$STATUS" = "429" ]; then
        echo -e "${GREEN}✓ PASSED (429 on 6th attempt)${NC}"
        break
    elif [ $i -eq 6 ]; then
        echo -e "${RED}✗ FAILED (Got: $STATUS)${NC}"
    fi
done

echo -e "\n${YELLOW}6. PROFILE MANAGEMENT${NC}"

# Get profile
echo -n "Testing get profile... "
PROFILE=$(curl -s -X GET $BASE_URL/profile \
    -H "Authorization: Bearer $ACCESS_TOKEN")

if echo "$PROFILE" | grep -q '"login":"admin"'; then
    echo -e "${GREEN}✓ PASSED${NC}"
else
    echo -e "${RED}✗ FAILED${NC}"
fi

# Update profile
echo -n "Testing update profile... "
UPDATE_PROFILE=$(curl -s -X PATCH $BASE_URL/profile \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"displayName":"Updated Admin"}')

if echo "$UPDATE_PROFILE" | grep -q "Updated Admin"; then
    echo -e "${GREEN}✓ PASSED${NC}"
else
    echo -e "${RED}✗ FAILED${NC}"
fi

# Change password with wrong current
echo -n "Testing password change with wrong current... "
WRONG_PASS=$(curl -s -o /dev/null -w "%{http_code}" -X POST $BASE_URL/profile/change-password \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"currentPassword":"wrongpass","newPassword":"NewPass123A"}')

if [ "$WRONG_PASS" = "401" ] || [ "$WRONG_PASS" = "403" ]; then
    echo -e "${GREEN}✓ PASSED (Wrong password rejected)${NC}"
else
    echo -e "${RED}✗ FAILED (Got: $WRONG_PASS)${NC}"
fi

echo -e "\n${YELLOW}7. SECURITY HEADERS${NC}"

# Check security headers
echo -n "Testing security headers... "
HEADERS=$(curl -s -I $BASE_URL/health)

if echo "$HEADERS" | grep -q "X-DNS-Prefetch-Control"; then
    echo -e "${GREEN}✓ PASSED (Helmet headers present)${NC}"
else
    echo -e "${RED}✗ FAILED${NC}"
fi

# Check CORS
echo -n "Testing CORS configuration... "
CORS=$(curl -s -I -X OPTIONS $BASE_URL/health -H "Origin: http://localhost:9000")

if echo "$CORS" | grep -q "Access-Control-Allow-Origin"; then
    echo -e "${GREEN}✓ PASSED${NC}"
else
    echo -e "${RED}✗ FAILED${NC}"
fi

echo -e "\n${YELLOW}8. ERROR HANDLING${NC}"

# Invalid JSON
echo -n "Testing invalid JSON handling... "
INVALID_JSON=$(curl -s -o /dev/null -w "%{http_code}" -X POST $BASE_URL/auth/login \
    -H "Content-Type: application/json" \
    -d '{invalid json}')

if [ "$INVALID_JSON" = "400" ]; then
    echo -e "${GREEN}✓ PASSED (400)${NC}"
else
    echo -e "${RED}✗ FAILED (Got: $INVALID_JSON)${NC}"
fi

# Non-existent endpoint
echo -n "Testing 404 handling... "
NOT_FOUND=$(curl -s -o /dev/null -w "%{http_code}" $BASE_URL/nonexistent)

if [ "$NOT_FOUND" = "404" ]; then
    echo -e "${GREEN}✓ PASSED (404)${NC}"
else
    echo -e "${RED}✗ FAILED (Got: $NOT_FOUND)${NC}"
fi

echo -e "\n${YELLOW}9. SESSION MANAGEMENT${NC}"

# Get sessions
echo -n "Testing get sessions... "
SESSIONS=$(curl -s -X GET $BASE_URL/auth/sessions \
    -H "Authorization: Bearer $ACCESS_TOKEN")

if echo "$SESSIONS" | grep -q '\['; then
    echo -e "${GREEN}✓ PASSED${NC}"
    echo "  Active sessions: $(echo "$SESSIONS" | grep -o '"id"' | wc -l)"
else
    echo -e "${RED}✗ FAILED${NC}"
fi

# Logout
echo -n "Testing logout... "
LOGOUT=$(curl -s -o /dev/null -w "%{http_code}" -X POST $BASE_URL/auth/logout \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"refresh_token\":\"$REFRESH_TOKEN\"}")

if [ "$LOGOUT" = "200" ]; then
    echo -e "${GREEN}✓ PASSED${NC}"
else
    echo -e "${RED}✗ FAILED (Got: $LOGOUT)${NC}"
fi

echo -e "\n${BLUE}========================================${NC}"
echo -e "${BLUE}TEST COMPLETE${NC}"
echo -e "${BLUE}========================================${NC}"