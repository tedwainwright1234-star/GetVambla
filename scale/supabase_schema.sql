-- vambla places schema, built for 10,000+ rows with fast "near me" queries.
-- Run this in the Supabase SQL Editor for your project.
-- Matches the columns in your enriched CSV (places_vambla_enriched.csv):
-- Name, Category, County, Country, Latitude, Longitude, Why Interesting,
-- Cost, Good For, Experience Collections, Heritage Collections,
-- Editorial Review.

create extension if not exists postgis;

create table places (
  id bigint generated always as identity primary key,
  name text not null,
  category text,
  county text,
  country text,
  lat double precision not null,
  lng double precision not null,
  why_interesting text,
  cost text,                     -- 'Free' / '£' / '££' / '£££'
  good_for text,                 -- comma-separated, e.g. 'Families, Photographers'
  experience_collections text,   -- comma-separated, e.g. 'Hidden Gem, Great Views'
  heritage_collections text,     -- comma-separated, e.g. 'National Trust, UNESCO'
  editorial_review text default 'Keep',  -- 'Keep' / 'Review' / 'Remove'
  image_url text,                -- real photo URL, sourced from Wikipedia
  official_website text,         -- sourced from Wikidata's structured data
  location geography(Point, 4326) generated always as (
    ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography
  ) stored
);

-- If your places table already exists from before, you don't need to
-- recreate it - just run this to add the two new columns:
--
--   alter table places add column if not exists image_url text;
--   alter table places add column if not exists official_website text;

create index places_location_idx on places using gist (location);
create index places_category_idx on places (category);

-- RPC: places within radius_km of (lat,lng) - powers "Explore Near Me" and
-- the radius selector (5/10/20/30/50/100 miles -> convert to km when calling)
-- category_filter can be a single category ("Castle") or a comma-separated
-- list ("Castle,Ruin,Historic Pub") to support multi-category search -
-- string_to_array on a single value still produces a one-item array, so
-- this is fully backward compatible with existing single-category calls.
create or replace function nearby_places(
  center_lat double precision,
  center_lng double precision,
  radius_km double precision default 30,
  category_filter text default null,
  limit_count int default 3000
)
returns setof places
language sql
stable
as $$
  select *
  from places
  where
    ST_DWithin(
      location,
      ST_SetSRID(ST_MakePoint(center_lng, center_lat), 4326)::geography,
      radius_km * 1000
    )
    and (category_filter is null or category = ANY(string_to_array(category_filter, ',')))
    and (editorial_review is null or editorial_review != 'Remove')
  order by location <-> ST_SetSRID(ST_MakePoint(center_lng, center_lat), 4326)::geography
  limit limit_count;
$$;

-- RPC: what's in the visible map area (used when panning/zooming rather
-- than a fixed radius). category_filter supports the same comma-separated
-- multi-category list as nearby_places above.
create or replace function places_in_bounds(
  min_lat double precision,
  min_lng double precision,
  max_lat double precision,
  max_lng double precision,
  category_filter text default null,
  limit_count int default 3000
)
returns setof places
language sql
stable
as $$
  select *
  from places
  where
    lat between min_lat and max_lat
    and lng between min_lng and max_lng
    and (category_filter is null or category = ANY(string_to_array(category_filter, ',')))
    and (editorial_review is null or editorial_review != 'Remove')
  limit limit_count;
$$;

-- Public read-only access - you manage edits via the Supabase dashboard,
-- not through the public-facing app.
alter table places enable row level security;
create policy "public read access" on places
  for select using (true);

-- RPC: random places, optionally filtered by category or a collection tag
-- (checked against experience_collections/heritage_collections). Powers
-- "Surprise Me" and the Discover homepage's rotating sections.
create or replace function random_places(
  category_filter text default null,
  collection_filter text default null,
  limit_count int default 1,
  require_image boolean default false
)
returns setof places
language sql
stable
as $$
  select *
  from places
  where
    (editorial_review is null or editorial_review != 'Remove')
    and (category_filter is null or category = category_filter)
    and (
      collection_filter is null
      or experience_collections ilike '%' || collection_filter || '%'
      or heritage_collections ilike '%' || collection_filter || '%'
    )
    and (not require_image or (image_url is not null and image_url != ''))
  order by random()
  limit limit_count;
$$;


