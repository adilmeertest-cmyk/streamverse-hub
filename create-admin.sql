-- SQL script to grant super_admin role to a user
-- Replace 'YOUR_USER_EMAIL' with the email of the user you want to make admin
-- Run this in the Supabase SQL Editor

-- First, get the user ID from their email
-- SELECT id FROM auth.users WHERE email = 'YOUR_USER_EMAIL';

-- Then grant the role (replace USER_ID with the actual UUID from above)
INSERT INTO public.user_roles (user_id, role)
VALUES ('USER_ID', 'super_admin')
ON CONFLICT (user_id, role) DO NOTHING;

-- Verify the role was granted
-- SELECT * FROM public.user_roles WHERE user_id = 'USER_ID';
