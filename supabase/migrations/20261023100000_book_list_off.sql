-- The year book is in the backlog (owner, 20 October 2026): the family page no longer offers the
-- book list and the privacy page no longer mentions it, so we keep nothing about it either.
-- The column stays (unused) for when the book returns.
update public.circle_members set book_list_at = null where book_list_at is not null;
