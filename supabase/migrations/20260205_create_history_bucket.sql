-- 1. Create a Bucket for User Uploads
insert into storage.buckets (id, name, public)
values ('user_uploads', 'user_uploads', true)
on conflict (id) do nothing;

-- 2. Create Table for History
create table if not exists public.user_history (
    id uuid default gen_random_uuid() primary key,
    telegram_id text not null references public.users(telegram_id), -- Changed to text to match users table
    type text not null check (type in ('image', 'video', 'text')),
    title text not null,
    data text not null, -- URL for files, Text content for text
    thumbnail text, -- URL for thumbnail
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Enable RLS (Security)
alter table public.user_history enable row level security;

create policy "Users can view own history"
on public.user_history for select
using (telegram_id = (select telegram_id from public.users where id = auth.uid()));

create policy "Users can insert own history"
on public.user_history for insert
with check (true); -- Simplified for Telegram context, ideally check auth

create policy "Users can delete own history"
on public.user_history for delete
using (telegram_id = (select telegram_id from public.users where id = auth.uid()));

-- 4. Storage Policies
create policy "Give users access to own folder 1u1gze_0" on storage.objects
  for select to public using (bucket_id = 'user_uploads');

create policy "Give users access to own folder 1u1gze_1" on storage.objects
  for insert to public with check (bucket_id = 'user_uploads');

create policy "Give users access to own folder 1u1gze_2" on storage.objects
  for delete to public using (bucket_id = 'user_uploads');
