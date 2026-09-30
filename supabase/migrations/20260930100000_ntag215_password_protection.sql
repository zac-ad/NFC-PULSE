-- PULSE: reversible NTAG21x physical-card protection
-- Stores each card's NFC password in Supabase Vault instead of plaintext.

alter table public.hardware_cards
  add column if not exists nfc_password_secret_id uuid,
  add column if not exists nfc_protection_status text not null default 'UNPROTECTED',
  add column if not exists nfc_password_issued_at timestamptz,
  add column if not exists nfc_protected_at timestamptz;

alter table public.hardware_cards
  drop constraint if exists hardware_cards_nfc_protection_status_check;

alter table public.hardware_cards
  add constraint hardware_cards_nfc_protection_status_check
  check (nfc_protection_status in ('UNPROTECTED', 'PASSWORD_ISSUED', 'PROTECTED'));

create or replace function public.store_nfc_password(
  p_card_id uuid,
  p_password text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_secret_id uuid;
  v_name text;
begin
  if p_card_id is null or p_password is null or length(p_password) = 0 then
    raise exception 'Card id and NFC password are required.';
  end if;

  if not exists (
    select 1
    from public.hardware_cards
    where id = p_card_id
      and status in ('UNCLAIMED', 'ACTIVE')
  ) then
    raise exception 'Card is not eligible for NFC password provisioning.';
  end if;

  select nfc_password_secret_id
    into v_secret_id
  from public.hardware_cards
  where id = p_card_id
  for update;

  v_name := 'pulse-nfc-password-' || p_card_id::text;

  if v_secret_id is null then
    v_secret_id := vault.create_secret(
      p_password,
      v_name,
      'PULSE NTAG21x physical-card password'
    );

    update public.hardware_cards
      set nfc_password_secret_id = v_secret_id,
          nfc_protection_status = 'PASSWORD_ISSUED',
          nfc_password_issued_at = timezone('utc', now()),
          nfc_protected_at = null
    where id = p_card_id;
  else
    perform vault.update_secret(
      v_secret_id,
      p_password,
      v_name,
      'PULSE NTAG21x physical-card password',
      null
    );

    update public.hardware_cards
      set nfc_protection_status = 'PASSWORD_ISSUED',
          nfc_password_issued_at = timezone('utc', now()),
          nfc_protected_at = null
    where id = p_card_id;
  end if;

  return v_secret_id;
end;
$$;

create or replace function public.get_nfc_password(p_card_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_secret_id uuid;
  v_password text;
begin
  if p_card_id is null then
    raise exception 'Card id is required.';
  end if;

  select nfc_password_secret_id
    into v_secret_id
  from public.hardware_cards
  where id = p_card_id;

  if v_secret_id is null then
    raise exception 'No NFC password has been issued for this card.';
  end if;

  select decrypted_secret
    into v_password
  from vault.decrypted_secrets
  where id = v_secret_id;

  if v_password is null then
    raise exception 'NFC password could not be retrieved.';
  end if;

  return v_password;
end;
$$;

revoke all on function public.store_nfc_password(uuid, text) from public, anon, authenticated;
revoke all on function public.get_nfc_password(uuid) from public, anon, authenticated;
grant execute on function public.store_nfc_password(uuid, text) to service_role;
grant execute on function public.get_nfc_password(uuid) to service_role;

comment on column public.hardware_cards.nfc_password_secret_id is
  'Supabase Vault secret id for the per-card NTAG21x password. Never store the password plaintext here.';

comment on column public.hardware_cards.nfc_protection_status is
  'Physical NTAG21x password lifecycle: UNPROTECTED, PASSWORD_ISSUED, or PROTECTED.';
