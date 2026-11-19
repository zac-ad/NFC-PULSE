# PULSE production database recovery runbook

**Status: reusable checklist. Complete and verify each item for the target project before a production release.**

## 1. Production release guard

Do not apply production migrations or merge/deploy activation code until a recoverable pre-change backup has been created and independently verified.

The production project is currently on the Supabase Free Plan. The Backups page states that scheduled project backups are not included; the Point in Time tab is also unavailable without a paid plan. Do not treat either feature as an available recovery path.

Record the backup date, project ref, PostgreSQL major version, export scope, file hashes, storage-object verification, and restore-test result in a private operations record. Do not commit this record or backup artifacts to Git.

## 2. Inventory observed on 2026-11-19

Read-only SQL inspection of production reported:

- PostgreSQL 17.11.
- 10 public base tables and 2 public views.
- 7 public functions, 10 public policies, 32 public indexes, and 0 public triggers.
- 6 Auth users.
- One private Storage bucket, `profile-media`, containing 23 object records.
- 19 applied Supabase migrations; latest version `20261002071402`.

These counts are a point-in-time inventory, not a backup. Re-run the inventory immediately before the release because production may change.

## 3. What the Supabase CLI logical dump covers

The supported CLI workflow uses `supabase db dump` for roles, project schema, and data. Supabase documents that the CLI filters out Supabase-managed schemas such as `auth` and `storage`, and extension-created schemas. A schema dump also does not include table data or custom roles unless the relevant flags are used.

Run the following from PowerShell on a trusted Windows computer with Supabase CLI and the required PostgreSQL client tools installed. Use the database connection string from the Supabase dashboard's Connect panel. Never paste credentials into chat, Git, screenshots, or a shared document. Do not save the connection string in this repository.

Create a private backup directory outside the repository:

```powershell
$BackupDir = Join-Path $env:USERPROFILE ("PULSE-DB-Backup-" + (Get-Date -Format "yyyyMMdd-HHmmss"))
New-Item -ItemType Directory -Path $BackupDir | Out-Null
Set-Location $BackupDir
```

Set `SUPABASE_DB_URL` in the local PowerShell session using your approved local secret-handling method. Do not put the literal connection string in a command that will be saved in shell history. Current Supabase CLI v3 uses `--remote=<project-ref|database-url>`; the commands below pass the URL explicitly so they do not depend on a previously linked project. Then run:

```powershell
supabase db dump --remote="$env:SUPABASE_DB_URL" -f roles.sql --role-only
if ($LASTEXITCODE -ne 0) { throw "Roles export failed" }

supabase db dump --remote="$env:SUPABASE_DB_URL" -f schema.sql
if ($LASTEXITCODE -ne 0) { throw "Schema export failed" }

supabase db dump --remote="$env:SUPABASE_DB_URL" -f data.sql --use-copy --data-only -x "storage.buckets_vectors" -x "storage.vector_indexes"
if ($LASTEXITCODE -ne 0) { throw "Data export failed" }
```

Check that the three files exist and are non-empty, then record SHA-256 hashes:

```powershell
Get-Item roles.sql, schema.sql, data.sql | Select-Object Name, Length
Get-FileHash roles.sql, schema.sql, data.sql -Algorithm SHA256
```

If a command fails, stop and preserve the error. Do not proceed with a partial export.

**Scope warning:** These files are a logical export of supported project database objects, not a complete Supabase project backup. They do not, by themselves, preserve managed Auth/Storage schemas, Storage file objects, project/API settings, Edge Function deployments, SMTP/provider configuration, or all platform-level settings. Do not label them a full disaster-recovery backup.

## 4. Separate Auth and Storage recovery work

The standard CLI logical dump procedure in Section 3 does not by itself provide a complete managed Auth or Storage recovery package. Supabase's current migration guidance describes separate handling for Auth schema data, customizations inside managed schemas, and Storage objects. Do not assume the standard dump covers these items, and do not blindly import managed schemas into another live project.

For Auth, do not treat a CSV of users as a recoverable Auth backup. Supabase documents that `auth.users` and `auth.identities` can be queried/exported, and its Auth migration guidance describes migrating the Auth schema (including users and hashed passwords) using a full database backup or PostgreSQL export/import. That is materially different from exporting user IDs and emails.

For a manual recovery path, the supported Supabase CLI logical dump above is not sufficient by itself to prove Auth recovery. Before relying on a separate Auth-schema export, verify the exact production Auth objects and PostgreSQL version, determine whether the current database role can read and dump all required Auth objects, and test restoring them into a disposable Supabase project/database of a compatible platform version. Do not blindly import managed Auth tables into an existing live project. Do not put the dump in Git or an ordinary unencrypted folder; it contains sensitive identity data and password hashes. Keep it encrypted and access-restricted. Record the exact export command, included schemas/objects, restore procedure, and test outcome. If this cannot be completed safely, Auth recovery remains an explicit gap and the full-project backup gate remains blocked.

