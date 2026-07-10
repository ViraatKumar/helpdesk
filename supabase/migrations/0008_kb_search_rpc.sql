-- 0008_kb_search_rpc.sql
-- What: ranked full-text search over published KB articles.
-- Why an RPC rather than a plain PostgREST filter: supabase-js's query builder can filter with
-- `.textSearch()` but can't order by a computed expression like ts_rank() — this function does the
-- filter and the ranked ordering in one round trip, exactly as the spec specifies
-- (search_vector @@ websearch_to_tsquery(...), ranked by ts_rank).
-- SECURITY INVOKER (the default): runs as the calling role, so the existing
-- kb_articles_select_published_public RLS policy still applies — this function can't return
-- anything a direct anon SELECT couldn't already return.

create function search_kb_articles(target_workspace_id uuid, search_query text)
returns table (id uuid, title text, body_html text, rank real)
language sql
stable
as $$
  select id, title, body_html,
    ts_rank(search_vector, websearch_to_tsquery('english', search_query)) as rank
  from kb_articles
  where workspace_id = target_workspace_id
    and published = true
    and search_vector @@ websearch_to_tsquery('english', search_query)
  order by rank desc;
$$;
