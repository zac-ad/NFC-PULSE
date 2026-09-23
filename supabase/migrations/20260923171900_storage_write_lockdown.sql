drop policy if exists "Public Storage Access" on storage.objects;
create policy "Public profile media is readable"
on storage.objects for select
to public
using (bucket_id = 'profile-media');

revoke insert, update, delete on table storage.objects from public;
revoke insert, update, delete on table storage.objects from anon;
revoke insert, update, delete on table storage.objects from authenticated;
grant select on table storage.objects to public;