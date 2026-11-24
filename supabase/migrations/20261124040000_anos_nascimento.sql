begin;

alter table public.tournament_settings
  add column if not exists birth_years integer[]
    not null default array[2011, 2012, 2013, 2014];

alter table public.tournament_settings
  add constraint tournament_settings_birth_years_check
    check (
      cardinality(birth_years) between 1 and 12
      and birth_years <@ array[
        1900, 1901, 1902, 1903, 1904, 1905, 1906, 1907, 1908, 1909,
        1910, 1911, 1912, 1913, 1914, 1915, 1916, 1917, 1918, 1919,
        1920, 1921, 1922, 1923, 1924, 1925, 1926, 1927, 1928, 1929,
        1930, 1931, 1932, 1933, 1934, 1935, 1936, 1937, 1938, 1939,
        1940, 1941, 1942, 1943, 1944, 1945, 1946, 1947, 1948, 1949,
        1950, 1951, 1952, 1953, 1954, 1955, 1956, 1957, 1958, 1959,
        1960, 1961, 1962, 1963, 1964, 1965, 1966, 1967, 1968, 1969,
        1970, 1971, 1972, 1973, 1974, 1975, 1976, 1977, 1978, 1979,
        1980, 1981, 1982, 1983, 1984, 1985, 1986, 1987, 1988, 1989,
        1990, 1991, 1992, 1993, 1994, 1995, 1996, 1997, 1998, 1999,
        2000, 2001, 2002, 2003, 2004, 2005, 2006, 2007, 2008, 2009,
        2010, 2011, 2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019,
        2020, 2021, 2022, 2023, 2024, 2025, 2026, 2027, 2028, 2029,
        2030, 2031, 2032, 2033, 2034, 2035, 2036, 2037, 2038, 2039,
        2040, 2041, 2042, 2043, 2044, 2045, 2046, 2047, 2048, 2049,
        2050, 2051, 2052, 2053, 2054, 2055, 2056, 2057, 2058, 2059,
        2060, 2061, 2062, 2063, 2064, 2065, 2066, 2067, 2068, 2069,
        2070, 2071, 2072, 2073, 2074, 2075, 2076, 2077, 2078, 2079,
        2080, 2081, 2082, 2083, 2084, 2085, 2086, 2087, 2088, 2089,
        2090, 2091, 2092, 2093, 2094, 2095, 2096, 2097, 2098, 2099,
        2100
      ]
    );

create or replace function public.save_birth_years(p_birth_years integer[], p_revision integer)
returns public.tournament_settings
language plpgsql security definer set search_path = '' as $$
declare
  settings public.tournament_settings;
  clean_years integer[] := array(
    select distinct value from unnest(coalesce(p_birth_years, array[]::integer[])) value order by value
  );
begin
  if not public.is_master() then
    raise exception using message = 'Acesso restrito à organização.', errcode = '42501';
  end if;
  if cardinality(clean_years) not between 1 and 12
    or exists (select 1 from unnest(clean_years) value where value < 1900 or value > 2100) then
    raise exception 'Informe entre 1 e 12 anos válidos, entre 1900 e 2100.';
  end if;
  update public.tournament_settings
    set birth_years = clean_years, revision = revision + 1
    where id = 1 and revision = p_revision
    returning * into settings;
  if not found then
    raise exception 'As configurações mudaram. Recarregue o painel antes de salvar.';
  end if;
  return settings;
end;
$$;

create or replace function public.save_registration(
  p_team_name text, p_representative text, p_phone text,
  p_players jsonb, p_revision integer
)
returns public.registrations
language plpgsql security definer set search_path = ''
as $$
declare
  caller uuid := auth.uid();
  deadline timestamptz;
  allowed_years integer[];
  current_registration public.registrations;
  clean_team text := btrim(coalesce(p_team_name, ''));
  clean_name text := btrim(coalesce(p_representative, ''));
  clean_phone text := regexp_replace(coalesce(p_phone, ''), '[^0-9]', '', 'g');
  clean_players jsonb;
  player jsonb;
  oldest_count integer;
  distinct_count integer;
