# Fly.io Usage Guide - Cookbook Creator

Complete guide for managing your deployed Cookbook Creator app on Fly.io.

## 📋 Table of Contents

- [Quick Reference](#quick-reference)
- [GitHub CI/CD](#github-cicd)
- [Viewing Logs](#viewing-logs)
- [Accessing Files](#accessing-files)
- [Database Management](#database-management)
- [Deployment](#deployment)
- [Monitoring](#monitoring)
- [Troubleshooting](#troubleshooting)
- [Scaling & Performance](#scaling--performance)
- [Cost Management](#cost-management)

---

## 🚀 Quick Reference

### Your App URLs

- **Frontend**: https://cookbook-creator-web.fly.dev/
- **Backend API**: https://cookbook-creator-api.fly.dev/
- **API Docs**: https://cookbook-creator-api.fly.dev/docs
- **Fly Dashboard**: https://fly.io/dashboard

### Essential Commands

```bash
# Check status
cd backend && flyctl status
cd frontend && flyctl status

# View logs
cd backend && flyctl logs
cd frontend && flyctl logs

# SSH into app
cd backend && flyctl ssh console

# Deploy changes
cd backend && flyctl deploy
cd frontend && flyctl deploy

# Open dashboard
flyctl dashboard
```

---

## 🔄 GitHub CI/CD

### Automatic Deployment

Your app now has **automatic deployment** via GitHub Actions! Every push to the `master` branch automatically deploys your app.

#### How It Works

```
Push to GitHub → CI Tests → Deploy Backend → Deploy Frontend → Live! 🚀
```

**Deployment Time:** ~40-50 seconds from push to live

#### Quick Commands

```bash
# Push changes (triggers automatic deployment)
git add .
git commit -m "Your changes"
git push origin master

# Watch deployment in real-time
gh run list
gh run watch

# View deployment logs
gh run view --log-failed
```

#### Monitor Deployments

**GitHub Actions Dashboard:**

1. Go to your repository on GitHub
2. Click **Actions** tab
3. See all workflow runs and their status

**Command Line:**

```bash
# List recent deployments
gh run list --workflow="Deploy to Fly.io"

# View specific deployment
gh run view <run-id>

# View failed deployment logs
gh run view <run-id> --log-failed
```

#### Manual Deployment (If Needed)

```bash
# Deploy backend manually
cd backend
flyctl deploy

# Deploy frontend manually
cd frontend
flyctl deploy

# Or trigger from GitHub UI
# Go to Actions → Deploy to Fly.io → Run workflow
```

#### CI/CD Files

Your repository includes:

- `.github/workflows/deploy.yml` - Automatic deployment workflow
- `.github/workflows/ci.yml` - Tests and linting workflow
- `backend/fly.toml` - Backend configuration
- `frontend/fly.toml` - Frontend configuration
- `backend/Dockerfile` - Backend container image
- `frontend/Dockerfile` - Frontend container image

#### GitHub Secrets

Required secret (already configured):

- `FLY_API_TOKEN` - Fly.io deployment token

To update:

```bash
# Generate new token
flyctl tokens create org personal

# Add to GitHub via CLI
gh secret set FLY_API_TOKEN

# Or via GitHub UI:
# Settings → Secrets and variables → Actions → FLY_API_TOKEN
```

#### Rollback

If a deployment has issues:

```bash
# Via Fly.io
flyctl releases --app cookbook-creator-api
flyctl releases rollback --app cookbook-creator-api

# Via GitHub
# Go to Actions → Find working deployment → Re-run jobs
```

#### Troubleshooting CI/CD

**Deployment fails:**

```bash
# Check logs
gh run view <run-id> --log-failed

# Common issues:
# - Missing environment variables on Fly.io
# - Build errors (test locally first)
# - Fly.io service issues (check status.fly.io)
```

**Re-run failed deployment:**

```bash
# Via CLI
gh run rerun <run-id>

# Via GitHub UI
# Actions → Failed run → Re-run failed jobs
```

---

## 📊 Viewing Logs

### Backend Logs (API, Python errors)

```bash
cd backend
flyctl logs
```

**What you'll see:**

- API requests and responses
- Python exceptions and errors
- Gemini API calls
- Database operations
- Cache operations

**Filter logs:**

```bash
flyctl logs | grep ERROR     # Only errors
flyctl logs | grep recipe    # Recipe-related logs
flyctl logs --tail 100       # Last 100 lines
```

### Frontend Logs (Nginx access logs)

```bash
cd frontend
flyctl logs
```

**What you'll see:**

- HTTP requests
- Static file serving
- 404 errors
- Health check pings

### Live Tail (Real-time)

```bash
flyctl logs --tail
```

Press `Ctrl+C` to stop.

### View in Dashboard

1. Go to https://fly.io/dashboard
2. Click your app (cookbook-creator-api or cookbook-creator-web)
3. Click **Monitoring** → **Logs**
4. View in browser with filtering options

---

## 📁 Accessing Files

### SSH into Backend

```bash
cd backend
flyctl ssh console
```

> **Note:** Fly automatically stops idle backend machines to stay within the free tier. Hitting the API URL will wake it up again, but `flyctl ssh console` requires a running VM.
>
> If you see “app … has no started VMs,” run:

```bash
flyctl machine start 0805740ae09338
flyctl status
```

Wait until the status shows `started` and the health checks are passing before rerunning `flyctl ssh console`.

### File Locations

#### **Application Code** (`/app`)

```bash
ls -la /app                  # Your Python files
cat /app/main.py             # View main.py
grep "def extract" /app/services.py  # Search code
```

**Note:** These files reset on every deploy.

#### **Persistent Data** (`/data`)

```bash
ls -la /data                 # Database and cache
ls -la /data/cache           # All cached videos
du -sh /data/*               # Disk usage
```

**Note:** These files persist across deploys.

#### **Inside a Video Cache**

```bash
ls -la /data/cache/VIDEO_ID
```

You'll see:

- `metadata.json` - Video info
- `transcript.json` - Video transcript
- `recipe.json` - Extracted recipe
- `timestamps.json` - Key moments
- `recipe.pdf` - Generated PDF
- `frames/` - Video screenshots

### View File Contents

```bash
# View JSON files
cat /data/cache/VIDEO_ID/recipe.json
cat /data/cache/VIDEO_ID/metadata.json

# View with formatting (if jq is installed)
apt-get update && apt-get install -y jq
cat /data/cache/VIDEO_ID/recipe.json | jq .

# View first/last lines
head -20 /app/main.py
tail -50 /app/services.py
```

### Download Files to Local Machine

#### Using SFTP

```bash
cd backend

# Download database
flyctl ssh sftp get /data/cookbook.db ./local-cookbook.db

# Download a recipe
flyctl ssh sftp get /data/cache/VIDEO_ID/recipe.json ./recipe.json

# Download entire cache
flyctl ssh sftp get -r /data/cache ./local-cache

# Download a PDF
flyctl ssh sftp get /data/cache/VIDEO_ID/recipe.pdf ./recipe.pdf
```

#### Interactive SFTP Session

```bash
cd backend
flyctl ssh sftp

# SFTP commands:
ls                          # List files
cd /data                    # Change directory
pwd                         # Current directory
get cookbook.db             # Download file
get -r cache                # Download directory
put local-file.txt          # Upload file
help                        # Show all commands
exit                        # Quit
```

### Upload Files to Backend

```bash
cd backend
flyctl ssh sftp put ./local-file.txt /data/local-file.txt
flyctl ssh sftp put -r ./local-folder /data/local-folder
```

---

## 🗄️ Database Management

### View Database via SSH

```bash
cd backend
flyctl ssh console

# Install sqlite3 if needed
apt-get update && apt-get install -y sqlite3

# Open database
sqlite3 /data/cookbook.db

# SQL commands:
SELECT * FROM users;
SELECT * FROM recipes LIMIT 10;
SELECT COUNT(*) FROM recipes;
.tables                     # List all tables
.schema users               # Show table structure
.quit                       # Exit sqlite
```

### Download Database

```bash
cd backend
flyctl ssh sftp get /data/cookbook.db ./cookbook-$(date +%Y%m%d).db
```

### View Database Locally

After downloading, use:

- **DB Browser for SQLite** (GUI app)
- **VS Code SQLite extension**
- **Command line**: `sqlite3 cookbook-YYYYMMDD.db`

### Backup Database (Recommended Weekly)

```bash
cd backend

# Create backup
flyctl ssh sftp get /data/cookbook.db ./backups/cookbook-$(date +%Y%m%d).db

# Or create a backup script
cat > backup.sh << 'EOF'
#!/bin/bash
cd backend
mkdir -p backups
flyctl ssh sftp get /data/cookbook.db ./backups/cookbook-$(date +%Y%m%d).db
echo "Backup created: backups/cookbook-$(date +%Y%m%d).db"
EOF

chmod +x backup.sh
./backup.sh
```

### Restore Database

```bash
cd backend

# Upload backup
flyctl ssh sftp put ./backups/cookbook-20241220.db /data/cookbook.db

# Restart app to pick up changes
flyctl apps restart
```

---

## 🚀 Deployment

### Deploy Backend Changes

```bash
cd backend

# Deploy
flyctl deploy

# Deploy with specific Dockerfile
flyctl deploy --dockerfile Dockerfile

# Deploy and watch logs
flyctl deploy && flyctl logs
```

### Deploy Frontend Changes

```bash
cd frontend

# Build locally first (optional, to test)
npm run build

# Deploy
flyctl deploy
```

### Update Environment Variables

```bash
cd backend

# Set a secret
flyctl secrets set NEW_VAR="value"

# Set multiple secrets
flyctl secrets set VAR1="value1" VAR2="value2"

# List secrets (names only, not values)
flyctl secrets list

# Remove a secret
flyctl secrets unset OLD_VAR
```

**Note:** Setting secrets triggers an automatic redeploy.

### Rollback to Previous Version

```bash
# List releases
flyctl releases

# Rollback to previous release
flyctl releases rollback
```

---

## 📈 Monitoring

### Check App Status

```bash
cd backend
flyctl status

cd frontend
flyctl status
```

**Shows:**

- App name and region
- Number of machines
- Health status
- Public IP addresses
- URLs

### View Metrics

```bash
# Open dashboard
flyctl dashboard
```

In dashboard, go to **Metrics** to see:

- CPU usage
- Memory usage
- Request rate
- Response times
- Network traffic

### Health Checks

Your apps have automatic health checks:

**Backend:** `GET /` - Returns `{"message": "Recipe Extract API"}`
**Frontend:** `GET /` - Returns index.html

View health check status:

```bash
flyctl status
```

### Monitor Volume Usage

```bash
cd backend
flyctl ssh console

# Check disk usage
df -h /data

# Check size of database
du -h /data/cookbook.db

# Check size of cache
du -sh /data/cache/*

# Count cached videos
ls /data/cache | wc -l
```

---

## 🔧 Troubleshooting

### App Not Responding

```bash
# Check status
flyctl status

# Check logs for errors
flyctl logs | grep ERROR

# Restart app
flyctl apps restart

# Check if machines are running
flyctl machine list
```

### Database Issues

```bash
# SSH in and check database
flyctl ssh console
ls -la /data/cookbook.db     # Check if exists
du -h /data/cookbook.db      # Check size

# Test database
sqlite3 /data/cookbook.db "SELECT COUNT(*) FROM users;"
```

### Cache Issues

```bash
# Check cache size
flyctl ssh console
du -sh /data/cache

# Clear specific video cache
rm -rf /data/cache/VIDEO_ID

# Clear all cache (careful!)
rm -rf /data/cache/*
```

### Out of Memory

```bash
# Check current memory
flyctl status

# Scale up memory
flyctl scale memory 512

# Or scale to 1GB
flyctl scale memory 1024
```

### Volume Full

```bash
# Check usage
flyctl ssh console
df -h /data

# Clean up old cache
cd /data/cache
ls -lt | tail -20           # See oldest videos
rm -rf OLD_VIDEO_ID         # Delete specific videos

# Or resize volume (costs more)
flyctl volumes extend cookbook_data --size 3
```

### SSL/HTTPS Issues

```bash
# Check certificates
flyctl certs list

# Force certificate renewal
flyctl certs create cookbook-creator-api.fly.dev
```

### View Machine Details

```bash
# List all machines
flyctl machine list

# Get specific machine info
flyctl machine status MACHINE_ID

# SSH into specific machine
flyctl ssh console --machine MACHINE_ID
```

---

## ⚡ Scaling & Performance

### Current Setup (Free Tier)

- **Backend**: 1 machine, 256MB RAM, shared CPU
- **Frontend**: 2 machines, 256MB RAM, shared CPU
- **Volume**: 1GB persistent storage

### Scale Memory

```bash
cd backend

# View current resources
flyctl status

# Scale to 512MB
flyctl scale memory 512

# Scale to 1GB
flyctl scale memory 1024
```

**Cost:** 512MB = +$1.94/month per machine

### Scale Machine Count

```bash
# Add more machines (for redundancy)
flyctl scale count 2

# Scale back down
flyctl scale count 1
```

**Note:** Multiple machines require shared database (PostgreSQL) or read-only replicas.

### Auto-Stop/Start

Your apps are configured to auto-stop when idle (saves resources):

```toml
auto_stop_machines = true
auto_start_machines = true
min_machines_running = 0
```

**First request after idle:** ~1-2 seconds to wake up.

**To keep always running:**

```bash
# Edit fly.toml
min_machines_running = 1

# Redeploy
flyctl deploy
```

### Upgrade to Dedicated CPU

```bash
# View current VM type
flyctl status

# Scale to dedicated CPU
flyctl scale vm dedicated-cpu-1x

# Scale back to shared
flyctl scale vm shared-cpu-1x
```

**Cost:** Dedicated CPU = ~$15-30/month

---

## 💰 Cost Management

### Current Usage (Free Tier)

Your app should be **$0/month** within free tier:

- 3 VMs (256MB each) = Free
- 1GB volume = Free
- 160GB bandwidth/month = Free

### Monitor Costs

```bash
# View billing
flyctl dashboard
```

Go to **Billing** section to see:

- Current usage
- Projected monthly cost
- Resource breakdown

### Cost Optimization Tips

1. **Auto-stop enabled** ✅ (saves compute when idle)
2. **Shared CPU** ✅ (free tier)
3. **256MB RAM** ✅ (free tier)
4. **1GB volume** ✅ (free tier)

### If You Exceed Free Tier

**Typical costs:**

- Extra volume storage: $0.15/GB/month
- 512MB RAM: +$1.94/VM/month
- Dedicated CPU: ~$15-30/month
- Extra bandwidth: $0.02/GB

### Set Spending Limit

In Fly.io dashboard:

1. Go to **Billing**
2. Set spending alerts
3. Add payment method (required even for free tier)

---

## 🎯 Best Practices

### Regular Maintenance

**Weekly:**

- Check logs for errors: `flyctl logs | grep ERROR`
- Monitor disk usage: `flyctl ssh console` → `df -h /data`
- Backup database: `flyctl ssh sftp get /data/cookbook.db`

**Monthly:**

- Review metrics in dashboard
- Clean up old cache if needed
- Check for Fly.io updates: `brew upgrade flyctl`

### Security

1. **Never commit secrets** - Use `flyctl secrets set`
2. **Keep backups** - Download database regularly
3. **Monitor logs** - Watch for suspicious activity
4. **Update dependencies** - Keep packages up to date

### Development Workflow

1. **Develop locally** - Test with `npm run dev` and `uvicorn`
2. **Test changes** - Make sure everything works
3. **Deploy** - `flyctl deploy`
4. **Monitor** - Check logs for errors
5. **Rollback if needed** - `flyctl releases rollback`

---

## 📞 Support & Resources

### Fly.io Resources

- **Documentation**: https://fly.io/docs/
- **Community Forum**: https://community.fly.io/
- **Status Page**: https://status.fly.io/
- **Discord**: https://fly.io/discord

### Common Commands Cheat Sheet

```bash
# Status & Info
flyctl status                # App status
flyctl info                  # Detailed info
flyctl releases              # Deployment history
flyctl machine list          # List machines

# Logs & Monitoring
flyctl logs                  # View logs
flyctl logs --tail           # Live logs
flyctl dashboard             # Open web dashboard

# Deployment
flyctl deploy                # Deploy app
flyctl apps restart          # Restart app
flyctl releases rollback     # Rollback

# Access
flyctl ssh console           # SSH into app
flyctl ssh sftp              # SFTP access

# Scaling
flyctl scale memory 512      # Scale RAM
flyctl scale count 2         # Scale machines
flyctl volumes list          # List volumes

# Secrets
flyctl secrets list          # List secrets
flyctl secrets set KEY=val   # Set secret
flyctl secrets unset KEY     # Remove secret

# Help
flyctl help                  # Show help
flyctl [command] --help      # Command help
```

---

## 🎉 Quick Start Checklist

- [ ] Bookmark your app URLs
- [ ] Set up weekly database backups
- [ ] Add Fly.io URLs to Clerk dashboard
- [ ] Test the deployed app
- [ ] Monitor logs for first few days
- [ ] Join Fly.io community forum
- [ ] Set up spending alerts

---

**Last Updated:** December 2024  
**App Version:** 1.0  
**Fly.io Region:** San Jose (sjc)
