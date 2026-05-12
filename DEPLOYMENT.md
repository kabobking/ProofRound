# Deployment Guide

This document describes how to deploy ProofRound to production with automatic CI/CD.

## Table of Contents
1. [Quick Start](#quick-start)
2. [Deployment Options](#deployment-options)
3. [Environment Setup](#environment-setup)
4. [GitHub Actions Workflow](#github-actions-workflow)
5. [Vercel Deployment (Recommended)](#vercel-deployment-recommended)
6. [GitHub Pages Deployment](#github-pages-deployment)
7. [Firebase Setup](#firebase-setup)
8. [Monitoring & Debugging](#monitoring--debugging)

## Quick Start

### Option 1: Deploy to Vercel (Recommended)

Vercel is the official Next.js deployment platform and handles everything automatically.

```bash
# 1. Create a Vercel account
# https://vercel.com

# 2. Connect your GitHub repository
# In Vercel Dashboard: Add New > Project > Select repository

# 3. Configure environment variables
# In Vercel Project Settings > Environment Variables, add:
NEXT_PUBLIC_FIREBASE_API_KEY=your_value
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_value
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_value
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_value
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_value
NEXT_PUBLIC_FIREBASE_APP_ID=your_value
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your_value
FIREBASE_SERVICE_ACCOUNT_KEY=your_value

# 4. Deploy
# Every push to V1.0-Landing-Page branch triggers automatic deployment
```

### Option 2: Deploy to GitHub Pages

For static-only sites without API routes.

```bash
# 1. Add to next.config.ts:
# output: 'export'

# 2. Add public/CNAME with your custom domain if you want one
# Example: proofround.com

# 3. GitHub Actions handles deployment automatically
# Every push to V1.0-Landing-Page triggers deployment

# 4. Enable GitHub Pages
# Repository Settings > Pages > Source: Deploy from a branch
# Source: GitHub Actions
```

### Option 3: Self-Hosted (Node.js Server)

For full control with API routes support.

```bash
# 1. Build locally
npm run build

# 2. Deploy to your server
# rsync -av .next/ user@server:/app/.next/
# rsync -av package.json user@server:/app/

# 3. On server, install and start
# npm ci --production
# npm run start
```

## Deployment Options

### Comparison Table

| Feature | Vercel | GitHub Pages | Self-Hosted |
|---------|--------|--------------|-------------|
| API Routes | ✅ | ❌ | ✅ |
| Dynamic Routes | ✅ | ✅ | ✅ |
| Automatic Deployments | ✅ | ✅ | ⚠️ Manual |
| Database Support | ✅ | ✅ | ✅ |
| Firebase Integration | ✅ | ✅ | ✅ |
| Cost | $20+/mo | Free | Depends |
| Setup Time | 5 min | 10 min | 30+ min |
| Maintenance | None | None | Manual |
| Performance | Excellent | Good | Depends |
| Scalability | Auto | Limited | Manual |
| SSL/HTTPS | Included | Included | Manual |
| Custom Domain | ✅ | ✅ | ✅ |

## Environment Setup

### 1. Local Environment (.env.local)

Copy `.env.local.example` to `.env.local` and fill in your values:

```bash
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id

# Firebase Admin SDK (base64 encoded)
FIREBASE_SERVICE_ACCOUNT_KEY=base64_encoded_key

# Stripe (optional)
STRIPE_SECRET_KEY=sk_live_key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_key
```

### 2. Get Firebase Credentials

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Click "Project Settings" (gear icon)
4. Copy values from "General" tab
5. For service account key:
   - Click "Service Accounts" tab
   - Click "Generate Private Key"
   - Download JSON file
   - Base64 encode: `cat service-account-key.json | base64 > encoded.txt`

## GitHub Actions Workflow

### Current Workflow (.github/workflows/deploy.yml)

The workflow runs on every push to `V1.0-Landing-Page` branch:

```yaml
Jobs:
1. Build
   - Checkout code
   - Setup Node.js 18.x
   - Install dependencies
   - Run ESLint
   - Build Next.js app
   - Pass environment variables

2. Deploy (on push only)
   - Deploy to Vercel using API token
```

### Workflow Secrets

Configure these in GitHub Settings > Secrets and variables > Actions:

```
VERCEL_TOKEN         - From Vercel account settings
VERCEL_ORG_ID        - From Vercel project settings
VERCEL_PROJECT_ID    - From Vercel project settings
```

Plus all Firebase environment variables (see Environment Setup).

### Triggering Deployments

Deployments trigger automatically on:
- ✅ Push to `V1.0-Landing-Page` branch
- ✅ Pull request changes (build only, no deploy)
- ✅ Manual workflow dispatch (if configured)

Deployments don't trigger on:
- ❌ Pushes to other branches
- ❌ Closed pull requests

## Vercel Deployment (Recommended)

### Setup Steps

1. **Create Vercel Account**
   ```
   https://vercel.com/signup
   ```

2. **Connect GitHub Repository**
   - Go to Vercel Dashboard
   - Click "Add New" > "Project"
   - Select your GitHub organization
   - Find "ProofRound" repository
   - Click "Import"

3. **Configure Environment Variables**
   - In Vercel: Project Settings > Environment Variables
   - Add all variables from `.env.local.example`
   - Set to "Production", "Preview", "Development"

4. **Configure Build Settings**
   - Build Command: `npm run build` (default)
   - Output Directory: `.next` (default)
   - Install Command: `npm ci` (default)

5. **Deploy**
   - Vercel automatically deploys on git push
   - Staging deployments created for PRs
   - Production deployment from main branch

### Custom Domain Setup

1. In Vercel project: Settings > Domains
2. Add your domain (e.g., proofround.com)
3. Configure DNS records (Vercel provides instructions)
4. SSL certificate automatically provisioned

### Vercel CLI (Alternative)

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy (from project directory)
vercel

# Deploy to production
vercel --prod

# View logs
vercel logs
```

## GitHub Pages Deployment

### When to Use GitHub Pages

Use GitHub Pages if:
- You only have static pages (no API routes)
- You want free hosting
- You don't need server-side rendering

### Setup Steps

1. **Update next.config.ts**
   ```typescript
   const nextConfig: NextConfig = {
     output: "export",
     images: {
       unoptimized: true,
     },
   };
   ```

2. **Create GitHub Pages Workflow**
   Create `.github/workflows/pages.yml`:
   ```yaml
   name: Deploy to GitHub Pages
   on:
     push:
       branches: [V1.0-Landing-Page]
   permissions:
     contents: read
     pages: write
     id-token: write
   jobs:
     build:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v4
         - uses: actions/setup-node@v4
           with: { node-version: '18' }
         - run: npm ci
         - run: npm run build
         - uses: actions/upload-pages-artifact@v3
           with: { path: ./out }
     deploy:
       needs: build
       runs-on: ubuntu-latest
       environment:
         name: github-pages
         url: ${{ steps.deployment.outputs.page_url }}
       steps:
         - uses: actions/deploy-pages@v4
           id: deployment
   ```

3. **Enable GitHub Pages**
   - Repository Settings > Pages
   - Source: GitHub Actions
   - Save

4. **Configure Custom Domain (Optional)**
   - Repository Settings > Pages
   - Under "Custom domain": enter your domain
   - Create DNS CNAME record pointing to `username.github.io`

### Important Notes for GitHub Pages

- API routes won't work (static only)
- Dynamic routes must be pre-rendered
- File size limit: 100GB per repository
- Free tier: up to 10GB
- Custom domain requires DNS setup

## Firebase Setup

### 1. Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Click "Create Project"
3. Enter project name (e.g., "proofround")
4. Enable Google Analytics (optional)
5. Create project

### 2. Enable Authentication

1. Left sidebar: Build > Authentication
2. Click "Get Started"
3. Enable sign-in methods:
   - Email/Password (✅ recommended)
   - Google Sign-in (✅ optional)
   - Others as needed

### 3. Create Firestore Database

1. Left sidebar: Build > Firestore Database
2. Click "Create Database"
3. Choose location (closest to users)
4. Start in production mode
5. Click "Create"

### 4. Set Security Rules

1. Firestore > Rules tab
2. Update with your security rules
3. Deploy

### 5. Configure Authorized Domains

1. Authentication > Settings
2. Scroll to "Authorized domains"
3. Add your domain:
   - localhost:3000 (development)
   - proofround.com (production custom domain)
   - www.proofround.com (if you use the `www` alias)
   - your GitHub Pages preview domain, if you still preview there

Google sign-in uses Firebase Auth in the browser, so the current site origin must be on this list for popup sign-in to work.

### 6. Point GitHub Pages at the custom domain

1. Open Repository Settings > Pages
2. Set Source to `GitHub Actions`
3. If you want the repo to serve `proofround.com`, keep the `public/CNAME` file checked in
4. In the DNS provider for `proofround.com`, point the domain to GitHub Pages and wait for SSL provisioning

### 7. Set the Stripe packet action URLs

These values are not built into Stripe itself. They should point to the backend endpoints that perform the action:

| Variable | Use | Good value for a demo |
|---|---|---|
| `NEXT_PUBLIC_STRIPE_CONNECT_URL` | Founder connect/manage Stripe flow | Leave blank until you deploy a backend endpoint |
| `NEXT_PUBLIC_VERIFIED_PACKET_GENERATE_URL` | Generate the verified PDF packet | Leave blank until you deploy a backend endpoint |
| `NEXT_PUBLIC_VERIFIED_PACKET_REQUEST_URL` | Investor request flow | `mailto:support@proofround.com?subject=Request%20verified%20revenue%20packet` |
| `NEXT_PUBLIC_VERIFIED_PACKET_PRICE_USD` | Displayed price tag | `49` |

If you later deploy Firebase Functions or another API, point the two action URLs at those HTTPS endpoints instead of leaving them blank.

### 8. Deploy the Node backend on Vercel

Use the `backend/` folder as a separate Vercel project.

1. In Vercel, create a new project from this repository and set the root directory to `backend`.
2. Add these environment variables in the Vercel project settings:
   - `STRIPE_SECRET_KEY`
   - `FIREBASE_PROJECT_ID`
   - `FIREBASE_SERVICE_ACCOUNT_KEY`
   - `FRONTEND_BASE_URL=https://proofround.com`
   - `VERIFIED_PACKET_PRICE_USD=49`
3. Deploy the backend project.
4. Copy the backend URLs into the frontend GitHub Pages env vars:
   - `NEXT_PUBLIC_STRIPE_CONNECT_URL=https://<your-backend>.vercel.app/api/stripe/connect`
   - `NEXT_PUBLIC_VERIFIED_PACKET_GENERATE_URL=https://<your-backend>.vercel.app/api/packets/generate`
   - `NEXT_PUBLIC_VERIFIED_PACKET_REQUEST_URL=https://<your-backend>.vercel.app/api/packets/request`

The frontend stays static on GitHub Pages, while Stripe and PDF generation run on Node through Vercel.

## Monitoring & Debugging

### Vercel Analytics & Monitoring

```bash
# View deployment logs
vercel logs

# Check build logs
vercel logs --follow

# Rollback deployment
vercel rollback

# Check function performance
vercel analytics
```

### GitHub Actions Logs

1. Go to repository
2. Click "Actions" tab
3. Select workflow run
4. View step-by-step logs

### Firebase Console Monitoring

- **Authentication**: Track sign-ups, logins
- **Firestore**: Database usage and metrics
- **Performance**: Monitor slow queries
- **Error Reporting**: Automatic error tracking

### Debug in Production

```bash
# View server logs (Vercel)
vercel logs --follow

# Check Firebase logs
# Firebase Console > Functions > Logs

# Browser console
# Your browser DevTools (F12)

# Network tab
# Check API responses
```

### Common Issues

**Build Fails**
- Check Node version: `node --version` (should be 18+)
- Check environment variables in CI/CD
- Run `npm run build` locally to debug

**Deployment Fails**
- Verify all secrets are configured
- Check disk space on server
- Review GitHub Actions logs

**Firebase Connection Issues**
- Verify Firebase credentials in .env
- Check Firestore rules allow access
- Confirm domain is authorized

**Performance Issues**
- Check Vercel Analytics
- Monitor Firestore queries
- Review Firebase Realtime Database usage

## Post-Deployment Checklist

After deploying to production:

- [ ] Verify all pages load correctly
- [ ] Test authentication flow
- [ ] Check Firebase rules are working
- [ ] Test on mobile devices
- [ ] Verify custom domain works
- [ ] Set up SSL certificate
- [ ] Configure analytics
- [ ] Test payment processing (if applicable)
- [ ] Set up error monitoring
- [ ] Configure automated backups
- [ ] Document deployment process
- [ ] Create rollback plan

## Rollback Procedure

### Vercel Rollback
```bash
vercel rollback
# Select previous deployment
# Confirm rollback
```

### Manual Rollback
```bash
# Revert git commit
git revert <commit-hash>
git push origin V1.0-Landing-Page
# Vercel automatically redeploys
```

### GitHub Pages Rollback
1. Go to Actions > workflow
2. Select previous successful build
3. Click "Re-run jobs"

## Support & Resources

- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Vercel Docs](https://vercel.com/docs)
- [Firebase Docs](https://firebase.google.com/docs)
- [GitHub Actions Docs](https://docs.github.com/en/actions)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