Official guidance:
- Auth user export: https://supabase.com/docs/guides/auth/managing-user-data
- Auth schema migration: https://supabase.com/kb/troubleshooting/migrating-auth-users-between-projects
- CLI backup/restore and managed-schema customizations: https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore

### Storage object export (Windows PowerShell)

The official Supabase CLI supports listing and copying remote Storage objects. On the trusted computer, authenticate with the Supabase CLI and use the project ref explicitly. The commands below use the current CLI's experimental Storage commands; check `supabase storage cp --help` if the installed CLI reports a syntax change.

```powershell
supabase login
supabase storage ls ss:///profile-media --recursive --experimental --remote=gxbpahfmwfhsyzeovkqu
if ($LASTEXITCODE -ne 0) { throw "Remote Storage listing failed" }

$StorageBackup = Join-Path $BackupDir "profile-media"
New-Item -ItemType Directory -Path $StorageBackup | Out-Null

supabase storage cp ss:///profile-media "$StorageBackup" --recursive --experimental --remote=gxbpahfmwfhsyzeovkqu
if ($LASTEXITCODE -ne 0) { throw "Storage object copy failed" }

$Files = Get-ChildItem -LiteralPath $StorageBackup -File -Recurse
$Files.Count
$Files | Get-FileHash -Algorithm SHA256 | Export-Csv -NoTypeInformation -Path (Join-Path $BackupDir "storage-sha256.csv")
```

The source URI is the remote bucket; the destination is a local directory. Do not use `storage mv` or `storage rm` for backup. Compare the downloaded object paths and count with the Storage listing and the production metadata inventory. At the 2026-11-19 inspection, `profile-media` was private and had 23 object records (10 PNG, 11 JPEG, 2 GIF; approximately 5.18 MB from metadata). Re-check the live count before export because it can change. Preserve the relative paths exactly. A successful copy command alone is not proof: verify all files exist and hashes are recorded.

For a separate destination project restore, the CLI's Storage copy command uploads a local directory into a bucket; do not point that command at production during a backup exercise.

Also record how deployed Edge Functions, environment secrets, redirect URLs, authentication provider settings, and other required project configuration would be recreated. Supabase documents CLI commands for listing/downloading Edge Functions; function secrets and project settings still need a separate secure inventory and recreation plan. Never put secret values in the runbook or Git.

If any required Auth, Storage, or platform recovery path is unknown, the full-project backup gate remains blocked.

## 5. Edge Functions, Vercel environment, and project configuration inventory

A read-only connector inventory on 2026-11-19 returned **zero deployed Supabase Edge Functions** for project `gxbpahfmwfhsyzeovkqu`. Re-run the function inventory before a release; if functions are added later, list each function name, source revision, entrypoint, import map, runtime settings, and JWT verification setting. Keep the source in Git and retain any non-repository deployment configuration separately. Do not assume an empty inventory will remain empty.

The Vercel project inventory for `nfc-pulse` (team `vounty`) returned:
- Framework: Next.js; configured Node.js version: 24.x.
- Domains: `nfc-pulse-wine.vercel.app`, `nfc-pulse-vounty.vercel.app`, and `nfc-pulse-git-main-vounty.vercel.app`.
- Password protection: disabled.
- SSO protection: enabled for deployments except custom domains.
- Trusted IP restrictions: disabled.
- Environment variable inventory: 15 entries across production, preview, and development; zero hidden production variables reported. Names observed (values intentionally not read or recorded): `NEXT_PUBLIC_SITE_URL`, `ORG_SESSION_SECRET`, `ADMIN_SESSION_SECRET`, `SESSION_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_PASSPHRASE`, `RESEND_API_KEY`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `NEXT_PUBLIC_SUPABASE_URL`. Some names have separate environment-target entries.

This inventory is metadata only. It does not back up the values of environment variables, Vercel project settings, Git connection, domains/DNS, deployment protection configuration, or third-party provider configuration. Do not decrypt or print secrets into this runbook. Before release, create a private configuration recovery record that identifies each required variable by name and target, verifies that its value is available through its authoritative secret manager, and documents how to re-enter it into a replacement project. Do not copy secret values into Git, chat, or ordinary files.

