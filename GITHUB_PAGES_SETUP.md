# GitHub Pages Deployment Guide

Your site is now configured for **automatic GitHub Pages deployment**!

## 🚀 Quick Setup (3 Steps)

### Step 1: Configure GitHub Pages
1. Go to your repository on GitHub
2. Click **Settings** > **Pages**
3. Under "Build and deployment":
   - Source: **Deploy from a branch**
   - Branch: **V1.0-Landing-Page** (or your default branch)
   - Folder: **/ (root)**
4. Click **Save**

### Step 2: Add GitHub Secrets (if using Firebase)
If your site needs Firebase credentials:
1. Go to **Settings** > **Secrets and variables** > **Actions**
2. Click **New repository secret**
3. Add each environment variable:
   - `NEXT_PUBLIC_FIREBASE_API_KEY`
   - `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
   - `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
   - `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
   - `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
   - `NEXT_PUBLIC_FIREBASE_APP_ID`
   - `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID`

### Step 3: Deploy
```bash
# Push your code to V1.0-Landing-Page branch
git push origin V1.0-Landing-Page

# GitHub Actions automatically:
# 1. Installs dependencies
# 2. Runs tests
# 3. Builds static files
# 4. Deploys to GitHub Pages
```

## 📍 Your Demo Site URL

After deployment, your site will be available at:
```
https://{username}.github.io/{repository}/
```

Example: `https://kabobking.github.io/ProofRound/`

## 📋 What's Included in Demo

✅ **Working Pages:**
- Landing page (`/`)
- Dashboard (`/dashboard`)
- My Startups (`/app/startups`)
- Marketplace (`/app/marketplace`)
- Create Startup (`/app/create-startup`)
- Authentication pages (login/signup)

❌ **Not Included (Static Export Limitations):**
- API routes (require server-side rendering)
- Dynamic startup detail pages (`/startup/[id]`)
- Stripe integration (requires server)

## 🔄 Automatic Deployment

Every time you push to `V1.0-Landing-Page`:
1. GitHub Actions triggers workflow (`.github/workflows/deploy.yml`)
2. Runs build & tests (~2 minutes)
3. Deploys static files to `gh-pages` branch
4. Site updates automatically

## 📊 Build Information

- **Build Time**: ~5 seconds
- **Pages Generated**: 14 static pages
- **Output Size**: ~2-3 MB
- **Deployment Time**: ~1-2 minutes

## 🛠️ Local Testing

```bash
# Build locally
npm run build

# Preview the static output
npx http-server out/

# Open: http://localhost:8080
```

## 📝 Notes on Changes

For this demo, the following were removed (can be restored later):
- API routes (`/app/api/*`) - not compatible with static export
- Dynamic startup detail pages (`/startup/[id]`) - require server-side rendering

These features work perfectly in development (`npm run dev`) and can be deployed to Vercel if needed later.

## 🔄 Restoring Full Features

To switch back to full features with server-side APIs:
1. Update `next.config.ts`: Remove `output: "export"`
2. Restore deleted files from git history
3. Deploy to Vercel (or other Node.js host) instead

```bash
git checkout HEAD -- app/api app/startup app/app/startup
# Then deploy to Vercel
```

## ✅ Deployment Checklist

- [ ] GitHub Pages enabled in repo settings
- [ ] Secrets added (if using Firebase)
- [ ] Code pushed to V1.0-Landing-Page branch
- [ ] GitHub Actions workflow ran successfully
- [ ] Site is live at `https://username.github.io/ProofRound/`
- [ ] All pages load correctly
- [ ] Mobile responsiveness works
- [ ] Links and navigation work

## 📞 Troubleshooting

**Build fails:**
- Check GitHub Actions logs (Actions tab > workflow run)
- Verify all secrets are added correctly
- Run `npm run build` locally to test

**Site not updating:**
- Wait 2-3 minutes for GitHub to publish
- Force refresh (Ctrl+Shift+R or Cmd+Shift+R)
- Check gh-pages branch exists

**Pages don't load:**
- Verify `basePath` is empty in next.config.ts
- Check `.github/workflows/deploy.yml` is present
- Review GitHub Actions logs for errors

## 🎉 You're All Set!

Your ProofRound demo is now ready to share:
- **Mobile responsive**: ✅
- **Automatic deployment**: ✅
- **Zero-cost hosting**: ✅
- **Clean demo site**: ✅

Push your latest changes and watch it deploy live!
