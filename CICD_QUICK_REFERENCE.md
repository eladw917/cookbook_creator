# GitHub CI/CD Quick Reference Card

## 🚦 Current Status

```
✅ GitHub Actions workflows created
✅ Fly.io token generated
⏳ Waiting: Add token to GitHub secrets
⏳ Waiting: Commit and push workflows
```

## ⚡ Quick Commands

### Deploy Now
```bash
git add .
git commit -m "Your message"
git push origin master
# Automatic deployment starts!
```

### Check Status
```bash
# Fly.io apps
flyctl status --app cookbook-creator-api
flyctl status --app cookbook-creator-web

# View logs
flyctl logs --app cookbook-creator-api
flyctl logs --app cookbook-creator-web
```

### Manual Deploy
```bash
# Backend
cd backend && flyctl deploy

# Frontend
cd frontend && flyctl deploy
```

### Rollback
```bash
flyctl releases rollback --app cookbook-creator-api
flyctl releases rollback --app cookbook-creator-web
```

## 📋 Setup Checklist

- [ ] **Step 1**: Add `FLY_API_TOKEN` to GitHub secrets
  - Token is in your clipboard (run `./setup-github-secrets.sh` again if needed)
  - Go to: GitHub repo → Settings → Secrets and variables → Actions
  - Add secret: `FLY_API_TOKEN`

- [ ] **Step 2**: Commit workflow files
  ```bash
  git add .github/workflows/ *.md setup-github-secrets.sh
  git commit -m "Add GitHub Actions CI/CD"
  git push origin master
  ```

- [ ] **Step 3**: Watch deployment
  - Go to GitHub repo → Actions tab
  - Watch workflows run
  - Check for green checkmarks

- [ ] **Step 4**: Verify apps are running
  - Visit: https://cookbook-creator-api.fly.dev
  - Visit: https://cookbook-creator-web.fly.dev

## 🔑 Required Secrets

### GitHub Secrets
- `FLY_API_TOKEN` - For automated deployments

### Fly.io Secrets (Backend)
```bash
flyctl secrets set GEMINI_API_KEY="..." --app cookbook-creator-api
flyctl secrets set CLERK_SECRET_KEY="..." --app cookbook-creator-api
flyctl secrets set YOUTUBE_API_KEY="..." --app cookbook-creator-api
flyctl secrets set LULU_API_KEY="..." --app cookbook-creator-api
flyctl secrets set LULU_API_SECRET="..." --app cookbook-creator-api
```

## 🎯 Workflows

### CI Workflow (`.github/workflows/ci.yml`)
- **Triggers**: Push, Pull Request
- **Runs**: Tests, linting, builds
- **Duration**: ~2-3 minutes

### Deploy Workflow (`.github/workflows/deploy.yml`)
- **Triggers**: Push to master/main
- **Runs**: Deploys to Fly.io
- **Duration**: ~3-5 minutes
- **Order**: Backend → Frontend

## 🔗 Important Links

- **GitHub Actions**: [Your Repo] → Actions tab
- **Fly.io Dashboard**: https://fly.io/dashboard
- **Backend App**: https://cookbook-creator-api.fly.dev
- **Frontend App**: https://cookbook-creator-web.fly.dev

## 📚 Documentation

- `CICD_NEXT_STEPS.md` - Complete next steps guide
- `GITHUB_CICD_SETUP.md` - Detailed setup documentation
- `setup-github-secrets.sh` - Helper script for token setup

## 🆘 Quick Troubleshooting

| Problem | Solution |
|---------|----------|
| Deployment fails with "unauthorized" | Check GitHub secret `FLY_API_TOKEN` is set |
| Build fails | Check Actions logs, run tests locally |
| App won't start | Check Fly.io logs: `flyctl logs --app cookbook-creator-api` |
| Secrets missing | Set with: `flyctl secrets set KEY=value --app APP_NAME` |

## 💡 Pro Tips

1. **Test locally first**: `./servers.sh start`
2. **Use pull requests**: Get CI feedback before merging
3. **Monitor deployments**: Check Actions tab after pushing
4. **Keep secrets secure**: Never commit `.env` files
5. **Manual trigger**: Actions tab → Deploy workflow → Run workflow

---

**Ready to deploy?** Run: `./setup-github-secrets.sh`

