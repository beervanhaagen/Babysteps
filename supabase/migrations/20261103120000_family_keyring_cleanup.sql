-- After the keyring's family-api is live: the single-session versions are no longer called.
drop function public.family_claim(text, text, text, text, text);
drop function public.family_member(text);
