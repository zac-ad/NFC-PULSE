-- Remove the redundant non-unique slug index.
-- profiles.slug already has the unique constraint/index profiles_slug_key.
drop index if exists public.idx_profiles_slug;
