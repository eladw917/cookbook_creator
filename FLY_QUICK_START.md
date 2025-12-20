# Fly.io Quick Start - TL;DR

The fastest way to deploy your Cookbook Creator to Fly.io.

## Prerequisites (5 minutes)

```bash
# Install flyctl
brew install flyctl

# Login
flyctl auth login
```

## Option 1: Automated Deployment (Recommended)

```bash
# Run the deployment script
./deploy-fly.sh

# Choose option 4 (Setup new deployment)
# Follow the prompts
```

Done! Your app will be live in ~10 minutes.

## Option 2: Manual Deployment

### Backend (5 minutes)

```bash
cd backend

# 1. Create app
flyctl launch --no-deploy
# Choose app name and region, say NO to databases

# 2. Create volume
flyctl volumes create cookbook_data --size 1 --region sjc

# 3. Set secrets
flyctl secrets set GEMINI_API_KEY="your-key"
flyctl secrets set CLERK_SECRET_KEY="your-key"
flyctl secrets set CORS_ORIGINS="https://your-frontend.fly.dev"
flyctl secrets set PUBLIC_PDF_BASE_URL="https://your-backend.fly.dev"

# 4. Deploy
flyctl deploy
```

### Frontend (5 minutes)

```bash
cd ../frontend

# 1. Update config (replace with your backend URL)
echo "export const API_BASE_URL = 'https://your-backend.fly.dev';" > src/config.ts

# 2. Create app
flyctl launch --no-deploy
# Choose app name and region, say NO to databases

# 3. Build and deploy
npm run build
flyctl deploy
```

## Update Clerk

Add these URLs to your Clerk dashboard:
- Frontend: `https://your-frontend.fly.dev`
- Backend: `https://your-backend.fly.dev`

## Common Commands

```bash
# View logs
flyctl logs

# Check status
flyctl status

# SSH into app
flyctl ssh console

# Scale memory
flyctl scale memory 512

# Open dashboard
flyctl dashboard
```

## Troubleshooting

**App won't start?**
```bash
flyctl logs  # Check for errors
```

**Database not persisting?**
```bash
flyctl ssh console
ls -la /data  # Should see cookbook.db
```

**Need to update secrets?**
```bash
flyctl secrets set KEY="value"
```

## Cost

Free tier includes:
- 3 VMs (256MB each)
- 1GB volume
- 160GB bandwidth/month

**Your app will cost: $0/month** (within free tier)

## Files Created

All configuration files are ready:
- ✅ `backend/fly.toml` - Backend config
- ✅ `backend/Dockerfile` - Backend container
- ✅ `frontend/fly.toml` - Frontend config
- ✅ `frontend/Dockerfile` - Frontend container
- ✅ `frontend/nginx.conf` - Web server config
- ✅ `deploy-fly.sh` - Automated deployment script

## Next Steps

1. Deploy using `./deploy-fly.sh`
2. Update Clerk dashboard
3. Test your app
4. Share with users! 🎉

## Need Help?

- Full guide: `FLY_DEPLOYMENT_GUIDE.md`
- Compare platforms: `DEPLOYMENT_COMPARISON.md`
- Fly.io docs: https://fly.io/docs/

