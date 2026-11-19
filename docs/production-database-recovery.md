# PULSE production database recovery runbook

**Status: preparation only. No production backup has been created or restore test completed.**

## 1. Current release guard

Do not apply production migrations or merge/deploy activation code until a recoverable pre-change backup has been created and independently verified.

The Supabase dashboard screenshots reviewed on 2026-11-19 showed:
- Scheduled backups were not included in the current plan.
- Point-in-Time Recovery was shown as a Pro Plan add-on.

Those screenshots do not prove that a separate export or restore is available.

## 2. What the Supabase CLI logical dump covers

The supported CLI workflow uses supabase db dump for roles, project schema, and data. Supabase documents that the CLI filters out Supabase-managed schemas such as auth and storage, and extension-created schemas. The default schema dump also does not include data or custom roles unless the relevant flags are used.

Example commands (run locally from a trusted computer; never paste credentials into chat):

```powershell
$env:SUPABASE_DB_URL = Read-Host "Paste the database connection string"

supabase db dump --db-url "$env:SUPABASE_DB_URL" -f roles.sql --role-only
supabase db dump --db-url "$env:SUPABASE_DB_URL" -f schema.sql
supabase db dump --db-url "$env:SUPABASE_DB_URL" -f data.sql --use-copy --data-only -x "storage.buckets_vectors" -x "storage.vector_indexes"
```

**Scope warning:** These files are a logical export of the supported project database objects, not a complete Supabase project backup. They do not, by themselves, preserve managed Auth/Storage schemas, Storage file objects, project/API settings, Edge Function deployments, SMTP/provider configuration, or all platform-level settings. Do not label them a full disaster-recovery backup.

Official references:
- https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore
- https://supabase.com/docs/reference/cli/supabase-db-dump

## 3. Backup acceptance checklist

Before a production migration, record and verify all of the following:

- [ ] Export completed with exit code 0.
- [ ] Roles, schema, and data files exist and are non-empty.
- [ ] Files are stored privately, with an encrypted second copy outside the device.
- [ ] File hashes (for example SHA-256) are recorded.
- [ ] Schema includes the PULSE-owned tables, functions, triggers, policies, and views.
- [ ] The export's exclusions are understood; managed Auth and Storage data are not falsely marked as covered.
- [ ] A restore rehearsal succeeds in an isolated PostgreSQL environment compatible with production PostgreSQL 17.
- [ ] Restored table counts and key schema definitions are checked.
- [ ] Supabase Auth, Storage objects, Edge Functions, and project settings have a separately confirmed recovery path where required.
- [ ] The backup timestamp and restore-test result are recorded.

If a complete managed-project recovery path cannot be confirmed, keep the activation release on hold.

## 4. Migration release procedure

For the pending activation release:

1. Verify production migration history immediately before the change.
2. Confirm that the pre-change backup is accepted under Section 3.
3. Apply the three activation migrations in their exact order:
   - 20261028120000_activation_failure_atomicity.sql
   - 20261028130000_activation_preflight.sql
   - 20261028140000_activation_identity_binding.sql
4. Verify the new preflight function, activation function definition, grants, and migration history using read-only queries.
5. Only after database verification, approve the application PR merge/deployment.
6. Run activation smoke tests using a dedicated test card/account, not a customer card.
7. If a migration fails, stop. Do not continue to the next migration or manually edit migration history.

## 5. Recovery principles

- Prefer a tested forward corrective migration for function or schema changes.
- Do not delete rows from Supabase migration history to pretend a migration did not run.
- Do not restore the production project or overwrite live data without explicit approval and a verified recovery plan.
- Do not delete Auth users as cleanup; unbound Auth identities may belong to legitimate signup flows.
- Keep database exports, connection strings, passwords, API keys, and service-role credentials out of Git, screenshots, chat, and public storage.

## 6. Current limitations

The manual CLI export and its restore have not yet been run from the user's tablet. A SQL Editor read-only inspection is not a backup. The runbook is documentation only and does not authorize applying migrations, merging pull requests, deploying, or changing the Supabase plan.
