-- ─────────────────────────────────────────────────────────────────────
-- 0007_storage_buckets_and_policies.sql
-- Supabase Storage buckets for non-evidence assets (logos, exports,
-- report attachments). EVIDENCE lives in raw S3 with Object Lock — see
-- infra/terraform/envs/prod/s3.tf. This file sets up only the
-- Supabase-managed buckets.
-- ─────────────────────────────────────────────────────────────────────

-- Tenant logos (multi-tenant branding)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'tenant-logos',
  'tenant-logos',
  true,
  2097152, -- 2 MiB
  array['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp']
)
on conflict (id) do nothing;

-- Generated report attachments (the PDF sits in S3; this bucket holds
-- supplementary files like attached screenshots or worksheets)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'report-attachments',
  'report-attachments',
  false,
  26214400, -- 25 MiB
  array[
    'application/pdf', 'image/png', 'image/jpeg', 'image/webp',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/csv', 'text/plain'
  ]
)
on conflict (id) do nothing;

-- Marketing assets (deck, one-pager, partner kit)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'marketing',
  'marketing',
  true,
  10485760, -- 10 MiB
  array['application/pdf', 'image/png', 'image/jpeg', 'image/svg+xml']
)
on conflict (id) do nothing;

-- Storage policies — path convention: '<bucket>/<tenant_id>/<filename>'
-- so RLS can key off the first path segment.

-- Helper to extract tenant_id from storage path
create or replace function public.storage_path_tenant(name text) returns uuid
language plpgsql immutable
as $$
declare
  first_part text;
begin
  first_part := split_part(name, '/', 1);
  if first_part ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return first_part::uuid;
  end if;
  return null;
end;
$$;

-- tenant-logos: public read, authenticated write per tenant
create policy "tenant_logos_read_public" on storage.objects
  for select using (bucket_id = 'tenant-logos');

create policy "tenant_logos_write_member" on storage.objects
  for insert with check (
    bucket_id = 'tenant-logos'
    and public.is_tenant_member(public.storage_path_tenant(name))
  );

-- report-attachments: read by tenant members, write by reviewers/agents
create policy "report_attachments_read_member" on storage.objects
  for select using (
    bucket_id = 'report-attachments'
    and public.is_tenant_member(public.storage_path_tenant(name))
  );

create policy "report_attachments_write_reviewer" on storage.objects
  for insert with check (
    bucket_id = 'report-attachments'
    and (
      public.has_role(array['owner', 'admin', 'reviewer', 'approver', 'agent']::user_role[])
      or exists (select 1 from public.users where id = auth.uid() and is_axiom_internal)
    )
  );

-- marketing: public read
create policy "marketing_read_public" on storage.objects
  for select using (bucket_id = 'marketing');

create policy "marketing_write_axiom" on storage.objects
  for all using (
    bucket_id = 'marketing'
    and exists (select 1 from public.users where id = auth.uid() and is_axiom_internal)
  );
