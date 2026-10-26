CREATE TABLE public.rdp_requests (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL,
 status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved')),
 desktop_id uuid REFERENCES public.desktops(id) ON DELETE SET NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 approved_at timestamptz
);
GRANT SELECT ON public.rdp_requests TO authenticated;
GRANT ALL ON public.rdp_requests TO service_role;
ALTER TABLE public.rdp_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read own RDP requests" ON public.rdp_requests FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE UNIQUE INDEX rdp_requests_one_pending ON public.rdp_requests(user_id) WHERE status='pending';
CREATE INDEX rdp_requests_created ON public.rdp_requests(created_at);
CREATE OR REPLACE FUNCTION public.claim_rdp_desktop() RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _uid uuid := auth.uid(); _id uuid;
BEGIN
 IF _uid IS NULL THEN RAISE EXCEPTION 'Not signed in'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(_uid::text,0));
 SELECT id INTO _id FROM public.desktops WHERE assigned_to=_uid AND expires_at>now() LIMIT 1;
 IF _id IS NOT NULL THEN RETURN _id; END IF;
 INSERT INTO public.rdp_requests(user_id) VALUES (_uid)
 ON CONFLICT (user_id) WHERE status='pending' DO UPDATE SET user_id=EXCLUDED.user_id
 RETURNING id INTO _id;
 RETURN _id;
END $$;
REVOKE ALL ON FUNCTION public.claim_rdp_desktop() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_rdp_desktop() TO authenticated;
REVOKE ALL ON FUNCTION public.claim_desktop(text) FROM PUBLIC, anon, authenticated;
COMMENT ON FUNCTION public.claim_desktop(text) IS 'DEPRECATED: use the approval-based claim_rdp_desktop request flow.';
CREATE OR REPLACE FUNCTION public.approve_rdp_request(_request_id uuid, _desktop_id uuid) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _request public.rdp_requests; _desktop public.desktops;
BEGIN
 SELECT * INTO _request FROM public.rdp_requests WHERE id=_request_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'Request not found'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(_request.user_id::text,0));
 SELECT * INTO _request FROM public.rdp_requests WHERE id=_request_id FOR UPDATE;
 IF _request.status <> 'pending' THEN RAISE EXCEPTION 'This request has already been approved'; END IF;
 IF EXISTS (SELECT 1 FROM public.desktops WHERE assigned_to=_request.user_id AND expires_at>now()) THEN RAISE EXCEPTION 'This user already has an active machine'; END IF;
 SELECT * INTO _desktop FROM public.desktops WHERE id=_desktop_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Machine not found'; END IF;
 IF NOT _desktop.enabled OR (_desktop.assigned_to IS NOT NULL AND (_desktop.expires_at IS NULL OR _desktop.expires_at>now())) THEN RAISE EXCEPTION 'This machine is not available'; END IF;
 IF _desktop.os <> 'Windows' OR coalesce(trim(_desktop.rdp_ip),'')='' OR coalesce(trim(_desktop.rdp_username),'')='' OR coalesce(_desktop.rdp_password,'')='' THEN RAISE EXCEPTION 'Add complete Windows RDP credentials before approving'; END IF;
 UPDATE public.desktops SET assigned_to=_request.user_id, expires_at=now()+interval '30 days' WHERE id=_desktop_id;
 UPDATE public.rdp_requests SET status='approved', desktop_id=_desktop_id, approved_at=now() WHERE id=_request_id;
 RETURN _desktop_id;
END $$;
REVOKE ALL ON FUNCTION public.approve_rdp_request(uuid,uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.approve_rdp_request(uuid,uuid) TO service_role;
DROP POLICY IF EXISTS "admin all" ON public.desktops;
REVOKE INSERT, UPDATE, DELETE ON public.desktops FROM authenticated;
GRANT SELECT ON public.desktops TO authenticated;
GRANT ALL ON public.desktops TO service_role;
CREATE OR REPLACE FUNCTION public.release_desktop() RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not signed in'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(auth.uid()::text,0));
 UPDATE public.desktops SET assigned_to=NULL, expires_at=NULL WHERE assigned_to=auth.uid();
END $$;
REVOKE ALL ON FUNCTION public.release_desktop() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.release_desktop() TO authenticated;