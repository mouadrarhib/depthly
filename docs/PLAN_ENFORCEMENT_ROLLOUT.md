# Plan enforcement rollout

Migrations 021 and 022 are intentionally split. Do not push both against the
current production frontend in one step: 022 removes direct writes that the old
client still uses.

## Preflight

1. Take a production database backup.
2. Start Docker Desktop and run:

   ```sh
   supabase db reset
   supabase test db
   npm run typecheck
   npm run build
   ```

3. Compare the live definitions introduced by migrations 012–020 with the
   repository. The linked migration ledger currently records only 001–011.
   After confirming the definitions match, repair only the ledger:

   ```sh
   supabase migration repair 012 013 014 015 016 017 018 019 020 --status applied --linked
   ```

## Stage 1: APIs and compatible enforcement

1. Apply `021_server_side_plan_enforcement.sql` through the Supabase SQL editor
   or another transaction-aware migration runner.
2. Mark 021 applied if the SQL editor was used:

   ```sh
   supabase migration repair 021 --status applied --linked
   ```

3. Smoke-test an authenticated Free and Pro fixture account.
4. Deploy the RPC-enabled frontend. The Vercel CLI is not currently installed;
   install it with `npm i -g vercel` before using `vercel env pull`,
   `vercel deploy`, or `vercel logs`.

## Stage 2: close direct writes

1. Confirm production profile/avatar updates, project create/archive, timer
   start, Analytics, CSV export, and global leaderboards are calling the new
   RPCs successfully.
2. Apply `022_lock_down_profile_and_project_writes.sql`, followed by
   `023_explicit_client_table_grants.sql`.
3. Verify with authenticated REST requests that direct changes to
   `profiles.plan`, profile statistics, `projects.user_id`, and
   `projects.is_archived` are denied while the supported RPCs still work.
4. Confirm `supabase migration list --linked` records 001–023.

Do not use `supabase db push --linked` before 021 has been applied and marked:
with the current ledger it would attempt to replay 012–022, and a single push
would remove the compatibility window between 021 and 022.
