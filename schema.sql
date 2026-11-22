-- PallBridge 360 — esquema inicial Supabase
-- Executar no SQL Editor de um projeto Supabase NOVO.
-- Rever com especialista de segurança/privacidade antes de usar dados reais de saúde.

create type public.app_role as enum ('patient', 'caregiver', 'professional', 'admin');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  role public.app_role not null default 'patient',
  created_at timestamptz not null default now()
);

create table public.check_ins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('patient','caregiver')),
  answers jsonb not null,
  created_at timestamptz not null default now()
);

create table public.professional_notes (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  note text not null,
  created_at timestamptz not null default now()
);

-- O papel inicial é sempre patient. Não confiar em requested_role enviado pelo browser.
-- Um administrador deve validar e alterar roles de cuidador/profissional manualmente.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name',''), 'patient');
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.check_ins enable row level security;
alter table public.professional_notes enable row level security;

-- Cada utilizador só pode consultar e alterar o seu próprio perfil.
create policy "profile read own" on public.profiles for select to authenticated
using (id = (select auth.uid()));
create policy "profile update own name" on public.profiles for update to authenticated
using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- Registos pessoais: apenas o respetivo utilizador os pode inserir e consultar.
create policy "checkins read own" on public.check_ins for select to authenticated
using (user_id = (select auth.uid()));
create policy "checkins insert own" on public.check_ins for insert to authenticated
with check (user_id = (select auth.uid()));

-- Notas profissionais privadas ao autor nesta primeira versão.
create policy "notes read own" on public.professional_notes for select to authenticated
using (author_id = (select auth.uid()));
create policy "notes insert own" on public.professional_notes for insert to authenticated
with check (author_id = (select auth.uid()));

grant usage on schema public to authenticated;
grant select, update on public.profiles to authenticated;
grant select, insert on public.check_ins to authenticated;
grant select, insert on public.professional_notes to authenticated;

-- IMPORTANTE:
-- 1) Nunca colocar a service_role key no frontend.
-- 2) Este esquema não implementa partilha de processos entre doente/cuidador/equipa.
-- 3) Não ativar acesso de profissionais alterando apenas a interface.
-- 4) Antes de dados reais: consentimento, ligação explícita entre participantes,
--    autorização granular, auditoria, retenção/apagamento e avaliação RGPD.
