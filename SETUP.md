# ProofRound Marketplace - Setup Guide

## Overview
ProofRound is a marketplace connecting investors with verified startup opportunities using real financial data from Stripe.

## Architecture

### Core Features Implemented
1. **Authentication System** - Firebase Auth with role-based access (Founder, Investor, Admin)
2. **Startup Profiles** - Founders can list companies with fundraising info
3. **Investment Opportunities** - Manage fundraising rounds (equity, debt, revenue-share, convertible)
4. **Investor Marketplace** - Browse and filter startups by stage, industry, etc.
5. **Financial Verification** - Stripe integration for verifiable revenue metrics
6. **Admin Dashboard** - Manage users, verify startups, verify packets
7. **Firestore Security Rules** - Role-based access control

### Data Models
- **User**: Founder, Investor, or Admin (admin flag set manually in Firebase)
- **Startup**: Company profiles with financial metrics and seeking amounts
- **InvestmentOpportunity**: Fundraising rounds (equity, debt, etc.)
- **InvestmentInterest**: Investor interest in opportunities
- **ProofroundPacket**: Verified revenue snapshots from Stripe

## Setup Instructions

### Step 1: Create Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Create a new project named "ProofRound"
3. Enable authentication methods:
   - Email/Password
  - Google Sign-In
4. Create a Firestore database:
   - Choose "Production mode"
   - Select your preferred region
5. Copy your Firebase config credentials

### Step 2: Set Environment Variables
1. Copy `.env.local.example` to `.env.local`
2. Fill in your Firebase credentials:
   ```
   NEXT_PUBLIC_FIREBASE_API_KEY=<from Firebase Console>
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=<your-project>.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=<your-project-id>
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=<your-project>.appspot.com
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=<sender-id>
   NEXT_PUBLIC_FIREBASE_APP_ID=<app-id>
   ```

### Step 3: Deploy Firestore Security Rules
1. Install Firebase CLI: `npm install -g firebase-tools`
2. Run: `firebase login`
3. Run: `firebase init firestore`
4. Copy content from `firestore.rules` to `firestore.rules` file
5. Deploy: `firebase deploy --only firestore:rules`

### Step 4: Configure Authorized Domains for Auth
1. Open Firebase Console > Authentication > Settings
2. Add the origins where the app will run:
  - `localhost:3000` for local development
  - `proofround.com` for production
  - `www.proofround.com` if you use the `www` alias
  - Your GitHub Pages preview domain, if you still keep one
3. Save the changes

Google sign-in uses a popup from the current origin, so the active site must be listed here.

### Step 5: Install Dependencies
```bash
npm install
```

### Step 6: Create First Admin User
1. Start the dev server: `npm run dev`
2. Sign up at `http://localhost:3000/auth/signup` as Admin/Founder
3. Go to Firebase Console > Firestore > users collection
4. Find your user document and manually set `isAdmin: true`

