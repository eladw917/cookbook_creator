# Fly.io Deployment Guide

Complete guide to deploy your Cookbook Creator app to Fly.io with persistent storage.

## Why Fly.io?

- ✅ **Free tier**: 3 shared-cpu VMs, 160GB bandwidth/month
- ✅ **Persistent volumes**: Perfect for SQLite + cache files
- ✅ **Global edge deployment**: Fast worldwide
- ✅ **Simple setup**: One command to deploy
- ✅ **Auto SSL**: Free HTTPS certificates

## Prerequisites

1. **Install flyctl** (Fly.io CLI):
   ```bash
   # macOS
   brew install flyctl
   
   # Or using install script
   curl -L https://fly.io/install.sh | sh
   ```

2. **Create Fly.io account** (if you don't have one):
   ```bash
   flyctl auth signup
   # Or login if you have an account
   flyctl auth login
   ```

## Architecture

Your app will be deployed as:
- **Backend**: Python FastAPI app with persistent volume for SQLite + cache
- **Frontend**: Static React app served via CDN
- **Database**: SQLite on persistent volume (1GB free)
- **Cache**: Video frames stored on same volume

## Step-by-Step Deployment

### 1. Backend Deployment

#### A. Initialize Fly.io app
```bash
cd backend
flyctl launch --no-deploy
```

When prompted:
- **App name**: Choose a unique name (e.g., `cookbook-creator-api`)
- **Region**: Choose closest to you (e.g., `sjc` for San Jose)
- **PostgreSQL**: Say **NO** (we're using SQLite)
- **Redis**: Say **NO**

#### B. Create persistent volume
```bash
# Create 1GB volume (free tier)
flyctl volumes create cookbook_data --size 1 --region sjc

# Or 3GB if you need more space (paid: ~$0.15/GB/month)
# flyctl volumes create cookbook_data --size 3 --region sjc
```

#### C. Set environment variables
```bash
# Set your API keys
flyctl secrets set GEMINI_API_KEY="your-gemini-api-key-here"
flyctl secrets set CLERK_SECRET_KEY="your-clerk-secret-key-here"

# Set CORS origins (will be updated after frontend deployment)
flyctl secrets set CORS_ORIGINS="https://your-frontend-url.fly.dev"

# Set public PDF base URL for Lulu integration
flyctl secrets set PUBLIC_PDF_BASE_URL="https://your-backend-app.fly.dev"
```

#### D. Deploy backend
```bash
flyctl deploy
```

Your backend will be available at: `https://your-backend-app.fly.dev`

### 2. Frontend Deployment

#### A. Update frontend config
Edit `frontend/src/config.ts`:
```typescript
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://your-backend-app.fly.dev';
```

#### B. Create production build
```bash
cd ../frontend
npm run build
```

#### C. Initialize Fly.io app for frontend
```bash
flyctl launch --no-deploy
```

When prompted:
- **App name**: Choose a unique name (e.g., `cookbook-creator-web`)
- **Region**: Same as backend
- **PostgreSQL/Redis**: Say **NO**

#### D. Deploy frontend
```bash
flyctl deploy
```

Your frontend will be available at: `https://your-frontend-app.fly.dev`

### 3. Update CORS Settings

Now that you have your frontend URL, update the backend CORS:
```bash
cd ../backend
flyctl secrets set CORS_ORIGINS="https://your-frontend-app.fly.dev"
```

### 4. Update Clerk Settings

1. Go to your Clerk dashboard
2. Add your production URLs to allowed origins:
   - Frontend: `https://your-frontend-app.fly.dev`
   - Backend: `https://your-backend-app.fly.dev`

## Configuration Files Explained

### Backend (`fly.toml`)
- Configures Python app with Uvicorn
- Mounts persistent volume at `/data`
- Sets up health checks
- Configures memory and CPU

### Frontend (`fly.toml`)
- Serves static React build
- Uses nginx for routing
- Handles SPA routing (all routes → index.html)

### Backend (`Dockerfile`)
- Multi-stage build for smaller image
- Installs Playwright dependencies
- Sets up Python environment
- Configures volume paths

### Frontend (`Dockerfile`)
- Multi-stage build (Node → Nginx)
- Builds React app
- Serves static files efficiently

## Managing Your Deployment

### View logs
```bash
# Backend logs
cd backend
flyctl logs

# Frontend logs
cd frontend
flyctl logs
```

### SSH into your app
```bash
flyctl ssh console
```

### Check volume usage
```bash
flyctl volumes list
```

### Scale your app
```bash
# Scale to 2 instances (requires shared volume or PostgreSQL)
flyctl scale count 2

# Scale memory
flyctl scale memory 512  # 512MB
```

### Monitor app
```bash
flyctl status
flyctl dashboard  # Opens web dashboard
```

## Database Backups

Since you're using SQLite on a volume, you should backup regularly:

```bash
# SSH into app
flyctl ssh console

# Create backup
cd /data
tar -czf backup-$(date +%Y%m%d).tar.gz cookbook.db cache/

# Download backup (from local machine)
flyctl ssh sftp get /data/backup-YYYYMMDD.tar.gz
```

**Automated backups**: Consider setting up a cron job or using Fly.io's snapshot feature.

## Troubleshooting

### App won't start
```bash
# Check logs
flyctl logs

# Common issues:
# - Missing environment variables
# - Volume not mounted
# - Port configuration
```

### Database not persisting
```bash
# Verify volume is mounted
flyctl ssh console
ls -la /data

# Should see cookbook.db and cache/
```

### Out of memory
```bash
# Check current allocation
flyctl status

# Increase memory (costs more)
flyctl scale memory 512
```

### Volume full
```bash
# Check usage
flyctl ssh console
df -h /data

# Clean up cache
cd /data/cache
rm -rf old-video-folders/
```

## Cost Estimation

### Free Tier (Generous!)
- 3 shared-cpu-1x VMs (256MB RAM each)
- 1GB persistent volume
- 160GB outbound bandwidth/month
- **Cost**: $0/month

### Typical Production Setup
- Backend: 1x shared-cpu-1x (256MB) = **Free**
- Frontend: 1x shared-cpu-1x (256MB) = **Free**
- Volume: 3GB = **$0.45/month**
- Bandwidth: Usually within free tier
- **Total**: ~$0.45-$5/month

### If You Need More
- Upgrade to 512MB RAM: +$1.94/VM/month
- Dedicated CPU: ~$15-30/month
- Larger volume: $0.15/GB/month

## Migrating from SQLite to PostgreSQL (Optional)

If you need to scale to multiple instances, you'll need PostgreSQL:

```bash
# Create PostgreSQL database
flyctl postgres create

# Get connection string
flyctl postgres connect -a your-postgres-app

# Update backend code to use PostgreSQL
# (Already supported via DATABASE_URL env var)
```

## Custom Domain (Optional)

```bash
# Add your domain
flyctl certs add yourdomain.com

# Add DNS records (shown in output)
# CNAME: yourdomain.com → your-app.fly.dev

# Verify
flyctl certs show yourdomain.com
```

## Next Steps

1. ✅ Deploy backend
2. ✅ Deploy frontend
3. ✅ Update CORS settings
4. ✅ Update Clerk settings
5. ✅ Test the app
6. 🎉 Share with users!

## Support

- **Fly.io Docs**: https://fly.io/docs/
- **Fly.io Community**: https://community.fly.io/
- **Status**: https://status.fly.io/

## Tips

1. **Use `flyctl doctor`** to diagnose issues
2. **Monitor costs** in the Fly.io dashboard
3. **Set up alerts** for volume usage
4. **Keep backups** of your database
5. **Use staging environment** for testing (create another app)

---

**Happy Deploying! 🚀**

