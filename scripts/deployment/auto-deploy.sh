#!/bin/bash
set -e

# Load user environment
export HOME=/home/bpaf
# ConfigOps: Add path to NVM binaries to avoid "npm not found"
export PATH=/home/bpaf/.nvm/versions/node/v24.14.0/bin:/usr/local/bin:/usr/bin:/bin
# ReleaseBot: Set SSH command for reliable git operations
export GIT_SSH_COMMAND="ssh -i /home/bpaf/.ssh/id_ed25519_bapf -o IdentitiesOnly=yes -o StrictHostKeyChecking=accept-new"

APP_DIR="/opt/apps/Bapf"
BRANCH="main"

cd "$APP_DIR"

LOCAL=$(git rev-parse HEAD)
# Safety: ensure ls-remote succeeds before comparing
REMOTE=$(git ls-remote origin -h refs/heads/$BRANCH | awk '{print $1}')

if [ -n "$REMOTE" ] && [ "$LOCAL" != "$REMOTE" ]; then
  echo "$(date) New commit detected ($REMOTE). Starting deployment..."
  /opt/apps/Bapf/deploy.sh
elif [ -z "$REMOTE" ]; then
  echo "$(date) WARNING: Remote unreachable (DNS/Network). Skipping check."
else
  echo "$(date) System up to date ($LOCAL)."
fi