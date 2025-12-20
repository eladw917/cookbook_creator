# GitHub CI/CD Setup Guide

This guide will help you set up Continuous Integration and Continuous Deployment (CI/CD) for your Cookbook Creator project using GitHub Actions and Fly.io.

## 📋 Overview

We've created two GitHub Actions workflows:

1. **CI Workflow** (`.github/workflows/ci.yml`) - Runs on every push and pull request
   - Tests and lints backend Python code
   - Tests and lints frontend TypeScript/React code
   - Builds both applications to catch errors early

2. **Deploy Workflow** (`.github/workflows/deploy.yml`) - Runs on pushes to main/master branch
   - Automatically deploys backend to Fly.io
   - Automatically deploys frontend to Fly.io
   - Only deploys if CI checks pass

## 🚀 Setup Steps

### Step 1: Get Your Fly.io API Token

You need to create a Fly.io API token and add it to your GitHub repository secrets.

#### Option A: Create a new token (Recommended)

```bash
# Login to Fly.io (if not already logged in)
flyctl auth login

# Create a deploy token
flyctl tokens create deploy -x 999999h
```

This will output a token like: `fo1_xxxxxxxxxxxxxxxxxxxxxxxxxxxx`

**Important:** Copy this token immediately - you won't be able to see it again!

#### Option B: Use existing token

If you already have a token, you can list your tokens:

```bash
flyctl tokens list
```

### Step 2: Add Token to GitHub Secrets

1. Go to your GitHub repository in a web browser
2. Click on **Settings** (top navigation)
3. In the left sidebar, click **Secrets and variables** → **Actions**
4. Click **New repository secret**
5. Name: `FLY_API_TOKEN`
6. Value: Paste your Fly.io token from Step 1
7. Click **Add secret**

### Step 3: Verify Your Fly.io Apps

Make sure your Fly.io apps are properly configured:

```bash
# Check backend app
flyctl status --app cookbook-creator-api

# Check frontend app
flyctl status --app cookbook-creator-web
```

If either app doesn't exist, you'll need to create it first:

```bash
# For backend (if needed)
cd backend
flyctl launch --no-deploy

# For frontend (if needed)
cd frontend
flyctl launch --no-deploy
```

### Step 4: Set Required Secrets on Fly.io

Your backend needs certain environment variables. Set them on Fly.io:

```bash
# Set Gemini API key
flyctl secrets set GEMINI_API_KEY="your-gemini-api-key" --app cookbook-creator-api

# Set Clerk keys (for authentication)
flyctl secrets set CLERK_SECRET_KEY="your-clerk-secret-key" --app cookbook-creator-api

# Set YouTube API key (if you have one)
flyctl secrets set YOUTUBE_API_KEY="your-youtube-api-key" --app cookbook-creator-api

# Set Lulu API credentials (for print orders)
flyctl secrets set LULU_API_KEY="your-lulu-api-key" --app cookbook-creator-api
flyctl secrets set LULU_API_SECRET="your-lulu-api-secret" --app cookbook-creator-api
```

### Step 5: Commit and Push Workflow Files

```bash
# Add the workflow files
git add .github/workflows/

# Commit the changes
git commit -m "Add GitHub Actions CI/CD workflows"

# Push to GitHub
git push origin master
```

### Step 6: Monitor Your First Deployment

1. Go to your GitHub repository
2. Click on the **Actions** tab
3. You should see your workflows running
4. Click on a workflow run to see detailed logs

## 🔄 How It Works

### Automatic Deployments

- **Every push to master/main**: Triggers both CI and deployment workflows
- **Pull requests**: Only runs CI checks (no deployment)
- **Manual trigger**: You can manually trigger deployment from the Actions tab

### Deployment Order

1. Backend deploys first
2. Frontend deploys only after backend succeeds
3. If backend fails, frontend deployment is skipped

### CI Checks

The CI workflow runs:
- Python code formatting check (Black)
- Python linting (flake8)
- TypeScript type checking
- ESLint checks
- Build verification for both apps

## 🛠️ Manual Deployment

You can still deploy manually when needed:

```bash
# Deploy backend manually
cd backend
flyctl deploy

# Deploy frontend manually
cd frontend
flyctl deploy
```

## 🔍 Troubleshooting

### Deployment Fails with "unauthorized"

- Check that `FLY_API_TOKEN` is correctly set in GitHub secrets
- Verify the token hasn't expired: `flyctl tokens list`
- Create a new token if needed

### App Not Found Error

- Verify app names in `fly.toml` files match your actual Fly.io apps
- Check with: `flyctl apps list`

### Build Fails

- Check the Actions logs for specific errors
- Test the build locally first:
  ```bash
  # Backend
  cd backend
  docker build -t test-backend .
  
  # Frontend
  cd frontend
  docker build -t test-frontend .
  ```

### Secrets Not Available

- Ensure all required secrets are set on Fly.io (not just GitHub)
- List secrets: `flyctl secrets list --app cookbook-creator-api`

## 📊 Monitoring

### View Deployment Status

```bash
# Backend status
flyctl status --app cookbook-creator-api

# Frontend status
flyctl status --app cookbook-creator-web

# View logs
flyctl logs --app cookbook-creator-api
flyctl logs --app cookbook-creator-web
```

### GitHub Actions Dashboard

- Go to repository → Actions tab
- See all workflow runs, their status, and logs
- Re-run failed workflows if needed

## 🎯 Best Practices

1. **Test Locally First**: Always test changes locally before pushing
2. **Use Pull Requests**: Create PRs to run CI checks before merging
3. **Monitor Logs**: Check deployment logs after each push
4. **Keep Secrets Secure**: Never commit secrets to the repository
5. **Version Tags**: Consider tagging releases for easier rollbacks

## 🔐 Security Notes

- Never commit `.env` files or secrets
- Rotate API tokens periodically
- Use GitHub branch protection rules for production branches
- Review workflow logs for sensitive information before making repos public

## 📝 Next Steps

Consider adding:
- [ ] Automated tests (pytest for backend, Jest for frontend)
- [ ] Code coverage reporting
- [ ] Staging environment for testing before production
- [ ] Slack/Discord notifications for deployment status
- [ ] Automatic rollback on deployment failure
- [ ] Database migration automation

## 🆘 Getting Help

- **Fly.io Docs**: https://fly.io/docs/
- **GitHub Actions Docs**: https://docs.github.com/en/actions
- **Check Logs**: Always check the Actions tab for detailed error messages

---

**Happy Deploying! 🚀**

