# StreamFlix Deployment Guide

## Web App Deployment Steps

### 1. Database Migration (Supabase)

1. Go to Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Go to SQL Editor
4. Copy content from: `supabase/migrations/20260627070000_create_apps_system.sql`
5. Paste and run the SQL

This will create:
- `apps` table
- `app_platforms` table
- `app_downloads` table
- Device fingerprinting columns in `profiles` table

### 2. Vercel Deployment

1. Push code to GitHub:
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin YOUR_GITHUB_REPO_URL
git push -u origin main
```

2. Go to Vercel: https://vercel.com
3. Click "Add New Project"
4. Import your GitHub repository
5. Configure environment variables:

```
VITE_SUPABASE_PROJECT_ID=vtqhlaprxsstjczzckiz
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ0cWhsYXByeHNzdGpjenpja2l6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIyODIzODgsImV4cCI6MjA5Nzg1ODM4OH0.CJhaz9Ppr4vAcus0s2IrDaC2I2tKaGOJineg_rXSaRk
VITE_SUPABASE_URL=https://vtqhlaprxsstjczzckiz.supabase.co
VITE_TMDB_API_KEY=55defd4f66d56ad6c10596314725ec59
TMDB_API_KEY=55defd4f66d56ad6c10596314725ec59
STRIPE_SECRET_KEY=sk_test_51TfyBxGc8uSJvgUPaeUPOCwHxCiY9JN5CYQu5tnNZH4O4ySPWq5S0vilKZgkqof8DxKvjSMe3LdbFH3dLe2ZUAZz00CExvWMXl
STRIPE_WEBHOOK_SECRET=whsec_NoTOu3oIWvVZjcahAu2AgJim0cOj5Gbj
```

6. Click "Deploy"

### 3. Admin Setup

1. Go to your deployed site
2. Sign up as a new user
3. Run this SQL in Supabase to make yourself admin:

```sql
UPDATE profiles 
SET role = 'super_admin' 
WHERE email = 'YOUR_EMAIL';
```

### 4. Import Content

1. Go to `/admin/content-ingestion`
2. Click "Import 20 Movies" to import trending movies
3. Click "Import 20 Series" to import TV shows
4. Wait for import to complete

### 5. Add Apps

1. Go to `/admin/apps`
2. Click "Add App"
3. Fill in app details
4. Go to `/admin/apps/{app-id}`
5. Add platform files (Android, Windows, iOS, etc.)

## Flutter Mobile App Setup

### Prerequisites

1. Install Flutter SDK: https://docs.flutter.dev/get-started/install
2. Install Android Studio (for Android development)
3. Install Xcode (for iOS development - Mac only)

### Create Flutter Project

```bash
flutter create streamverse_mobile
cd streamverse_mobile
```

### Add Dependencies

Edit `pubspec.yaml`:

```yaml
dependencies:
  flutter:
    sdk: flutter
  supabase_flutter: ^2.0.0
  http: ^1.2.0
  cached_network_image: ^3.3.0
  flutter_secure_storage: ^9.0.0
  provider: ^6.1.0
  video_player: ^2.8.0
  chewie: ^1.7.0
  url_launcher: ^6.2.0
  path_provider: ^2.1.0
  permission_handler: ^11.0.0
```

### Supabase Configuration

Create `lib/supabase_client.dart`:

```dart
import 'package:supabase_flutter/supabase_flutter.dart';

final supabase = Supabase.initialize(
  url: 'https://vtqhlaprxsstjczzckiz.supabase.co',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ0cWhsYXByeHNzdGpjenpja2l6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIyODIzODgsImV4cCI6MjA5Nzg1ODM4OH0.CJhaz9Ppr4vAcus0s2IrDaC2I2tKaGOJineg_rXSaRk',
);
```

### App Structure

```
lib/
├── main.dart
├── supabase_client.dart
├── screens/
│   ├── auth/
│   │   ├── login_screen.dart
│   │   └── register_screen.dart
│   ├── home/
│   │   ├── home_screen.dart
│   │   └── tabs/
│   │       ├── movies_tab.dart
│   │       ├── series_tab.dart
│   │       └── apps_tab.dart
│   ├── apps/
│   │   ├── apps_list_screen.dart
│   │   └── app_detail_screen.dart
│   └── streaming/
│       └── video_player_screen.dart
├── models/
│   ├── app.dart
│   ├── movie.dart
│   └── user.dart
└── services/
    ├── auth_service.dart
    ├── apps_service.dart
    └── movies_service.dart
```

### Design System

Use the same colors as web app:
- Primary: #6366f1 (Indigo)
- Background: #0f172a (Dark)
- Card: #1e293b
- Text: #f8fafc

### Key Features to Implement

1. **Authentication** - Login/Register with Supabase
2. **Apps Section** - List apps, download functionality
3. **Movies Section** - Browse movies, watch trailers
4. **Streaming** - Video player integration
5. **Profile** - User account, download history

### Build Commands

```bash
# Android APK
flutter build apk --release

# Android App Bundle (for Play Store)
flutter build appbundle --release

# iOS (Mac only)
flutter build ios --release
```

## Testing Checklist

- [ ] Database migration successful
- [ ] Web app deployed to Vercel
- [ ] Admin panel accessible
- [ ] Content import working
- [ ] Apps section functional
- [ ] Download system working
- [ ] Authentication working
- [ ] Payment system configured
- [ ] Flutter app builds successfully
- [ ] Flutter app connects to Supabase
- [ ] All features tested on mobile

## Troubleshooting

### Database Migration Issues
- Check Supabase logs for errors
- Verify table permissions
- Ensure RLS policies are correct

### Vercel Deployment Issues
- Check environment variables
- Verify build logs
- Ensure all dependencies are installed

### Flutter Issues
- Run `flutter doctor` to check setup
- Update Flutter SDK: `flutter upgrade`
- Clean build: `flutter clean`