begin
  if caller is null then
    raise exception using message = 'Entre para salvar sua inscrição.', errcode = '42501';
  end if;
  select edit_deadline, birth_years into deadline, allowed_years
    from public.tournament_settings where id = 1 for share;
  if deadline is null or clock_timestamp() >= deadline then
    raise exception 'O prazo de inscrição e edição já encerrou.';
  end if;
  if char_length(clean_team) not between 2 and 80
    or char_length(clean_name) not between 3 and 90
    or clean_phone !~ '^[1-9][0-9]{9,10}$' then
    raise exception 'Confira o nome da equipe, o representante e o WhatsApp com DDD.';
  end if;
  if p_players is null or jsonb_typeof(p_players) <> 'array' then
    raise exception 'Informe o elenco.';
  end if;
  if jsonb_array_length(p_players) not between 5 and 15 then
    raise exception 'A equipe precisa ter de 5 a 15 atletas.';
  end if;
  for player in select value from jsonb_array_elements(p_players) loop
    if coalesce(jsonb_typeof(player->'name'), '') <> 'string'
      or char_length(btrim(player->>'name')) not between 3 and 90
      or coalesce(jsonb_typeof(player->'year'), '') <> 'number'
      or not exists (select 1 from unnest(allowed_years) value where value::text = player->>'year') then
      raise exception 'Informe o nome do atleta e um ano de nascimento válido para cada atleta.';
    end if;
  end loop;
  select
    jsonb_agg(jsonb_build_object(
      'name', regexp_replace(btrim(value->>'name'), '[[:space:]]+', ' ', 'g'),
      'year', (value->>'year')::integer
    ) order by ordinality),
    count(*) filter (where value->>'year' = '2011'),
    count(distinct (lower(regexp_replace(btrim(value->>'name'), '[[:space:]]+', ' ', 'g')), value->>'year'))
  into clean_players, oldest_count, distinct_count
  from jsonb_array_elements(p_players) with ordinality;
  if oldest_count > 2 then
    raise exception 'O elenco pode ter até dois atletas nascidos em 2011.';
  end if;
  if distinct_count <> jsonb_array_length(p_players) then
    raise exception 'Há atletas repetidos na relação.';
  end if;
  select * into current_registration from public.registrations where owner_id = caller for update;
  if clock_timestamp() >= deadline then
    raise exception 'O prazo de inscrição e edição já encerrou.';
  end if;
  if not found then
    if p_revision is distinct from 0 then
      raise exception 'A inscrição mudou. Atualize a página antes de salvar.';
    end if;
    insert into public.registrations (owner_id, team_name, representative_name, representative_phone, players)
    values (caller, clean_team, clean_name, clean_phone, clean_players)
    on conflict (owner_id) do nothing
    returning * into current_registration;
  else
    if current_registration.revision is distinct from p_revision then
      raise exception 'A inscrição mudou. Atualize a página antes de salvar.';
    end if;
    update public.registrations
    set team_name = clean_team, representative_name = clean_name, representative_phone = clean_phone,
        players = clean_players, revision = revision + 1, updated_at = clock_timestamp(),
        status = case
          when status = 'confirmed' and (players <> clean_players or team_name <> clean_team) then 'pending'
          else status
        end
    where owner_id = caller
    returning * into current_registration;
  end if;
  if current_registration.id is null then
    raise exception 'A inscrição mudou. Recarregue a página antes de salvar.';
  end if;
  return current_registration;
end;
$$;

revoke all on function public.save_birth_years(integer[], integer)
  from public, anon, authenticated;
revoke all on function public.save_registration(text, text, text, jsonb, integer)
  from public, anon, authenticated;
grant execute on function public.save_birth_years(integer[], integer) to authenticated;
grant execute on function public.save_registration(text, text, text, jsonb, integer) to authenticated;

notify pgrst, 'reload schema';
commit;
