# Vercel Deployment Guide for StreamFlix

## Prerequisites
- Vercel account
- Supabase project with all tables set up
- Stripe account (for payments)
- TMDB API key

## Environment Variables Setup

In your Vercel project settings, add these environment variables:

### Required Environment Variables:
```
TMDB_API_KEY=your_tmdb_api_key
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
SUPABASE_PROJECT_ID=your_supabase_project_id
SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
SUPABASE_URL=your_supabase_url
VITE_SUPABASE_PROJECT_ID=your_supabase_project_id
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
VITE_SUPABASE_URL=your_supabase_url
```

### How to get these values:

**Supabase:**
1. Go to your Supabase project dashboard
2. Settings → API
3. Copy Project URL, Project ID, and anon/public key

**TMDB:**
1. Sign up at https://www.themoviedb.org/
2. Go to Settings → API
3. Create an API key

**Stripe:**
1. Go to Stripe Dashboard → Developers → API keys
2. Copy the secret key (starts with sk_test_ or sk_live_)
3. Set up webhook in Stripe Dashboard → Webhooks
4. Add your Vercel deployment URL + `/api/stripe/webhook`
5. Copy the webhook signing secret

## Deployment Steps

### Option 1: Deploy via Vercel CLI

1. Install Vercel CLI:
```bash
npm install -g vercel
```

2. Login to Vercel:
```bash
vercel login
```

3. Deploy from project root:
```bash
vercel
```

4. Follow the prompts to set up environment variables

5. Deploy to production:
```bash
vercel --prod
```

### Option 2: Deploy via Vercel Dashboard

1. Go to https://vercel.com/dashboard
2. Click "Add New Project"
3. Import your Git repository
4. Configure build settings:
   - **Framework Preset:** Other
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
   - **Install Command:** `npm install`

5. Add environment variables in the project settings

6. Click "Deploy"

## Post-Deployment Setup

### 1. Set up Admin User

After deployment, you need to create an admin user:

1. Sign up on your deployed site
2. Go to Supabase SQL Editor
3. Run this query to get your user ID:
```sql
SELECT id, email FROM auth.users WHERE email = 'your_email@example.com';
```

4. Grant admin role:
```sql
INSERT INTO public.user_roles (user_id, role)
VALUES ('YOUR_USER_ID_HERE', 'super_admin')
ON CONFLICT (user_id, role) DO NOTHING;
```

### 2. Configure Stripe Webhook

1. In Stripe Dashboard, create a webhook
2. Endpoint: `https://your-domain.vercel.app/api/stripe/webhook`
3. Select events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`
4. Copy the webhook secret and add to Vercel environment variables

### 3. Test the Deployment

- Visit your Vercel deployment URL
- Test sign up/sign in
- Test browsing content
- Test admin panel (navigate to /admin)
- Test subscription flow

## Troubleshooting

### 404 Errors
If you see 404 errors:
- Ensure `vercel.json` is in your project root
- Check that the build output directory is `dist`
- Verify environment variables are set correctly

### Build Errors
- Ensure all dependencies are installed
- Check Node.js version (should be 18+)
- Verify TypeScript compilation

### Authentication Issues
- Check Supabase URL and keys are correct
- Ensure email confirmation is enabled in Supabase
- Verify redirect URLs in Supabase auth settings

### Admin Panel Not Accessible
- Ensure user has admin role in `user_roles` table
- Check that the user email is verified
- Verify the role is one of: super_admin, content_manager, moderator, finance_manager, support_agent, analytics_manager

## Custom Domain (Optional)

1. In Vercel project settings → Domains
2. Add your custom domain
3. Update DNS records as instructed by Vercel
4. Update Supabase redirect URLs to include your custom domain

## Monitoring

- Check Vercel deployment logs for errors
- Monitor Supabase logs for database issues
- Use Stripe Dashboard to monitor payments
- Set up error tracking (Sentry, etc.) if needed

## Support

For issues:
- Check Vercel deployment logs
- Review Supabase logs
- Verify all environment variables are set
- Ensure database migrations have been run
