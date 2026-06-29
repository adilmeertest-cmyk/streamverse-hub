# StreamFlix - Quick Start Guide

## Web App Status: ✅ COMPLETE

All web app features are implemented and ready to deploy.

## What's Included

### ✅ Completed Features
- **Apps Section** - Full CRUD for apps with platform support (Android, iOS, Windows, macOS, Linux, Smart TV)
- **Admin Panel** - Complete admin interface with content ingestion
- **TMDB Integration** - Automated movie/TV import from TMDB
- **Authentication** - Login/Register with device fingerprinting
- **Payment System** - Stripe integration with subscription plans
- **User Dashboard** - Download history and account management
- **Responsive Design** - Mobile, tablet, desktop support

## Next Steps (Required for Launch)

### Step 1: Database Migration (5 minutes)

1. Open Supabase Dashboard: https://supabase.com/dashboard
2. Select your project: `vtqhlaprxsstjczzckiz`
3. Go to **SQL Editor** (left sidebar)
4. Click **New Query**
5. Copy the content from this file:
   ```
   supabase/migrations/20260627070000_create_apps_system.sql
   ```
6. Paste into SQL Editor
7. Click **Run** (or press Ctrl+Enter)

This will create:
- Apps tables
- Platform support
- Download tracking
- Device fingerprinting

### Step 2: Vercel Deployment (10 minutes)

1. **Push to GitHub** (if not already):
```bash
git init
git add .
git commit -m "StreamFlix web app complete"
git branch -M main
git remote add origin YOUR_GITHUB_REPO_URL
git push -u origin main
```

2. **Deploy to Vercel**:
   - Go to https://vercel.com
   - Click **Add New Project**
   - Import your GitHub repo
   - Add these environment variables:

```
VITE_SUPABASE_PROJECT_ID=vtqhlaprxsstjczzckiz
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ0cWhsYXByeHNzdGpjenpja2l6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIyODIzODgsImV4cCI6MjA5Nzg1ODM4OH0.CJhaz9Ppr4vAcus0s2IrDaC2I2tKaGOJineg_rXSaRk
VITE_SUPABASE_URL=https://vtqhlaprxsstjczzckiz.supabase.co
VITE_TMDB_API_KEY=55defd4f66d56ad6c10596314725ec59
TMDB_API_KEY=55defd4f66d56ad6c10596314725ec59
STRIPE_SECRET_KEY=sk_test_51TfyBxGc8uSJvgUPaeUPOCwHxCiY9JN5CYQu5tnNZH4O4ySPWq5S0vilKZgkqof8DxKvjSMe3LdbFH3dLe2ZUAZz00CExvWMXl
STRIPE_WEBHOOK_SECRET=whsec_NoTOu3oIWvVZjcahAu2AgJim0cOj5Gbj
```

3. Click **Deploy**

### Step 3: Setup Admin Account (2 minutes)

1. Go to your deployed Vercel site
2. Sign up as a new user
3. Run this SQL in Supabase SQL Editor:

```sql
UPDATE profiles 
SET role = 'super_admin' 
WHERE email = 'YOUR_EMAIL_ADDRESS';
```

### Step 4: Import Content (5 minutes)

1. Go to `/admin/content-ingestion` on your site
2. Click **Import 20 Movies** (Trending)
3. Click **Import 20 Movies** (Popular)
4. Click **Import 20 Series** (Popular)
5. Wait for each import to complete

### Step 5: Add Apps (Optional)

1. Go to `/admin/apps`
2. Click **Add App**
3. Fill in app details (name, description, icon URL)
4. Click **Create**
5. Go to the app's page (`/admin/apps/{app-id}`)
6. Add platform files with download URLs

## Flutter Mobile App

Flutter mobile app requires separate setup. See `DEPLOYMENT_GUIDE.md` for detailed instructions.

### Prerequisites
- Flutter SDK installed
- Android Studio (for Android)
- Xcode (for iOS - Mac only)

### Quick Flutter Setup
```bash
# Install Flutter from: https://docs.flutter.dev/get-started/install

# Create project
flutter create streamverse_mobile
cd streamverse_mobile

# Add dependencies (see DEPLOYMENT_GUIDE.md)
flutter pub get

# Run on device
flutter run
```

## Testing Your Web App

1. **Local Testing** (already running):
   - Open: http://localhost:8080
   - Test authentication
   - Test admin panel
   - Test content ingestion

2. **Production Testing** (after Vercel deploy):
   - Test on mobile devices
   - Test payment flow
   - Test download functionality

## Support

If you encounter issues:
1. Check browser console for errors
2. Check Supabase logs
3. Check Vercel deployment logs
4. Review `DEPLOYMENT_GUIDE.md` for troubleshooting

## Project Structure

```
streamverse-hub-main/
├── src/
│   ├── routes/
│   │   ├── browse.apps.tsx          # Apps browse page
│   │   ├── apps.$slug.tsx           # App detail page
│   │   ├── _authenticated/
│   │   │   ├── admin/
│   │   │   │   ├── apps.tsx         # Admin apps management
│   │   │   │   ├── apps.$id.tsx     # Admin platform files
│   │   │   │   └── content-ingestion.tsx  # TMDB import
│   │   │   └── account.tsx          # User dashboard
│   │   └── auth.tsx                 # Authentication
│   ├── lib/
│   │   ├── apps.functions.ts        # Apps data functions
│   │   ├── tmdb-ingestion.functions.ts  # TMDB integration
│   │   └── types.ts                 # TypeScript types
│   └── components/sf/
│       ├── app-card.tsx             # App card component
│       ├── apps-grid.tsx            # Apps grid component
│       ├── admin-shell.tsx          # Admin layout
│       └── header.tsx               # Navigation header
├── supabase/
│   └── migrations/
│       └── 20260627070000_create_apps_system.sql  # Database schema
└── vercel.json                      # Vercel configuration
```

## Time to Launch

- **Database Migration**: 5 minutes
- **Vercel Deployment**: 10 minutes
- **Admin Setup**: 2 minutes
- **Content Import**: 5 minutes
- **Total**: ~22 minutes

Your web app will be live and ready to use!
