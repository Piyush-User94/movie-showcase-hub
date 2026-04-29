-- Seat locks table
CREATE TABLE IF NOT EXISTS public.seat_locks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  showtime_id uuid NOT NULL REFERENCES public.showtimes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  seat_number text NOT NULL,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '5 minutes'),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (showtime_id, seat_number)
);

CREATE INDEX IF NOT EXISTS idx_seat_locks_showtime ON public.seat_locks(showtime_id);
CREATE INDEX IF NOT EXISTS idx_seat_locks_expires ON public.seat_locks(expires_at);

ALTER TABLE public.seat_locks ENABLE ROW LEVEL SECURITY;

-- Authenticated users can see active locks (needed to render seat map)
CREATE POLICY "Authenticated can view active locks"
  ON public.seat_locks FOR SELECT
  TO authenticated
  USING (expires_at > now());

CREATE POLICY "Users can create their own locks"
  ON public.seat_locks FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own locks"
  ON public.seat_locks FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Cleanup expired locks (call periodically or before checks)
CREATE OR REPLACE FUNCTION public.cleanup_expired_locks()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.seat_locks WHERE expires_at <= now();
$$;

-- Combined unavailable seats: booked + currently-locked
CREATE OR REPLACE FUNCTION public.get_unavailable_seats(showtime_uuid uuid)
RETURNS text[]
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result text[];
BEGIN
  SELECT COALESCE(array_agg(DISTINCT seat), '{}'::text[])
  INTO result
  FROM (
    SELECT unnest(seat_numbers) AS seat
    FROM public.bookings
    WHERE showtime_id = showtime_uuid
      AND status IN ('pending', 'confirmed', 'paid')
    UNION ALL
    SELECT seat_number AS seat
    FROM public.seat_locks
    WHERE showtime_id = showtime_uuid
      AND expires_at > now()
  ) s;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_unavailable_seats(uuid) TO anon, authenticated;

-- Lock a set of seats for the calling user; returns true if all locked, false otherwise.
-- Releases prior expired locks first; uses INSERT with conflict detection for atomicity.
CREATE OR REPLACE FUNCTION public.lock_seats(
  showtime_uuid uuid,
  seats text[]
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  taken text[];
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Clear expired locks
  DELETE FROM public.seat_locks WHERE expires_at <= now();

  -- Release any prior locks this user holds on this showtime
  DELETE FROM public.seat_locks
  WHERE showtime_id = showtime_uuid AND user_id = uid;

  -- Check none of the requested seats are booked
  SELECT COALESCE(array_agg(s), '{}'::text[]) INTO taken
  FROM (
    SELECT unnest(seat_numbers) AS s
    FROM public.bookings
    WHERE showtime_id = showtime_uuid
      AND status IN ('pending', 'confirmed', 'paid')
  ) b
  WHERE s = ANY(seats);

  IF array_length(taken, 1) > 0 THEN
    RETURN false;
  END IF;

  -- Try to insert all locks; rely on unique (showtime_id, seat_number)
  BEGIN
    INSERT INTO public.seat_locks (showtime_id, user_id, seat_number)
    SELECT showtime_uuid, uid, s FROM unnest(seats) AS s;
  EXCEPTION WHEN unique_violation THEN
    RETURN false;
  END;

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.lock_seats(uuid, text[]) TO authenticated;

-- Release all of caller's locks for a showtime
CREATE OR REPLACE FUNCTION public.release_seats(showtime_uuid uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;
  DELETE FROM public.seat_locks
  WHERE showtime_id = showtime_uuid AND user_id = auth.uid();
END;
$$;

GRANT EXECUTE ON FUNCTION public.release_seats(uuid) TO authenticated;