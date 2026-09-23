-- Remove direct authenticated mutation privileges from hardware card inventory.
revoke insert, update, delete, truncate, references, trigger on table public.hardware_cards from authenticated;
grant select on table public.hardware_cards to authenticated;