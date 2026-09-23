-- Make profile media private. Server routes use the service role
-- to upload and issue short-lived signed URLs after authorization.
drop policy if exists "Public profile media is readable" on storage.objects;

update storage.buckets
set public = false
where id = 'profile-media';
