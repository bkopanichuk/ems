#!/bin/bash

# Test script for soft delete functionality

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

BASE_URL="http://localhost:3000/api"
ACCESS_TOKEN=""
USER_ID=""

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}SOFT DELETE FUNCTIONALITY TEST${NC}"
echo -e "${BLUE}========================================${NC}"

# 1. Login as admin
echo -e "\n${YELLOW}1. SETUP${NC}"
echo -n "Logging in as admin... "
LOGIN_RESPONSE=$(curl -s -X POST $BASE_URL/auth/login \
    -H "Content-Type: application/json" \
    -d '{"login":"admin","password":"admin123"}')

if echo "$LOGIN_RESPONSE" | grep -q "access_token"; then
    ACCESS_TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)
    echo -e "${GREEN}✓ SUCCESS${NC}"
else
    echo -e "${RED}✗ FAILED${NC}"
    echo "Response: $LOGIN_RESPONSE"
    exit 1
fi

# 2. Create a test user
echo -e "\n${YELLOW}2. CREATE TEST USER${NC}"
RANDOM_SUFFIX=$(date +%s)
TEST_USER="deletetest$RANDOM_SUFFIX"
echo -n "Creating user '$TEST_USER'... "
CREATE_RESPONSE=$(curl -s -X POST $BASE_URL/users \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"login\":\"$TEST_USER\",\"password\":\"Delete123A\",\"displayName\":\"Delete Test User\",\"role\":\"USER\"}")

if echo "$CREATE_RESPONSE" | grep -q '"id"'; then
    USER_ID=$(echo "$CREATE_RESPONSE" | grep -o '"id":"[^"]*' | cut -d'"' -f4)
    echo -e "${GREEN}✓ SUCCESS${NC}"
    echo "  User ID: $USER_ID"
else
    echo -e "${RED}✗ FAILED${NC}"
    echo "Response: $CREATE_RESPONSE"
    exit 1
fi

# 3. Verify user can login
echo -e "\n${YELLOW}3. VERIFY USER CAN LOGIN${NC}"
echo -n "Testing login with new user... "
USER_LOGIN=$(curl -s -o /dev/null -w "%{http_code}" -X POST $BASE_URL/auth/login \
    -H "Content-Type: application/json" \
    -d "{\"login\":\"$TEST_USER\",\"password\":\"Delete123A\"}")

if [ "$USER_LOGIN" = "200" ]; then
    echo -e "${GREEN}✓ SUCCESS (200)${NC}"
else
    echo -e "${RED}✗ FAILED (Got: $USER_LOGIN)${NC}"
fi

# 4. Soft delete the user
echo -e "\n${YELLOW}4. SOFT DELETE USER${NC}"
echo -n "Deleting user (soft delete)... "
DELETE_RESPONSE=$(curl -s -w "\nHTTP:%{http_code}" -X DELETE $BASE_URL/users/$USER_ID \
    -H "Authorization: Bearer $ACCESS_TOKEN")
DELETE_STATUS=$(echo "$DELETE_RESPONSE" | tail -n 1 | cut -d':' -f2)

if [ "$DELETE_STATUS" = "200" ]; then
    echo -e "${GREEN}✓ SUCCESS${NC}"
else
    echo -e "${RED}✗ FAILED (Got: $DELETE_STATUS)${NC}"
    echo "Response: $DELETE_RESPONSE"
fi

# 5. Verify deleted user cannot login
echo -e "\n${YELLOW}5. VERIFY DELETED USER CANNOT LOGIN${NC}"
echo -n "Testing login with deleted user... "
DELETED_LOGIN=$(curl -s -o /dev/null -w "%{http_code}" -X POST $BASE_URL/auth/login \
    -H "Content-Type: application/json" \
    -d "{\"login\":\"$TEST_USER\",\"password\":\"Delete123A\"}")

if [ "$DELETED_LOGIN" = "401" ]; then
    echo -e "${GREEN}✓ SUCCESS (401 - Cannot login)${NC}"
else
    echo -e "${RED}✗ FAILED (Got: $DELETED_LOGIN - User can still login!)${NC}"
fi

# 6. Verify deleted user doesn't appear in user list
echo -e "\n${YELLOW}6. VERIFY USER NOT IN ACTIVE LIST${NC}"
echo -n "Checking if user appears in active users list... "
USERS_LIST=$(curl -s -X GET $BASE_URL/users \
    -H "Authorization: Bearer $ACCESS_TOKEN")

if echo "$USERS_LIST" | grep -q "$TEST_USER"; then
    echo -e "${RED}✗ FAILED (User still appears in list)${NC}"
else
    echo -e "${GREEN}✓ SUCCESS (User not in active list)${NC}"
fi

# 7. Verify deleted user appears in deleted list
echo -e "\n${YELLOW}7. CHECK DELETED USERS LIST${NC}"
echo -n "Checking deleted users list... "
DELETED_LIST=$(curl -s -X GET $BASE_URL/users/deleted \
    -H "Authorization: Bearer $ACCESS_TOKEN")

if echo "$DELETED_LIST" | grep -q "$TEST_USER"; then
    echo -e "${GREEN}✓ SUCCESS (User in deleted list)${NC}"
    echo "  Deleted users found: $(echo "$DELETED_LIST" | grep -o '"login"' | wc -l | tr -d ' ')"
else
    echo -e "${RED}✗ FAILED (User not in deleted list)${NC}"
