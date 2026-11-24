begin;

alter table public.registrations add column logo text;
alter table public.tournament_settings add column contact_phone text
  check (contact_phone ~ '^[1-9][0-9]{9,10}$');

-- Imagens reprocessadas são pequenas e ficam na mesma transação da inscrição.
create function copinha_private.validate_logo(p_logo text)
returns void language plpgsql set search_path = '' as $$
declare
  image_bytes bytea;
begin
  if p_logo is null then return; end if;
  if octet_length(p_logo) > 699075
    or p_logo !~ '^data:image/(png|jpeg);base64,[A-Za-z0-9+/]+={0,2}$' then
    raise exception 'Envie uma imagem PNG ou JPEG válida de até 512 KB após processamento.';
  end if;
  begin
    image_bytes := decode(split_part(p_logo, ',', 2), 'base64');
  exception when invalid_parameter_value then
    raise exception 'Imagem inválida.';
  end;
  if octet_length(image_bytes) > 524288
    or not (
      (p_logo like 'data:image/png;%'
        and octet_length(image_bytes) >= 45
        and substring(image_bytes from 1 for 16) = decode('89504e470d0a1a0a0000000d49484452', 'hex')
        and right(encode(substring(image_bytes from greatest(length(image_bytes) - 11, 1)), 'hex'), 24)
          = '0000000049454e44ae426082')
      or
      (p_logo like 'data:image/jpeg;%'
        and octet_length(image_bytes) >= 20
        and substring(image_bytes from 1 for 3) = decode('ffd8ff', 'hex')
        and substring(image_bytes from (length(image_bytes) - 1)) = decode('ffd9', 'hex'))
    ) then
    raise exception 'Envie uma imagem PNG ou JPEG válida de até 512 KB após processamento.';
  end if;
end;
$$;

create function public.save_registration_with_logo(
  p_team_name text, p_representative text, p_phone text, p_players jsonb,
  p_revision integer, p_logo text
)
returns public.registrations
language plpgsql security definer set search_path = '' as $$
declare
  registration public.registrations;
begin
  perform copinha_private.validate_logo(p_logo);
  select * into registration from public.save_registration(
    p_team_name, p_representative, p_phone, p_players, p_revision
  );
  if registration.logo is distinct from p_logo then
    update public.registrations
    set logo = p_logo,
        status = case when status = 'confirmed' then 'pending' else status end
    where id = registration.id
    returning * into registration;
  end if;
  return registration;
end;
$$;

create function public.confirmed_teams()
returns table (team_name text, logo text)
language sql stable security definer set search_path = '' as $$
  select r.team_name, r.logo
  from public.registrations r
  where r.status = 'confirmed'
  order by r.team_name, r.id;
$$;

create table public.sponsors (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 80),
  logo text,
  asset_key text check (asset_key = 'adega-13-alta'),
  created_at timestamptz not null default clock_timestamp(),
  check ((logo is null) <> (asset_key is null))
);

insert into public.sponsors (name, asset_key) values ('Adega 13 Alta', 'adega-13-alta');

alter table public.sponsors enable row level security;
revoke all on public.sponsors from public, anon, authenticated;
grant select on public.sponsors to anon, authenticated;
create policy sponsors_read on public.sponsors for select to anon, authenticated using (true);

create function public.add_sponsor(p_name text, p_logo text)
returns public.sponsors
language plpgsql security definer set search_path = '' as $$
declare
  sponsor public.sponsors;
  clean_name text := btrim(coalesce(p_name, ''));
begin
  if not public.is_master() then
    raise exception using message = 'Acesso restrito à organização.', errcode = '42501';
  end if;
  if char_length(clean_name) not between 2 and 80 or p_logo is null then
    raise exception 'Informe o nome e envie a logo do patrocinador.';
  end if;
  perform copinha_private.validate_logo(p_logo);
  perform pg_advisory_xact_lock(130013, 1);
  if (select count(*) from public.sponsors) >= 20 then
    raise exception 'O rodapé comporta até 20 patrocinadores.';
  end if;
  insert into public.sponsors (name, logo) values (clean_name, p_logo)
  returning * into sponsor;
  return sponsor;
end;
$$;

create function public.remove_sponsor(p_id uuid)
returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_master() then
    raise exception using message = 'Acesso restrito à organização.', errcode = '42501';
  end if;
  delete from public.sponsors where id = p_id;
end;
$$;

create function public.save_organizer_contact(p_phone text, p_revision integer)
returns public.tournament_settings
language plpgsql security definer set search_path = '' as $$
declare
  settings public.tournament_settings;
  clean_phone text := nullif(regexp_replace(coalesce(p_phone, ''), '[^0-9]', '', 'g'), '');
begin
  if not public.is_master() then
    raise exception using message = 'Acesso restrito à organização.', errcode = '42501';
  end if;
  if clean_phone is not null and clean_phone !~ '^[1-9][0-9]{9,10}$' then
    raise exception 'Informe um WhatsApp válido com DDD.';
  end if;
  update public.tournament_settings
    set contact_phone = clean_phone, revision = revision + 1
    where id = 1 and revision = p_revision returning * into settings;
  if not found then
    raise exception 'As configurações mudaram. Recarregue o painel antes de salvar.';
  end if;
  return settings;
end;
$$;

revoke all on function copinha_private.validate_logo(text) from public, anon, authenticated;
revoke all on function public.save_registration_with_logo(text, text, text, jsonb, integer, text),
  public.confirmed_teams(), public.add_sponsor(text, text), public.remove_sponsor(uuid),
  public.save_organizer_contact(text, integer) from public, anon, authenticated;
grant execute on function public.confirmed_teams() to anon, authenticated;
grant execute on function public.save_registration_with_logo(text, text, text, jsonb, integer, text),
  public.add_sponsor(text, text), public.remove_sponsor(uuid), public.save_organizer_contact(text, integer)
  to authenticated;

notify pgrst, 'reload schema';
commit;
