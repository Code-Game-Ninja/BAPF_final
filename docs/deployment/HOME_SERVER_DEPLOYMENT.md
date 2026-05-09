# Home Server Supabase Deployment Guide

> Deploy Supabase on your own Ubuntu machine and expose it to the internet

**Status**: Ready to Use
**Last Updated**: 2026-03-18
**Estimated Setup Time**: 20-30 minutes

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Step 1: Configure Supabase](#step-1-configure-supabase)
3. [Step 2: Start Supabase](#step-2-start-supabase)
4. [Step 3: Expose to Internet](#step-3-expose-to-internet)
   - [Option A: Cloudflare Tunnel (Recommended)](#option-a-cloudflare-tunnel-recommended)
   - [Option B: Port Forwarding + DuckDNS](#option-b-port-forwarding--duckdns)
5. [Step 4: Set Up SSL](#step-4-set-up-ssl)
6. [Step 5: Update Frontend](#step-5-update-frontend-env)
7. [Step 6: Run Migrations & Seed](#step-6-run-migrations--seed)
8. [Maintenance](#maintenance)
9. [Troubleshooting](#troubleshooting)

---

## Prerequisites

- [x] Ubuntu Linux (20.04 or 22.04)
- [x] Docker & Docker Compose installed
- [x] Supabase repository cloned
- [ ] Domain name (or use free DuckDNS)
- [ ] Cloudflare account (free) OR router access for port forwarding

---

## Step 1: Configure Supabase

### Navigate to Supabase Docker Directory

```bash
cd /path/to/supabase/docker
```

### Create Environment File

```bash
cp .env.example .env
nano .env
```

### Update These Critical Values

```env
############
# CRITICAL - CHANGE ALL OF THESE!
############

# PostgreSQL Password (minimum 20 characters)
POSTGRES_PASSWORD=YourSuperSecurePostgresPassword123!

# JWT Secret (minimum 32 characters)
JWT_SECRET=YourSuperSecureJWTSecretAtLeast32Chars!

# Dashboard Access
DASHBOARD_USERNAME=admin
DASHBOARD_PASSWORD=YourDashboardPassword123!

############
# URLs - Update after setting up domain
############

# Your frontend URL
SITE_URL=https://yourdomain.com

# Your Supabase API URL
API_EXTERNAL_URL=https://api.yourdomain.com

# Or if using DuckDNS:
# SITE_URL=https://yourapp.duckdns.org
# API_EXTERNAL_URL=https://yourapi.duckdns.org

############
# Email (Optional but recommended)
############

SMTP_ADMIN_EMAIL=admin@yourdomain.com
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Auto-confirm emails in development
ENABLE_EMAIL_AUTOCONFIRM=true
```

### Save and Exit

Press `Ctrl+X`, then `Y`, then `Enter`

---

## Step 2: Start Supabase

### Start All Services

```bash
cd /path/to/supabase/docker
docker compose up -d
```

### Verify All Services Are Running

```bash
docker compose ps
```

Expected output (all should be "healthy" or "running"):

```
NAME                    STATUS
supabase-db             Up (healthy)
supabase-kong           Up (healthy)
supabase-auth           Up (healthy)
supabase-rest           Up (healthy)
supabase-realtime       Up (healthy)
supabase-storage        Up (healthy)
supabase-studio         Up (healthy)
```

### Test Locally

```bash
curl http://localhost:8000/rest/v1/
# Should return: []
```

### View Logs (if issues)

```bash
docker compose logs -f
```

---

## Step 3: Expose to Internet

Choose ONE of these options:

---

### Option A: Cloudflare Tunnel (Recommended)

**Best for**: No port forwarding needed, works behind any firewall/NAT

#### A1. Create Cloudflare Account

1. Go to https://dash.cloudflare.com
2. Sign up (free)
3. Add your domain (or use Cloudflare's free subdomain)

#### A2. Install Cloudflared

```bash
# Download
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o cloudflared

# Install
chmod +x cloudflared
sudo mv cloudflared /usr/local/bin/

# Verify
cloudflared --version
```

#### A3. Authenticate with Cloudflare

```bash
cloudflared tunnel login
```

This opens a browser. Select your domain and authorize.

#### A4. Create Tunnel

```bash
# Create tunnel
cloudflared tunnel create supabase

# Note the Tunnel ID shown (e.g., a1b2c3d4-e5f6-...)
```

#### A5. Configure Tunnel

```bash
mkdir -p ~/.cloudflared
nano ~/.cloudflared/config.yml
```

Add this content:

```yaml
tunnel: YOUR_TUNNEL_ID
credentials-file: /home/YOUR_USERNAME/.cloudflared/YOUR_TUNNEL_ID.json

ingress:
  # Supabase API
  - hostname: api.yourdomain.com
    service: http://localhost:8000
  # Supabase Studio (optional)
  - hostname: studio.yourdomain.com
    service: http://localhost:3000
  # Catch-all
  - service: http_status:404
```

Replace:
- `YOUR_TUNNEL_ID` with your actual tunnel ID
- `YOUR_USERNAME` with your Linux username
- `yourdomain.com` with your domain

#### A6. Create DNS Routes

```bash
cloudflared tunnel route dns supabase api.yourdomain.com
cloudflared tunnel route dns supabase studio.yourdomain.com
```

#### A7. Run Tunnel

```bash
# Test run
cloudflared tunnel run supabase

# If working, install as service
sudo cloudflared service install
sudo systemctl enable cloudflared
sudo systemctl start cloudflared
```

#### A8. Verify

Open browser: `https://api.yourdomain.com/rest/v1/`

---

### Option B: Port Forwarding + DuckDNS

**Best for**: Full control, no third-party tunnel

#### B1. Get Free Domain with DuckDNS

1. Go to https://www.duckdns.org
2. Login with Google/GitHub
3. Create subdomain: `yourbapf.duckdns.org`
4. Note your **token**

#### B2. Install DuckDNS Updater

```bash
mkdir -p ~/duckdns
nano ~/duckdns/duck.sh
```

Add:

```bash
#!/bin/bash
echo url="https://www.duckdns.org/update?domains=yourbapf&token=YOUR_TOKEN&ip=" | curl -k -o ~/duckdns/duck.log -K -
```

Replace `yourbapf` and `YOUR_TOKEN`.

```bash
chmod +x ~/duckdns/duck.sh

# Test
~/duckdns/duck.sh
cat ~/duckdns/duck.log  # Should show "OK"

# Add to crontab (update every 5 minutes)
crontab -e
# Add this line:
*/5 * * * * ~/duckdns/duck.sh >/dev/null 2>&1
```

#### B3. Find Your Local IP

```bash
ip addr | grep "inet " | grep -v 127.0.0.1
# Example output: inet 192.168.1.100/24
```

#### B4. Configure Router Port Forwarding

1. Open router admin: `http://192.168.1.1` (or `192.168.0.1`)
2. Login (check router label for password)
3. Find **Port Forwarding** / **NAT** / **Virtual Server**
4. Add rules:

| Service Name | External Port | Internal Port | Internal IP | Protocol |
|--------------|---------------|---------------|-------------|----------|
| HTTP | 80 | 80 | 192.168.1.100 | TCP |
| HTTPS | 443 | 443 | 192.168.1.100 | TCP |

Replace `192.168.1.100` with your Ubuntu machine's IP.

#### B5. Set Static IP (Recommended)

To prevent IP changes, set a static IP on your Ubuntu machine:

```bash
sudo nano /etc/netplan/01-network-config.yaml
```

```yaml
network:
  version: 2
  ethernets:
    eth0:  # or your interface name
      dhcp4: no
      addresses:
        - 192.168.1.100/24
      gateway4: 192.168.1.1
      nameservers:
        addresses:
          - 8.8.8.8
          - 8.8.4.4
```

```bash
sudo netplan apply
```

---

## Step 4: Set Up SSL

### For Cloudflare Tunnel

SSL is automatic! Cloudflare handles it.

### For Port Forwarding Setup

#### Install Nginx & Certbot

```bash
sudo apt update
sudo apt install -y nginx certbot python3-certbot-nginx
```

#### Create Nginx Config

```bash
sudo nano /etc/nginx/sites-available/supabase
```

```nginx
server {
    listen 80;
    server_name api.yourbapf.duckdns.org;

    location / {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;

        # WebSocket support
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        # Headers
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Timeouts
        proxy_connect_timeout 600s;
        proxy_send_timeout 600s;
        proxy_read_timeout 600s;
    }
}
```

#### Enable Site

```bash
sudo ln -s /etc/nginx/sites-available/supabase /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

#### Get SSL Certificate

```bash
sudo certbot --nginx -d api.yourbapf.duckdns.org
```

Follow prompts:
- Enter email
- Agree to terms
- Choose redirect HTTP to HTTPS (option 2)

#### Auto-Renewal

```bash
sudo certbot renew --dry-run
```

---

## Step 5: Update Frontend .env

On your development machine, update `.env.local`:

```env
# Production Supabase URL
NEXT_PUBLIC_SUPABASE_URL=https://api.yourdomain.com

# Get these from your Supabase .env file
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Your frontend URL
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

### Get Keys from Supabase

On your Ubuntu server:

```bash
cd /path/to/supabase/docker
cat .env | grep -E "ANON_KEY|SERVICE_ROLE_KEY"
```

Copy these values to your frontend `.env.local`.

---

## Step 6: Run Migrations & Seed

### Copy Migration Files to Server

From your Windows machine:

```bash
scp -r supabase/migrations/* user@your-server-ip:/tmp/migrations/
scp supabase/seed.sql user@your-server-ip:/tmp/
```

### Run on Server

```bash
# Run migrations
for f in /tmp/migrations/*.sql; do
  cat "$f" | docker exec -i supabase-db psql -U postgres -d postgres
done

# Run seed data
cat /tmp/seed.sql | docker exec -i supabase-db psql -U postgres -d postgres
```

### Verify

```bash
docker exec -i supabase-db psql -U postgres -d postgres -c "\dt"
```

Should show all your tables.

---

## Maintenance

### Auto-Start on Boot

Docker containers with `restart: always` (default in Supabase) will auto-start.

Verify:

```bash
docker update --restart=always $(docker ps -q)
```

### Prevent Sleep/Hibernate

```bash
sudo systemctl mask sleep.target suspend.target hibernate.target hybrid-sleep.target
```

### Daily Backups

```bash
# Create backup script
sudo nano /home/backup-supabase.sh
```

```bash
#!/bin/bash
BACKUP_DIR="/backups/supabase"
mkdir -p $BACKUP_DIR

# Backup database
docker exec supabase-db pg_dump -U postgres postgres > $BACKUP_DIR/backup_$(date +%Y%m%d_%H%M%S).sql

# Keep only last 7 days
find $BACKUP_DIR -type f -mtime +7 -delete

echo "Backup completed: $(date)"
```

```bash
chmod +x /home/backup-supabase.sh

# Add to crontab (daily at 2 AM)
crontab -e
# Add:
0 2 * * * /home/backup-supabase.sh >> /var/log/supabase-backup.log 2>&1
```

### Update Supabase

```bash
cd /path/to/supabase/docker

# Pull latest
git pull origin master

# Update containers
docker compose pull
docker compose up -d
```

### Monitor Resources

```bash
# Check container status
docker compose ps

# Check resource usage
docker stats

# Check disk space
df -h
```

---

## Troubleshooting

### Containers Not Starting

```bash
# Check logs
docker compose logs -f

# Restart all
docker compose down
docker compose up -d
```

### Cannot Access from Internet

1. **Check firewall:**
   ```bash
   sudo ufw status
   sudo ufw allow 80/tcp
   sudo ufw allow 443/tcp
   ```

2. **Check port forwarding:** Use https://canyouseeme.org to test

3. **Check Cloudflare Tunnel:**
   ```bash
   sudo systemctl status cloudflared
   cloudflared tunnel info supabase
   ```

### SSL Certificate Issues

```bash
# Check certificate status
sudo certbot certificates

# Renew manually
sudo certbot renew

# Check Nginx config
sudo nginx -t
```

### Database Connection Failed

```bash
# Check if database is running
docker exec -it supabase-db psql -U postgres -c "SELECT 1"

# Check logs
docker logs supabase-db
```

### High Memory Usage

```bash
# Check usage
free -h
docker stats --no-stream

# Add swap if needed
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# Make permanent
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

---

## Quick Commands Reference

```bash
# Start Supabase
docker compose up -d

# Stop Supabase
docker compose down

# Restart Supabase
docker compose restart

# View logs
docker compose logs -f

# Check status
docker compose ps

# Connect to database
docker exec -it supabase-db psql -U postgres -d postgres

# Backup database
docker exec supabase-db pg_dump -U postgres postgres > backup.sql

# Restore database
cat backup.sql | docker exec -i supabase-db psql -U postgres -d postgres

# Check Cloudflare tunnel
sudo systemctl status cloudflared

# Restart Cloudflare tunnel
sudo systemctl restart cloudflared

# Check Nginx status
sudo systemctl status nginx

# Reload Nginx config
sudo nginx -t && sudo systemctl reload nginx

# Renew SSL
sudo certbot renew
```

---

## Security Checklist

- [ ] Changed default `POSTGRES_PASSWORD`
- [ ] Changed default `JWT_SECRET`
- [ ] Changed default `DASHBOARD_PASSWORD`
- [ ] SSL/HTTPS enabled
- [ ] Firewall configured (only ports 80, 443, 22)
- [ ] Regular backups scheduled
- [ ] UPS for power protection (optional)

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                      INTERNET                           │
└─────────────────────────┬───────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│  Cloudflare Tunnel / Port Forward + DuckDNS             │
│  (SSL Termination)                                      │
└─────────────────────────┬───────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                YOUR UBUNTU SERVER                       │
│  ┌─────────────────────────────────────────────────┐   │
│  │              Nginx (if port forwarding)          │   │
│  │              Port 80/443 → localhost:8000        │   │
│  └─────────────────────┬───────────────────────────┘   │
│                        │                                │
│                        ▼                                │
│  ┌─────────────────────────────────────────────────┐   │
│  │           Docker Compose (Supabase)              │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐        │   │
│  │  │ Postgres │ │   Auth   │ │ Storage  │        │   │
│  │  └──────────┘ └──────────┘ └──────────┘        │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐        │   │
│  │  │   Kong   │ │ Realtime │ │  Studio  │        │   │
│  │  │ (API GW) │ │          │ │          │        │   │
│  │  └──────────┘ └──────────┘ └──────────┘        │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

---

## Support

- **Supabase Docs**: https://supabase.com/docs
- **Cloudflare Tunnel**: https://developers.cloudflare.com/cloudflare-one/connections/connect-apps
- **DuckDNS**: https://www.duckdns.org/faqs.jsp
- **Docker Docs**: https://docs.docker.com

---

**Deployment Date**: ___________
**Server IP**: ___________
**Domain**: ___________
**Notes**: _________________________________