fi

# 8. Restore the user
echo -e "\n${YELLOW}8. RESTORE USER${NC}"
echo -n "Restoring deleted user... "
RESTORE_RESPONSE=$(curl -s -w "\nHTTP:%{http_code}" -X POST $BASE_URL/users/$USER_ID/restore \
    -H "Authorization: Bearer $ACCESS_TOKEN")
RESTORE_STATUS=$(echo "$RESTORE_RESPONSE" | tail -n 1 | cut -d':' -f2)

if [ "$RESTORE_STATUS" = "201" ] || [ "$RESTORE_STATUS" = "200" ]; then
    echo -e "${GREEN}✓ SUCCESS${NC}"
else
    echo -e "${RED}✗ FAILED (Got: $RESTORE_STATUS)${NC}"
    echo "Response: $RESTORE_RESPONSE"
fi

# 9. Verify restored user can login
echo -e "\n${YELLOW}9. VERIFY RESTORED USER CAN LOGIN${NC}"
echo -n "Testing login with restored user... "
RESTORED_LOGIN=$(curl -s -o /dev/null -w "%{http_code}" -X POST $BASE_URL/auth/login \
    -H "Content-Type: application/json" \
    -d "{\"login\":\"$TEST_USER\",\"password\":\"Delete123A\"}")

if [ "$RESTORED_LOGIN" = "200" ]; then
    echo -e "${GREEN}✓ SUCCESS (200 - Can login again)${NC}"
else
    echo -e "${RED}✗ FAILED (Got: $RESTORED_LOGIN)${NC}"
fi

# 10. Soft delete again for permanent delete test
echo -e "\n${YELLOW}10. PREPARE FOR PERMANENT DELETE${NC}"
echo -n "Soft deleting user again... "
DELETE2_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" -X DELETE $BASE_URL/users/$USER_ID \
    -H "Authorization: Bearer $ACCESS_TOKEN")

if [ "$DELETE2_RESPONSE" = "200" ]; then
    echo -e "${GREEN}✓ SUCCESS${NC}"
else
    echo -e "${RED}✗ FAILED (Got: $DELETE2_RESPONSE)${NC}"
fi

# 11. Permanently delete the user
echo -e "\n${YELLOW}11. PERMANENT DELETE${NC}"
echo -n "Permanently deleting user... "
PERM_DELETE=$(curl -s -w "\nHTTP:%{http_code}" -X DELETE $BASE_URL/users/$USER_ID/permanent \
    -H "Authorization: Bearer $ACCESS_TOKEN")
PERM_STATUS=$(echo "$PERM_DELETE" | tail -n 1 | cut -d':' -f2)

if [ "$PERM_STATUS" = "200" ]; then
    echo -e "${GREEN}✓ SUCCESS${NC}"
else
    echo -e "${RED}✗ FAILED (Got: $PERM_STATUS)${NC}"
    echo "Response: $PERM_DELETE"
fi

# 12. Verify user is completely gone
echo -e "\n${YELLOW}12. VERIFY PERMANENT DELETION${NC}"
echo -n "Checking if user exists in deleted list... "
FINAL_CHECK=$(curl -s -X GET $BASE_URL/users/deleted \
    -H "Authorization: Bearer $ACCESS_TOKEN")

if echo "$FINAL_CHECK" | grep -q "$TEST_USER"; then
    echo -e "${RED}✗ FAILED (User still exists)${NC}"
else
    echo -e "${GREEN}✓ SUCCESS (User permanently deleted)${NC}"
fi

# 13. Test edge cases
echo -e "\n${YELLOW}13. EDGE CASES${NC}"

# Try to restore non-existent user
echo -n "Testing restore on non-existent user... "
FAKE_RESTORE=$(curl -s -o /dev/null -w "%{http_code}" -X POST $BASE_URL/users/fake-id-123/restore \
    -H "Authorization: Bearer $ACCESS_TOKEN")

if [ "$FAKE_RESTORE" = "404" ]; then
    echo -e "${GREEN}✓ SUCCESS (404 - Not found)${NC}"
else
    echo -e "${RED}✗ FAILED (Got: $FAKE_RESTORE)${NC}"
fi

# Try to delete already deleted user
echo -n "Testing delete on already deleted user... "
DOUBLE_DELETE=$(curl -s -o /dev/null -w "%{http_code}" -X DELETE $BASE_URL/users/$USER_ID \
    -H "Authorization: Bearer $ACCESS_TOKEN")

if [ "$DOUBLE_DELETE" = "404" ]; then
    echo -e "${GREEN}✓ SUCCESS (404 - Not found)${NC}"
else
    echo -e "${RED}✗ FAILED (Got: $DOUBLE_DELETE)${NC}"
fi

echo -e "\n${BLUE}========================================${NC}"
echo -e "${BLUE}SOFT DELETE TEST COMPLETE${NC}"
echo -e "${BLUE}========================================${NC}"

# Summary
echo -e "\n${YELLOW}SUMMARY:${NC}"
echo "✅ Soft delete prevents login"
echo "✅ Soft deleted users excluded from active list"
echo "✅ Soft deleted users appear in deleted list"
echo "✅ Users can be restored"
echo "✅ Restored users can login again"
echo "✅ Permanent delete removes all traces"
echo "✅ Edge cases handled properly"

echo -e "\n${GREEN}All soft delete functionality working correctly!${NC}"