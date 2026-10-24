ALTER TABLE public.desktops
  ADD COLUMN rdp_ip text,
  ADD COLUMN rdp_port integer NOT NULL DEFAULT 3389,
  ADD COLUMN rdp_username text,
  ADD COLUMN rdp_password text;

COMMENT ON COLUMN public.desktops.vnc_url IS 'DEPRECATED: replaced by rdp_ip/rdp_port (Windows RDP)';
COMMENT ON COLUMN public.desktops.os IS 'DEPRECATED: all desktops are Windows RDP now';

CREATE OR REPLACE FUNCTION public.claim_rdp_desktop()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _desk uuid;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not signed in';
  END IF;

  -- Free any expired assignments first
  UPDATE public.desktops
    SET assigned_to = NULL, expires_at = NULL
    WHERE expires_at IS NOT NULL AND expires_at <= now();

  -- One active desktop per user
  SELECT id INTO _desk FROM public.desktops
    WHERE assigned_to = _uid AND expires_at > now();
  IF FOUND THEN
    RETURN _desk;
  END IF;

  -- Claim a free enabled desktop for 30 days
  UPDATE public.desktops
    SET assigned_to = _uid, expires_at = now() + interval '30 days'
    WHERE id = (
      SELECT id FROM public.desktops
      WHERE enabled AND assigned_to IS NULL
      ORDER BY created_at
      LIMIT 1
      FOR UPDATE SKIP LOCKED
    )
    RETURNING id INTO _desk;

  IF _desk IS NULL THEN
    RAISE EXCEPTION 'No desktops available right now';
  END IF;
  RETURN _desk;
END;
$$;

CREATE OR REPLACE FUNCTION public.count_available_desktops()
RETURNS TABLE(available bigint, total bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    count(*) FILTER (WHERE enabled AND (assigned_to IS NULL OR expires_at <= now())),
    count(*) FILTER (WHERE enabled)
  FROM public.desktops
$$;

GRANT EXECUTE ON FUNCTION public.claim_rdp_desktop() TO authenticated;
GRANT EXECUTE ON FUNCTION public.count_available_desktops() TO authenticated, anon;