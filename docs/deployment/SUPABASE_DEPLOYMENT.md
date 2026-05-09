# Self-Hosted Supabase Deployment Guide

> Complete guide for deploying Supabase on a VPS using Docker Compose

**Status**: Production Ready
**Last Updated**: 2026-03-18
**Estimated Setup Time**: 30-45 minutes

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Step 1: SSH Into Your VPS](#step-1-ssh-into-your-vps)
3. [Step 2: Install Docker & Docker Compose](#step-2-install-docker--docker-compose)
4. [Step 3: Clone Supabase Repository](#step-3-clone-supabase-repository)
5. [Step 4: Configure Environment Variables](#step-4-configure-environment-variables)
6. [Step 5: Start Supabase](#step-5-start-supabase-with-docker-compose)
7. [Step 6: Set Up SSL with Nginx](#step-6-set-up-ssl-with-nginx-reverse-proxy)
8. [Step 7: Get Your Credentials](#step-7-get-your-supabase-credentials)
9. [Step 8: Update Vercel](#step-8-update-vercel-environment-variables)
10. [Step 9: Deploy Frontend](#step-9-deploy-to-vercel)
11. [Troubleshooting](#troubleshooting)
12. [Quick Commands](#quick-commands-reference)

---

## Prerequisites

Before you begin, ensure you have:

- ✅ Ubuntu 20.04 or 22.04 VPS
- ✅ Your domain (e.g., `api.yourdomain.com`)
- ✅ DNS records pointing your domain to your VPS IP
- ✅ SSH access to your VPS as `root` or with `sudo` privileges
- ✅ Minimum 2GB RAM, 20GB storage (4GB+ RAM recommended)
- ✅ Ports 80 and 443 open (HTTP/HTTPS)

---

## Step 1: SSH Into Your VPS

```bash
ssh root@your-vps-ip
```

Replace `your-vps-ip` with your actual VPS IP address.

---

## Step 2: Install Docker & Docker Compose

### Update System Packages

```bash
apt-get update && apt-get upgrade -y
```

### Install Docker

```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
```

### Install Docker Compose

```bash
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose
```

### Verify Installation

```bash
docker --version
docker-compose --version
```

You should see version outputs for both commands.

---

## Step 3: Clone Supabase Repository

```bash
cd /opt
git clone --depth 1 https://github.com/supabase/supabase.git
cd supabase/docker

# Copy example env configuration
cp .env.example .env
```

---

## Step 4: Configure Environment Variables

Edit the `.env` file with your settings:

```bash
nano .env
```

### Required Configuration

Update these variables in your `.env` file:

```env
# ====== CRITICAL SETTINGS ======

# PostgreSQL Database Password (MUST BE STRONG)
POSTGRES_PASSWORD=your_super_secure_postgres_password_here_at_least_20_chars

# JWT Secret (Used for authentication tokens - MUST BE STRONG)
JWT_SECRET=your_super_secure_jwt_secret_here_at_least_32_chars

# Your Domain Configuration
SITE_URL=https://yourdomain.com
API_EXTERNAL_URL=https://api.yourdomain.com

# ====== EMAIL CONFIGURATION (OPTIONAL BUT RECOMMENDED) ======

SMTP_ADMIN_EMAIL=admin@yourdomain.com
SMTP_HOST=smtp.gmail.com  # or your email provider (Sendgrid, AWS SES, etc.)
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password  # Use app-specific password, not your regular password

# ====== ADDITIONAL CONFIGURATION ======

DB_NAMESPACE=auth
SECURE_PASSWORD=your_secure_admin_dashboard_password
```

### Email Provider Examples

**Gmail (with App Password):**
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=xxxx xxxx xxxx xxxx  # 16-char app password from Google Account
```

**SendGrid:**
```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=SG.your_sendgrid_api_key_here
```

**AWS SES:**
```env
SMTP_HOST=email-smtp.region.amazonaws.com
SMTP_PORT=587
SMTP_USER=your-ses-username
SMTP_PASS=your-ses-password
```

### Save Configuration

Press `Ctrl+X`, then `Y`, then `Enter` to save.

---

## Step 5: Start Supabase with Docker Compose

Navigate to the docker directory and start all services:

```bash
cd /opt/supabase/docker
docker-compose up -d
```

### Monitor Startup

```bash
# Check status of all containers
docker-compose ps
```

**Wait 2-3 minutes** for all services to fully start. You should see:

```
NAME                 STATUS
supabase_db          Up (healthy)
supabase_api         Up (healthy)
supabase_auth        Up (healthy)
supabase_realtime    Up (healthy)
supabase_storage     Up (healthy)
supabase_analytics   Up (healthy)
```

### Check Logs (if any service isn't healthy)

```bash
# View logs for all services
docker-compose logs -f

# View logs for specific service
docker-compose logs -f supabase_api
```

---

## Step 6: Set Up SSL with Nginx Reverse Proxy

### Install Nginx & Certbot

```bash
apt-get install -y nginx certbot python3-certbot-nginx
```

### Create Nginx Configuration

```bash
nano /etc/nginx/sites-available/supabase
```

Paste this configuration:

```nginx
# Upstream Supabase services
upstream supabase_rest {
    server localhost:8000;
}

upstream supabase_realtime {
    server localhost:8080;
}

# HTTP server (will be redirected to HTTPS by certbot)
server {
    listen 80;
    server_name api.yourdomain.com;

    # Certbot will add SSL redirect here automatically

    location / {
        proxy_pass http://supabase_rest;
        proxy_http_version 1.1;

        # WebSocket support
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        # Headers
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;

        # Timeouts
        proxy_connect_timeout 600s;
        proxy_send_timeout 600s;
        proxy_read_timeout 600s;

        # Buffering
        proxy_buffering on;
        proxy_buffer_size 128k;
        proxy_buffers 4 256k;
    }

    # Realtime endpoint
    location /realtime/v1 {
        proxy_pass http://supabase_realtime;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Save with `Ctrl+X`, `Y`, `Enter`.

### Enable Nginx Configuration

```bash
# Create symbolic link
ln -s /etc/nginx/sites-available/supabase /etc/nginx/sites-enabled/

# Test configuration
nginx -t

# Expected output: "syntax is ok" and "test is successful"
```

### Start Nginx

```bash
systemctl start nginx
systemctl enable nginx  # Auto-start on reboot
```

### Get SSL Certificate with Let's Encrypt

```bash
certbot --nginx -d api.yourdomain.com
```

Follow the prompts:
- Enter your email
- Agree to terms
- Choose auto-redirect to HTTPS (option 2)

**Certbot will automatically:**
- ✅ Create SSL certificate
- ✅ Update Nginx config
- ✅ Set up auto-renewal

Verify auto-renewal:

```bash
certbot renew --dry-run
```

---

## Step 7: Get Your Supabase Credentials

### Access Supabase Dashboard

Open your browser and visit:

```
https://api.yourdomain.com
```

Login with the dashboard credentials from `.env`:
- Email: `admin@yourdomain.com` (or `admin@example.com`)
- Password: `SECURE_PASSWORD` value from `.env`

### Get Your Project Credentials

1. Click **Settings** → **API** in the left sidebar
2. Copy these values (you'll need them for Vercel):

| Credential | Location | Purpose |
|---|---|---|
| **Project URL** | At the top of API page | API endpoint |
| **anon (public)** | Under "Project API keys" | Client-side requests |
| **service_role** | Under "Project API keys" | Server-side requests |

**Example values:**
```
Project URL: https://api.yourdomain.com
Anon Key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Service Role: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## Step 8: Update Vercel Environment Variables

### Go to Vercel Dashboard

1. Visit https://vercel.com/dashboard
2. Select your project
3. Go to **Settings** → **Environment Variables**

### Add Production Variables

For **Production** environment, add:

```
Key: NEXT_PUBLIC_SUPABASE_URL
Value: https://api.yourdomain.com

Key: NEXT_PUBLIC_SUPABASE_ANON_KEY
Value: [paste your anon key from Step 7]

Key: SUPABASE_SERVICE_ROLE_KEY
Value: [paste your service_role key from Step 7]
```

> ⚠️ **Important**: `NEXT_PUBLIC_*` variables are exposed to the browser (anon key is safe). The `SUPABASE_SERVICE_ROLE_KEY` should only be used server-side (API routes) and **never exposed to the client**.

---

## Step 9: Deploy to Vercel

Push your code changes to trigger auto-deployment:

```bash
cd /path/to/your/local/bapf/project

git add .
git commit -m "Update Supabase backend to self-hosted deployment"
git push origin main
```

Vercel will automatically:
1. ✅ Detect the push
2. ✅ Build your application
3. ✅ Use the new environment variables
4. ✅ Deploy to production

Monitor deployment in Vercel Dashboard → **Deployments**.

---

## Troubleshooting

### Docker Containers Not Starting

**Problem:** Services show "Exited" or "Unhealthy"

**Solution:**
```bash
# Check logs
docker-compose logs -f supabase_db

# Restart all services
docker-compose restart

# Full rebuild
docker-compose down
docker-compose up -d
```

### SSL Certificate Issues

**Problem:** "ERR_SSL_PROTOCOL_ERROR" or certificate warnings

**Solution:**
```bash
# Check certificate status
certbot certificates

# Manually renew certificate
certbot renew -v

# Check Nginx logs
tail -f /var/log/nginx/error.log
```

### Database Connection Fails

**Problem:** "Cannot connect to Supabase" from frontend

**Checklist:**
- ✅ Check DNS: `nslookup api.yourdomain.com`
- ✅ Check firewall: `sudo ufw allow 80,443/tcp`
- ✅ Check Nginx: `nginx -t` and `systemctl status nginx`
- ✅ Check Supabase: `docker-compose ps` (all should be healthy)
- ✅ Review Nginx logs: `tail -f /var/log/nginx/access.log`

### High Memory Usage

**Problem:** VPS running slowly, out of memory

**Solution:**
```bash
# Check current usage
free -h
docker stats

# Increase swap (if needed)
fallocate -l 4G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
```

### Email Not Sending

**Problem:** Password reset emails not received

**Checklist:**
- ✅ Check SMTP credentials in `.env`
- ✅ Check spam/junk folder
- ✅ Verify email provider allows SMTP
- ✅ Check logs: `docker-compose logs supabase_api | grep -i mail`

---

## Quick Commands Reference

### Service Management

```bash
# Start Supabase
docker-compose -f /opt/supabase/docker/docker-compose.yml up -d

# Stop Supabase
docker-compose -f /opt/supabase/docker/docker-compose.yml down

# Restart all services
docker-compose -f /opt/supabase/docker/docker-compose.yml restart

# Restart specific service
docker-compose -f /opt/supabase/docker/docker-compose.yml restart supabase_api
```

### Monitoring

```bash
# Check service status
docker-compose -f /opt/supabase/docker/docker-compose.yml ps

# View live logs
docker-compose -f /opt/supabase/docker/docker-compose.yml logs -f

# View specific service logs
docker-compose -f /opt/supabase/docker/docker-compose.yml logs -f supabase_db

# Check container resource usage
docker stats
```

### Database Access

```bash
# Connect to PostgreSQL directly
docker exec -it supabase_db psql -U postgres -d postgres

# Backup database
docker exec supabase_db pg_dump -U postgres postgres > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore from backup
docker exec -i supabase_db psql -U postgres postgres < backup_20260318_120000.sql
```

### Update Supabase

```bash
cd /opt/supabase/docker

# Pull latest changes
git pull origin master

# Restart with new version
docker-compose pull
docker-compose up -d
```

### Certificate Management

```bash
# Check certificate expiration
certbot certificates

# Manually renew
certbot renew

# Test auto-renewal (dry-run)
certbot renew --dry-run

# View renewal logs
tail /var/log/letsencrypt/letsencrypt.log
```

---

## Security Best Practices

### 1. Strong Passwords

- Use **at least 20 characters** for `POSTGRES_PASSWORD`
- Use **at least 32 characters** for `JWT_SECRET`
- Use **unique characters** (uppercase, lowercase, numbers, symbols)

### 2. Firewall Configuration

```bash
# Allow only necessary ports
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS
ufw default deny incoming
ufw enable
```

### 3. Regular Backups

```bash
# Create daily backup script
cat > /home/backup-supabase.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/backups/supabase"
mkdir -p $BACKUP_DIR
docker exec supabase_db pg_dump -U postgres postgres > $BACKUP_DIR/backup_$(date +%Y%m%d_%H%M%S).sql
# Keep only last 7 days
find $BACKUP_DIR -type f -mtime +7 -delete
EOF

chmod +x /home/backup-supabase.sh

# Add to crontab (runs daily at 2 AM)
(crontab -l 2>/dev/null; echo "0 2 * * * /home/backup-supabase.sh") | crontab -
```

### 4. Monitor Services

```bash
# Install monitoring (optional)
apt-get install -y htop

# Run health checks
watch -n 5 'docker-compose -f /opt/supabase/docker/docker-compose.yml ps'
```

---

## Performance Tips

### 1. Optimize PostgreSQL

Add to `.env` in docker-compose settings for larger databases:

```env
# Connection pooling
DATABASE_POOLING_MODE=transaction
DATABASE_POOL_SIZE=20
DATABASE_MAX_POOL_SIZE=50
```

### 2. Enable Caching

In your Next.js frontend (`proxy.ts`), caching is already configured.

### 3. Monitor Resource Usage

```bash
# Watch real-time usage
docker stats --no-stream
```

---

## Support & Resources

- **Supabase Docs**: https://supabase.com/docs
- **Docker Docs**: https://docs.docker.com
- **Nginx Docs**: https://nginx.org/en/docs
- **Let's Encrypt**: https://letsencrypt.org
- **GitHub Issues**: https://github.com/supabase/supabase/issues

---

## Checklist Summary

- [ ] Git clone Supabase repository
- [ ] Configure `.env` with strong passwords
- [ ] Start Docker containers successfully
- [ ] Verify all services are healthy
- [ ] Configure Nginx reverse proxy
- [ ] Obtain SSL certificate with Certbot
- [ ] Access dashboard at `https://api.yourdomain.com`
- [ ] Get project credentials (URL, anon key, service_role)
- [ ] Update Vercel environment variables
- [ ] Deploy frontend to Vercel
- [ ] Test login and core functionality
- [ ] Set up automated backups
- [ ] Configure email notifications
- [ ] Enable monitoring and alerts

---

## Questions?

For issues or questions:
1. Check the [Troubleshooting](#troubleshooting) section
2. Review Supabase documentation
3. Check Docker logs: `docker-compose logs -f`
4. Contact Supabase support

---

**Deployment Date**: ___________
**Domain**: api.yourdomain.com
**Deployed By**: ___________
**Notes**: _________________________________

