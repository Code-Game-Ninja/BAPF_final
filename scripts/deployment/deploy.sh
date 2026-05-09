#!/bin/bash
set -ex

# BP & AF — Deployment Script
# Improved with better logging and absolute paths for PM2/NVM

APP_DIR="/opt/apps/Bapf"
BRANCH="main"

# Source NVM for consistent paths
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

cd "$APP_DIR"

echo "==> Fetch latest and reset to origin"
git fetch origin
git reset --hard "origin/$BRANCH"

echo "==> Install dependencies"
npm install

echo "==> Production Build"
rm -rf .next
npm run build

echo "==> PM2 Process Management"
# Check if bapf process exists
if pm2 describe bapf >/dev/null 2>&1; then
  echo "Restarting existing PM2 process..."
  pm2 restart bapf --update-env
else
  echo "Initializing new PM2 process..."
  pm2 start npm --name "bapf" -- start
fi

# Save the PM2 list
pm2 save

echo "==> [SUCCESS] Deployment completed at $(date)"