#!/bin/bash

################################################################################
# Claude Agent Installation Script
# This script installs all dependencies and sets up the Claude AI Agent
# on Ubuntu 22.04 or similar Linux distributions
################################################################################

set -e

echo "========================================="
echo "  Claude AI Agent Installation Script  "
echo "========================================="
echo ""

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

INSTALL_DIR="/root/claude-agent"
SERVICE_NAME="claude-agent"

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
  echo -e "${RED}Please run as root (use sudo)${NC}"
  exit 1
fi

echo -e "${GREEN}Step 1: Updating system packages...${NC}"
apt-get update -qq
apt-get install -y curl wget git build-essential > /dev/null 2>&1
echo -e "${GREEN}✓ System packages updated${NC}"
echo ""

# Install Node.js 20
echo -e "${GREEN}Step 2: Installing Node.js 20...${NC}"
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - > /dev/null 2>&1
    apt-get install -y nodejs > /dev/null 2>&1
    echo -e "${GREEN}✓ Node.js installed: $(node --version)${NC}"
else
    echo -e "${YELLOW}Node.js already installed: $(node --version)${NC}"
fi
echo ""

# Install Ollama
echo -e "${GREEN}Step 3: Installing Ollama...${NC}"
if ! command -v ollama &> /dev/null; then
    curl -fsSL https://ollama.com/install.sh | sh
    echo -e "${GREEN}✓ Ollama installed successfully${NC}"
else
    echo -e "${YELLOW}Ollama already installed${NC}"
fi
echo ""

# Start Ollama service
echo -e "${GREEN}Step 4: Starting Ollama service...${NC}"
systemctl enable ollama > /dev/null 2>&1 || true
systemctl start ollama > /dev/null 2>&1 || true

# Check if Ollama service is available, if not start manually
if ! systemctl is-active --quiet ollama; then
    echo -e "${YELLOW}Starting Ollama manually...${NC}"
    nohup ollama serve > /var/log/ollama.log 2>&1 &
    sleep 5
fi

echo -e "${GREEN}✓ Ollama service started${NC}"
echo ""

# Pull llama3 model
echo -e "${GREEN}Step 5: Downloading llama3 model (this may take several minutes)...${NC}"
ollama pull llama3
echo -e "${GREEN}✓ llama3 model downloaded${NC}"
echo ""

# Create installation directory
echo -e "${GREEN}Step 6: Setting up application directory...${NC}"
mkdir -p "$INSTALL_DIR"
cd "$INSTALL_DIR"

# Check if this script is being run from the app directory
if [ -f "$(dirname "$0")/package.json" ]; then
    echo -e "${YELLOW}Copying files from current directory...${NC}"
    cp -r "$(dirname "$0")"/* "$INSTALL_DIR/"
else
    echo -e "${YELLOW}Please ensure all application files are in $INSTALL_DIR${NC}"
fi

echo -e "${GREEN}✓ Application directory ready${NC}"
echo ""

# Install Node.js dependencies
echo -e "${GREEN}Step 7: Installing Node.js dependencies...${NC}"
npm install --production > /dev/null 2>&1
echo -e "${GREEN}✓ Dependencies installed${NC}"
echo ""

# Create systemd service
echo -e "${GREEN}Step 8: Creating systemd service...${NC}"
cat > /etc/systemd/system/${SERVICE_NAME}.service << 'EOF'
[Unit]
Description=Claude AI Agent - Offline AI Assistant
After=network.target ollama.service

[Service]
Type=simple
User=root
WorkingDirectory=/root/claude-agent
ExecStart=/usr/bin/node /root/claude-agent/server.js
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=claude-agent
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

echo -e "${GREEN}✓ Systemd service created${NC}"
echo ""

# Reload systemd and start service
echo -e "${GREEN}Step 9: Starting Claude Agent service...${NC}"
systemctl daemon-reload
systemctl enable ${SERVICE_NAME}
systemctl restart ${SERVICE_NAME}
sleep 3

if systemctl is-active --quiet ${SERVICE_NAME}; then
    echo -e "${GREEN}✓ Claude Agent service is running${NC}"
else
    echo -e "${RED}✗ Failed to start Claude Agent service${NC}"
    echo -e "${YELLOW}Check logs with: journalctl -u ${SERVICE_NAME} -f${NC}"
    exit 1
fi
echo ""

# Get server IP
SERVER_IP=$(hostname -I | awk '{print $1}')

echo "========================================="
echo -e "${GREEN}  Installation Complete! 🎉${NC}"
echo "========================================="
echo ""
echo -e "${GREEN}Claude AI Agent is now running!${NC}"
echo ""
echo "Access your agent at:"
echo -e "  ${YELLOW}Local:${NC}    http://localhost:7778"
echo -e "  ${YELLOW}Network:${NC}  http://${SERVER_IP}:7778"
echo ""
echo "Useful commands:"
echo -e "  ${YELLOW}Status:${NC}   systemctl status ${SERVICE_NAME}"
echo -e "  ${YELLOW}Logs:${NC}     journalctl -u ${SERVICE_NAME} -f"
echo -e "  ${YELLOW}Restart:${NC}  systemctl restart ${SERVICE_NAME}"
echo -e "  ${YELLOW}Stop:${NC}     systemctl stop ${SERVICE_NAME}"
echo ""
echo "Database location: $INSTALL_DIR/database/agent.db"
echo "Configuration: $INSTALL_DIR/.env"
echo ""
echo -e "${GREEN}Enjoy your offline AI assistant!${NC}"
echo ""