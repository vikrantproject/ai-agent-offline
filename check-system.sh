#!/bin/bash

################################################################################
# Claude Agent - Pre-Installation Checker
# Run this before installing to verify system compatibility
################################################################################

echo "========================================="
echo "  Claude Agent System Compatibility     "
echo "========================================="
echo ""

# Colors
GREEN='\\033[0;32m'
RED='\\033[0;31m'
YELLOW='\\033[1;33m'
NC='\\033[0m'

PASS=0
WARN=0
FAIL=0

# Check OS
echo -n "Checking OS... "
if [ -f /etc/os-release ]; then
    . /etc/os-release
    if [[ "$ID" == "ubuntu" ]] || [[ "$ID_LIKE" == *"ubuntu"* ]] || [[ "$ID" == "debian" ]]; then
        echo -e "${GREEN}✓ $PRETTY_NAME${NC}"
        ((PASS++))
    else
        echo -e "${YELLOW}⚠ $PRETTY_NAME (Ubuntu recommended)${NC}"
        ((WARN++))
    fi
else
    echo -e "${RED}✗ Unknown OS${NC}"
    ((FAIL++))
fi

# Check RAM
echo -n "Checking RAM... "
TOTAL_RAM=$(free -g | awk '/^Mem:/{print $2}')
if [ "$TOTAL_RAM" -ge 8 ]; then
    echo -e "${GREEN}✓ ${TOTAL_RAM}GB (sufficient)${NC}"
    ((PASS++))
elif [ "$TOTAL_RAM" -ge 4 ]; then
    echo -e "${YELLOW}⚠ ${TOTAL_RAM}GB (minimum, 8GB+ recommended)${NC}"
    ((WARN++))
else
    echo -e "${RED}✗ ${TOTAL_RAM}GB (insufficient, need 8GB+)${NC}"
    ((FAIL++))
fi

# Check disk space
echo -n "Checking disk space... "
AVAILABLE_SPACE=$(df -BG / | awk 'NR==2 {print $4}' | sed 's/G//')
if [ "$AVAILABLE_SPACE" -ge 20 ]; then
    echo -e "${GREEN}✓ ${AVAILABLE_SPACE}GB available${NC}"
    ((PASS++))
else
    echo -e "${RED}✗ ${AVAILABLE_SPACE}GB available (need 20GB+)${NC}"
    ((FAIL++))
fi

# Check if running as root
echo -n "Checking permissions... "
if [ "$EUID" -eq 0 ]; then
    echo -e "${GREEN}✓ Running as root${NC}"
    ((PASS++))
else
    echo -e "${YELLOW}⚠ Not root (will need sudo)${NC}"
    ((WARN++))
fi

# Check internet connection
echo -n "Checking internet... "
if ping -c 1 google.com &> /dev/null; then
    echo -e "${GREEN}✓ Connected${NC}"
    ((PASS++))
else
    echo -e "${RED}✗ No connection (needed for installation)${NC}"
    ((FAIL++))
fi

# Check if port 7778 is available
echo -n "Checking port 7778... "
if netstat -tuln 2>/dev/null | grep -q ":7778 " || ss -tuln 2>/dev/null | grep -q ":7778 "; then
    echo -e "${YELLOW}⚠ Port 7778 already in use${NC}"
    ((WARN++))
else
    echo -e "${GREEN}✓ Available${NC}"
    ((PASS++))
fi

# Check if Node.js is installed
echo -n "Checking Node.js... "
if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v)
    echo -e "${YELLOW}⚠ Already installed: $NODE_VERSION (will be updated if needed)${NC}"
    ((WARN++))
else
    echo -e "${GREEN}✓ Not installed (will be installed)${NC}"
    ((PASS++))
fi

# Check if Ollama is installed
echo -n "Checking Ollama... "
if command -v ollama &> /dev/null; then
    echo -e "${YELLOW}⚠ Already installed (will use existing)${NC}"
    ((WARN++))
else
    echo -e "${GREEN}✓ Not installed (will be installed)${NC}"
    ((PASS++))
fi

# Summary
echo ""
echo "========================================="
echo "  Summary                                "
echo "========================================="
echo -e "${GREEN}Passed: $PASS${NC}"
echo -e "${YELLOW}Warnings: $WARN${NC}"
echo -e "${RED}Failed: $FAIL${NC}"
echo ""

if [ "$FAIL" -eq 0 ]; then
    echo -e "${GREEN}✓ System ready for installation!${NC}"
    echo ""
    echo "Run the installer:"
    echo "  sudo ./install.sh"
    exit 0
else
    echo -e "${RED}✗ System requirements not met${NC}"
    echo "Please resolve the failed checks before installation."
    exit 1
fi
