CREATE TABLE public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nama text NOT NULL,
  tanggal_lahir date NOT NULL,
  username text NOT NULL UNIQUE,
  kode_id text NOT NULL UNIQUE,
  karakter_pilihan text NOT NULL DEFAULT 'raka',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.rooms (
  code text PRIMARY KEY,
  host_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'lobby',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_code text NOT NULL REFERENCES public.rooms(code) ON DELETE CASCADE,
  profile_id uuid NOT NULL,
  nama text NOT NULL,
  username text NOT NULL,
  karakter text NOT NULL,
  role text,
  status text NOT NULL DEFAULT 'alive',
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (room_code, profile_id)
);
CREATE TABLE public.game_state (
  room_code text PRIMARY KEY REFERENCES public.rooms(code) ON DELETE CASCADE,
  keys_found int NOT NULL DEFAULT 0,
  started_at timestamptz,
  winner text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rooms, public.players, public.game_state TO anon, authenticated;
GRANT ALL ON public.rooms, public.players, public.game_state TO service_role;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rooms open" ON public.rooms FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "players open" ON public.players FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "state open" ON public.game_state FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
ALTER PUBLICATION supabase_realtime ADD TABLE public.players;
ALTER PUBLICATION supabase_realtime ADD TABLE public.rooms;

CREATE OR REPLACE FUNCTION public.create_profile(p_nama text, p_tanggal date, p_karakter text)
RETURNS public.profiles LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r public.profiles; base text; i int := 0;
BEGIN
  IF length(trim(p_nama)) < 2 OR length(p_nama) > 30 THEN RAISE EXCEPTION 'Nama tidak valid'; END IF;
  IF p_karakter NOT IN ('raka','aisyah','zahra','nabila') THEN RAISE EXCEPTION 'Karakter tidak valid'; END IF;
  base := upper(regexp_replace(split_part(trim(p_nama),' ',1), '[^A-Za-z0-9]', '', 'g'));
  IF base = '' THEN base := 'PEMBURU'; END IF;
  base := left(base, 12);
  LOOP
    i := i + 1;
    BEGIN
      INSERT INTO public.profiles(nama, tanggal_lahir, username, kode_id, karakter_pilihan)
      VALUES (trim(p_nama), p_tanggal, base || '_' || lpad((floor(random()*10000))::int::text, 4, '0'),
              'HM-' || lpad((floor(random()*10000))::int::text, 4, '0'), p_karakter)
      RETURNING * INTO r;
      RETURN r;
    EXCEPTION WHEN unique_violation THEN
      IF i > 30 THEN RAISE; END IF;
    END;
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.login_id_card(p_kode text, p_nama text)
RETURNS SETOF public.profiles LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT * FROM public.profiles
  WHERE kode_id = upper(trim(p_kode))
    AND (p_nama IS NULL OR lower(trim(nama)) = lower(trim(p_nama)) OR lower(username) = lower(trim(p_nama)))
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.set_karakter(p_id uuid, p_kode text, p_karakter text)
RETURNS public.profiles LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r public.profiles;
BEGIN
  IF p_karakter NOT IN ('raka','aisyah','zahra','nabila') THEN RAISE EXCEPTION 'Karakter tidak valid'; END IF;
  UPDATE public.profiles SET karakter_pilihan = p_karakter WHERE id = p_id AND kode_id = p_kode RETURNING * INTO r;
  RETURN r;
END $$;

GRANT EXECUTE ON FUNCTION public.create_profile(text, date, text), public.login_id_card(text, text), public.set_karakter(uuid, text, text) TO anon, authenticated;