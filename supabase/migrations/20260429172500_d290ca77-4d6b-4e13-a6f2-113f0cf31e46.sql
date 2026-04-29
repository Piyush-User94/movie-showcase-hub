-- 1. Add seat persistence column
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS seat_numbers text[] DEFAULT '{}'::text[];

CREATE INDEX IF NOT EXISTS idx_bookings_showtime_id ON public.bookings(showtime_id);

-- 2. Tighten RLS: bookings — restrict to authenticated role
DROP POLICY IF EXISTS "Users can view their own bookings" ON public.bookings;
DROP POLICY IF EXISTS "Users can create their own bookings" ON public.bookings;
DROP POLICY IF EXISTS "Users can update their own bookings" ON public.bookings;

CREATE POLICY "Users can view their own bookings"
  ON public.bookings FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own bookings"
  ON public.bookings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own bookings"
  ON public.bookings FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Allow authenticated users to see which seats are taken for a showtime
-- (only seat_numbers are needed; we expose via a security definer function below)
CREATE OR REPLACE FUNCTION public.get_booked_seats(showtime_uuid uuid)
RETURNS text[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(array_agg(seat), '{}'::text[])
  FROM (
    SELECT unnest(seat_numbers) AS seat
    FROM public.bookings
    WHERE showtime_id = showtime_uuid
      AND status IN ('pending', 'confirmed', 'paid')
  ) s;
$$;

GRANT EXECUTE ON FUNCTION public.get_booked_seats(uuid) TO anon, authenticated;

-- 3. Tighten RLS: profiles
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- 4. Tighten RLS: user_preferences
DROP POLICY IF EXISTS "Users can view their own preferences" ON public.user_preferences;
DROP POLICY IF EXISTS "Users can insert their own preferences" ON public.user_preferences;
DROP POLICY IF EXISTS "Users can update their own preferences" ON public.user_preferences;

CREATE POLICY "Users can view their own preferences"
  ON public.user_preferences FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own preferences"
  ON public.user_preferences FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences"
  ON public.user_preferences FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);