
-- Create the tasks table
create table public.tasks (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  detail text,
  due_date timestamptz,
  priority text,
  status text check (status in ('Todo', 'Done')) default 'Todo',
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  user_id uuid default auth.uid()
);

-- Priority check constraint
alter table public.tasks add constraint tasks_priority_check check (priority in ('High', 'Medium', 'Low'));


-- Enable Row Level Security (RLS)
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

