-- Add explicit restrictive RLS policies blocking any anonymous (unauthenticated) access
-- to tables containing personal/sensitive data. Existing permissive policies already
-- restrict to the 'authenticated' role; these restrictive policies make denial explicit.

CREATE POLICY "Block anonymous access to profiles"
ON public.profiles
AS RESTRICTIVE
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

CREATE POLICY "Block anonymous access to bookings"
ON public.bookings
AS RESTRICTIVE
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

CREATE POLICY "Block anonymous access to user_preferences"
ON public.user_preferences
AS RESTRICTIVE
FOR ALL
TO anon
USING (false)
WITH CHECK (false);
