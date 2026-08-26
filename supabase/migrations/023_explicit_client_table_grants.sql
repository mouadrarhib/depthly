-- Make the RLS access model reproducible on a fresh Supabase project.
-- Historical migrations created policies but relied on dashboard/default
-- table grants that are not present during a clean local CLI replay.

grant select on table public.profiles to authenticated;

grant select, update on table public.user_preferences to authenticated;
grant select, update on table public.goals to authenticated;

grant select, delete on table public.projects to authenticated;
grant update (name, color, icon, sort_order, last_used_at)
  on table public.projects to authenticated;

grant select, insert, update, delete on table public.tasks to authenticated;
grant select on table public.sessions to authenticated;
grant select on table public.daily_summaries to authenticated;
grant select on table public.user_stats to authenticated;
grant select, insert, update, delete on table public.follows to authenticated;
grant select on table public.subscriptions to authenticated;
grant select on table public.active_timer_runs to authenticated;

-- Supabase Edge Functions and local admin tooling use service_role. Hosted
-- projects normally receive these defaults automatically; declare them here
-- so a clean CLI replay behaves identically while RLS remains bypassed only
-- for this trusted role.
grant all privileges on all tables in schema public to service_role;
grant all privileges on all sequences in schema public to service_role;

-- Intentionally no base-table grants to anon. Anonymous public profile reads
-- continue through the narrow public_profiles view only.

comment on table public.profiles is
  'Owner-readable identity, plan, billing, trust and aggregate state. Client writes are accepted only through whitelisted RPCs.';
