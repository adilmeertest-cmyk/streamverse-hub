-- Add stripe_product_id column to subscription_plans for Stripe product tracking
ALTER TABLE public.subscription_plans ADD COLUMN IF NOT EXISTS stripe_product_id text;
