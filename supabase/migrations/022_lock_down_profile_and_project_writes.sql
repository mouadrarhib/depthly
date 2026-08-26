-- Apply only after the RPC-enabled frontend that accompanies migration 021
-- is deployed. This closes the temporary compatibility window.

-- Profiles are maintained by trusted database functions, billing webhooks,
-- and the service role. Authenticated clients have no direct write surface.
revoke insert, update, delete on table public.profiles from anon, authenticated;

-- Project identity, ownership, creation, and archive state are controlled by
-- create_project() and set_project_archived(). Owners retain direct edits only
-- for non-security-sensitive presentation/order metadata under existing RLS.
revoke insert, update on table public.projects from anon, authenticated;
grant update (name, color, icon, sort_order, last_used_at)
  on table public.projects to authenticated;

comment on table public.profiles is
  'Identity, plan, billing, trust and aggregate state. Client writes are accepted only through whitelisted RPCs.';
