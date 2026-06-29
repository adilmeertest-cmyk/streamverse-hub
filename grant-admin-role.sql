-- SQL script to grant super_admin role to a user
-- Run this in Supabase SQL Editor after user registration

-- Step 1: Find the user ID by email
-- Replace 'user@example.com' with the actual email address
SELECT id, email FROM auth.users WHERE email = 'user@example.com';

-- Step 2: Grant super_admin role to the user
-- Replace 'USER_UUID_HERE' with the actual user ID from step 1
INSERT INTO public.user_roles (user_id, role)
VALUES ('USER_UUID_HERE', 'super_admin')
ON CONFLICT (user_id, role) DO NOTHING;

-- Step 3: Verify the role was granted
SELECT ur.user_id, u.email, ur.role, ur.created_at
FROM public.user_roles ur
JOIN auth.users u ON u.id = ur.user_id
WHERE ur.role = 'super_admin';

-- Note: You can also grant other admin roles:
-- content_manager, moderator, finance_manager, support_agent, analytics_manager