### Step 7: Stripe Integration (Optional)
For live Stripe revenue verification:
1. Get Stripe API keys from [Stripe Dashboard](https://dashboard.stripe.com)
2. Add to `.env.local`:
   ```
   STRIPE_SECRET_KEY=sk_live_...
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
   ```
3. Implement Stripe Connect OAuth for connected accounts

### Step 8: GitHub Pages Setup
1. Keep the `public/CNAME` file with `proofround.com` if you want the custom domain
2. In the GitHub repo, go to Settings > Pages
3. Set Source to `GitHub Actions`
4. Push to `V1.0-Landing-Page` to trigger the workflow
5. Add `proofround.com` and `www.proofround.com` to Firebase Authentication > Authorized domains

Google sign-in uses the browser origin, so the deployed domain must be authorized in Firebase.

### Step 9: Deploy the Node backend on Vercel
1. Create a second Vercel project using the same repository but set the root directory to `backend`
2. Add backend env vars in Vercel:
  - `STRIPE_SECRET_KEY`
  - `FIREBASE_PROJECT_ID`
  - `FIREBASE_SERVICE_ACCOUNT_KEY`
  - `FRONTEND_BASE_URL=https://proofround.com`
  - `VERIFIED_PACKET_PRICE_USD=49`
  - `FIREBASE_STORAGE_BUCKET` (e.g. `your-project.appspot.com`)
  - `STRIPE_TOKEN_ENCRYPTION_KEY` (base64-encoded 32 bytes; generate with `openssl rand -base64 32`)
  - `STRIPE_CLIENT_ID` (your Stripe Connect client id, e.g. `ca_...`)
  - `NEXT_PUBLIC_*` envs used by the frontend should be set in the frontend build (or GitHub Actions):
    - `NEXT_PUBLIC_STRIPE_CONNECT_URL` → `https://<your-vercel-backend>/api/stripe/connect?startupId=` (frontend adds startupId)
    - `NEXT_PUBLIC_VERIFIED_PACKET_GENERATE_URL` → `https://<your-vercel-backend>/api/packets/generate`
    - `NEXT_PUBLIC_VERIFIED_PACKET_REQUEST_URL` → `https://<your-vercel-backend>/api/packets/request`

3. OAuth callback: set your Stripe Connect Redirect URI to `https://<your-vercel-backend>/api/stripe/oauth-callback`
4. Deploy the backend project
5. Put the deployed Vercel URLs into the frontend env vars (GitHub repo secrets used by the Pages build)
3. Deploy the backend project
4. Put the deployed Vercel URLs into the frontend env vars:
  - `NEXT_PUBLIC_STRIPE_CONNECT_URL`
  - `NEXT_PUBLIC_VERIFIED_PACKET_GENERATE_URL`
  - `NEXT_PUBLIC_VERIFIED_PACKET_REQUEST_URL`

The frontend remains on GitHub Pages, and all Stripe/PDF work runs on the Vercel backend.

## File Structure

```
app/
  api/
    generate-packet/route.ts       # Stripe packet generation
  auth/
    login/page.tsx
    signup/page.tsx
    reset-password/page.tsx
  app/
    dashboard/page.tsx             # Role-based dashboard
    marketplace/page.tsx           # Investor marketplace
    startup/[id]/page.tsx         # Startup detail view
    create-startup/page.tsx        # Founder startup form
    startups/page.tsx             # Founder startup management
    
lib/
  auth.ts                          # Auth utilities
  auth-context.tsx                 # Auth provider
  database.ts                      # Firestore CRUD
  firebase-client.ts               # Firebase initialization
  models.ts                        # TypeScript interfaces
  stripe-integration.ts            # Stripe API utilities
  
firestore.rules                    # Security rules
.env.local.example                 # Environment template
```

## Key Features

### For Founders
- ✅ Create startup profiles
- ✅ List investment opportunities
- ✅ Connect Stripe for revenue verification
- ✅ Generate time-stamped verification packets
- ✅ Track investor interest
- ✅ Manage multiple startups

### For Investors
- ✅ Browse all public startups
- ✅ Filter by stage, industry, location
- ✅ View verified financial metrics
- ✅ Express investment interest
- ✅ Save startups for later
- ✅ Track interactions

### For Admins
- ✅ Verify financial packets
- ✅ Approve/flag startup listings
- ✅ Manage user accounts
- ✅ View activity logs

## Security

### Firestore Rules
- Users can only read/update their own profiles
- Admins can update their own profiles and verify packets
- Founders can only manage their own startups
- Investors can only see public startups
- Verified packets are visible to investors

### Data Minimization
- Stripe data is processed in-memory only
- Only aggregated metrics and object IDs are stored
- Live drill-down queries fetch fresh data
- No raw customer/charge objects stored

## Next Steps

### Phase 2: Advanced Features
1. **Stripe Connect OAuth** - Let founders auto-connect accounts
2. **Email Notifications** - Notify founders of investor interest
3. **Payment Processing** - Facilitate investments
4. **Due Diligence Docs** - Upload and share docs
5. **Video Meetings** - Schedule founder/investor calls
6. **Cap Table Management** - Track investments
7. **Reporting** - Analytics and insights

### Phase 3: Scale & Polish
1. Advanced search and filtering
2. Investor portfolio view
3. Deal flow management
4. Analytics dashboard
5. API for third-party integrations
6. Mobile app

## Troubleshooting

### "Firebase not initialized"
- Check `.env.local` has all required variables
- Verify Firestore database is created
- Try refreshing the page

### "Permission denied" errors
- Make sure user is created in Firestore
- Check Firestore rules deployment
- Verify user role is set correctly

### Stripe connection fails
- Verify `STRIPE_SECRET_KEY` is in `.env.local`
- Check Stripe API key is valid
- Ensure connected account ID is correct

## Support

For issues or questions:
1. Check Firebase Console logs
2. Review Firestore rules
3. Check browser console for errors
4. Verify environment variables

---

**Ready to launch? Follow the setup steps above and start building!**
