
-- Enable RLS (already enabled but good to verify)
alter table public.tasks enable row level security;

-- Drop existing "allow all" policy if it exists
drop policy if exists "Allow public access for prototype" on public.tasks;

-- Create new policies
-- 1. Users can view their own tasks
create policy "Users can view their own tasks"
on public.tasks for select
using (auth.uid() = user_id);

-- 2. Users can insert their own tasks
create policy "Users can insert their own tasks"
on public.tasks for insert
with check (auth.uid() = user_id);

-- 3. Users can update their own tasks
create policy "Users can update their own tasks"
on public.tasks for update
using (auth.uid() = user_id);

-- 4. Users can delete their own tasks
create policy "Users can delete their own tasks"
on public.tasks for delete
using (auth.uid() = user_id);
