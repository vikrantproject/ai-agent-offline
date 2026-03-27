# GitHub Deployment Guide

## Step 1: Create GitHub Repository

1. Go to https://github.com/vikrant-project
2. Click "New Repository"
3. Name: `ai-agent-offline`
4. Description: "Fully offline self-hosted Claude-like AI agent"
5. Public or Private (your choice)
6. Do NOT initialize with README (we already have one)
7. Click "Create repository"

## Step 2: Upload Files to GitHub

You have two options:

### Option A: Using Git Command Line

```bash
cd ai-agent-offline
git init
git add .
git commit -m "Initial commit: Complete offline Claude AI agent"
git branch -M main
git remote add origin https://github.com/vikrant-project/ai-agent-offline.git
git push -u origin main
```

### Option B: Using GitHub Desktop or Web Interface

1. Download all files from Emergent
2. Use GitHub Desktop to push, or
3. Upload files via GitHub web interface (drag and drop)

## Step 3: Deploy to Your VPS

Once files are on GitHub:

```bash
# SSH into your VPS
ssh root@your-vps-ip

# Install using the automated script
curl -fsSL https://raw.githubusercontent.com/vikrant-project/ai-agent-offline/main/install.sh -o install.sh
chmod +x install.sh
sudo ./install.sh
```

The installer will:
- Install Node.js 20
- Install Ollama
- Download llama3 model
- Setup the application
- Create systemd service
- Start the agent

## Step 4: Access Your Agent

Open browser: `http://your-vps-ip:7778`

## Files Included

All 13 required files:
✅ server.js
✅ package.json  
✅ .env
✅ database/db.js
✅ routes/chat.js
✅ routes/history.js
✅ routes/settings.js
✅ services/ollama.js
✅ public/index.html
✅ public/style.css
✅ public/app.js
✅ install.sh
✅ claude-agent.service
✅ README.md

## Important Notes

1. The personal access token in your message should be kept private
2. Create a new token with `repo` permissions if needed
3. Install script requires root/sudo access
4. Minimum 8GB RAM recommended for llama3

## Troubleshooting

If repository creation fails:
1. Verify the token has correct permissions
2. Check repository doesn't already exist
3. Ensure you're logged into the correct account

## Support

See README.md for full documentation and troubleshooting guide.
