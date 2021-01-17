create table if not exists wallpaper_cache (
    wp_id text primary key,
    wp_source text not null,
    wp_added integer not null,
    wp_url text not null,
    wp_used integer not null default 0,
    wp_saved integer not null default 0,
    wp_liked integer not null default 0,
    wp_blocked integer not null default 0
);
