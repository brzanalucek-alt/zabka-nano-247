-- ŻABKA NANO 24/7: konfiguracja i migracja istniejących produktów.
-- Skrypt NIE usuwa tabel products/reviews/store_settings ani ich danych.

create table if not exists public.zabka_store (
  id integer primary key check (id = 1),
  payload jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.zabka_store enable row level security;

-- Przenosi produkty z istniejącej tabeli public.products do formatu używanego
-- przez stronę. UUID pozostaje identyfikatorem produktu; niczego nie kasujemy.
do $$
declare
  v_products jsonb := '[]'::jsonb;
  v_reviews jsonb := '[]'::jsonb;
  v_rules jsonb := jsonb_build_array(
    'Przed złożeniem zamówienia sprawdź produkty i ilości w koszyku.',
    'Rabat nalicza się od 5 sztuk: 20%; od 10 sztuk: 30%.',
    'Ceny i dostępność produktów powinny być aktualizowane przez administratora.',
    'Dane dostawy należy wykorzystywać wyłącznie do realizacji zamówienia.',
    'Reklamacje i pytania kieruj do obsługi sklepu.',
    'Zwroty i reklamacje są rozpatrywane zgodnie z obowiązującymi przepisami.'
  );
  v_payload jsonb;
begin
  if to_regclass('public.products') is not null then
    execute $q$
      select coalesce(jsonb_agg(
        jsonb_build_object(
          'id', p.id::text,
          'name', p.name,
          'price', p.price,
          'description', coalesce(p.description, ''),
          'image', coalesce(p.image_url, '')
        ) order by p.sort_order, p.name
      ), '[]'::jsonb)
      from public.products p
      where coalesce(p.is_active, true) = true
    $q$ into v_products;
  end if;

  if to_regclass('public.reviews') is not null then
    execute $q$
      select coalesce(jsonb_agg(
        jsonb_build_object(
          'nick', coalesce(r.customer_name, 'Klient'),
          'stars', coalesce(r.rating, 5),
          'text', coalesce(r.content, '')
        ) order by r.created_at desc
      ), '[]'::jsonb)
      from public.reviews r
      where coalesce(r.is_approved, false) = true
    $q$ into v_reviews;
  end if;

  v_payload := jsonb_build_object(
    'products', v_products,
    'reviews', v_reviews,
    'rules', v_rules
  );

  -- Nie nadpisuj istniejącego rekordu sklepu przy ponownym uruchomieniu.
  insert into public.zabka_store (id, payload)
  values (1, v_payload)
  on conflict (id) do nothing;
end $$;

-- Publiczny odczyt zdjęć; upload wykonuje Worker przy użyciu sekretu service_role.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = true, file_size_limit = 5242880,
  allowed_mime_types = excluded.allowed_mime_types;
