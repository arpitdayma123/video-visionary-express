
-- Add has_seen_tutorial column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN has_seen_tutorial BOOLEAN DEFAULT false;