For the Supabase project dashboard, separately record (without secret values) Auth URL configuration, redirect allow-list, enabled identity providers, email/SMTP settings, rate limits, CAPTCHA settings if used, custom domains, API settings, and any other project-level configuration needed to recreate sign-in and callbacks. The current connected Supabase actions do not expose a complete Auth/provider settings export, so this part still requires a manual dashboard inventory and restore test. Record which settings are unavailable or cannot be recreated.

The live Supabase project inventory on 2026-11-19 also confirmed:
- Project status: `ACTIVE_HEALTHY`.
- Region: `ap-southeast-2`.
- PostgreSQL: `17.11.0.003` (major version 17).
- Installed extensions reported by the database extension inventory: `supabase_vault` in schema `vault`, `uuid-ossp` and `pgcrypto` in schema `extensions`, `plpgsql` in `pg_catalog`, and `pg_stat_statements` in `extensions`.
- The migration history contains 19 recorded migrations; the latest recorded version is `20261002071402` (`account_auth_lifecycle`). This is an inventory only; do not replay recorded migrations as part of recovery.

The extension API also lists many available-but-not-installed extensions. Do not install them during restore simply because they appear in that catalogue. Recreate only extensions confirmed installed in the source project, using compatible versions and schemas, then verify application behavior.

The project and environment inventories above are point-in-time observations. Re-run them immediately before the backup and store the results in the private operations record, not in a public repository if they reveal operational details.

## 6. Restore rehearsal

Use an isolated local PostgreSQL 17 environment or another approved disposable environment. Never test restoration against production.

- Restore the supported roles, schema, and data exports into the isolated database using the matching PostgreSQL/Supabase tooling.
- Confirm that the restore finishes without errors.
- Compare restored table counts and important schema definitions with the pre-export inventory.
- Check functions, views, policies, indexes, and migration history.
- Separately test the documented Auth and Storage recovery procedures to the extent the platform supports them.
- Record any objects or settings that cannot be restored.

A successful PostgreSQL restore alone does not prove that a full Supabase project can be recovered.

## 7. Backup acceptance checklist

Before a production migration, record and verify all of the following:

- [ ] Export completed with exit code 0.
- [ ] Roles, schema, and data files exist and are non-empty.
- [ ] Files are stored privately, with an encrypted second copy outside the device.
- [ ] SHA-256 hashes are recorded and rechecked after copying.
- [ ] Schema includes the PULSE-owned tables, functions, policies, indexes, and views.
- [ ] The export's exclusions are understood; managed Auth and Storage data are not falsely marked as covered.
- [ ] All 23 currently inventoried Storage objects (or the updated count at backup time) are copied and verified by path, count, and hash.
- [ ] Auth recovery scope and limitations are documented and tested where supported.
- [ ] A restore rehearsal succeeds in an isolated PostgreSQL 17 environment.
- [ ] Restored table counts and key schema definitions are checked.
- [ ] Edge Functions and required project settings have a separately confirmed recreation path.
- [ ] Backup timestamp and restore-test result are recorded.

If a complete managed-project recovery path cannot be confirmed, keep the activation release on hold. If Supabase-managed Auth cannot be independently restored, explicitly record that limitation; do not claim a full disaster-recovery backup.

## 8. Migration release procedure

For the pending activation release:

1. Verify production migration history immediately before the change.
2. Confirm that the pre-change backup is accepted under Section 6.
3. Apply the three activation migrations in their exact order:
   - `20261028120000_activation_failure_atomicity.sql`
   - `20261028130000_activation_preflight.sql`
   - `20261028140000_activation_identity_binding.sql`
4. Verify the new preflight function, activation function definition, grants, and migration history using read-only queries.
5. Only after database verification, approve the application PR merge/deployment.
6. Run activation smoke tests using a dedicated test card/account, not a customer card.
7. If a migration fails, stop. Do not continue to the next migration or manually edit migration history.

## 9. Recovery principles

- Prefer a tested forward corrective migration for function or schema changes.
- Do not delete rows from Supabase migration history to pretend a migration did not run.
- Do not restore the production project or overwrite live data without explicit approval and a verified recovery plan.
- Do not delete Auth users as cleanup; unbound Auth identities may belong to legitimate signup flows.
- Keep database exports, connection strings, passwords, API keys, and service-role credentials out of Git, screenshots, chat, and public storage.
- Keep backup files outside the repository and use encrypted storage with access limited to authorized operators.

## 10. Current limitations

The manual CLI export, separate Storage copy, Auth recovery assessment, and restore rehearsal must be completed using authorized local tooling before the release gate can be cleared. A SQL Editor read-only inspection is not a backup. The runbook is documentation only and does not authorize applying migrations, merging pull requests, deploying, or changing the Supabase plan.

Official references:
- https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore
- https://supabase.com/docs/reference/cli/supabase-db-dump
