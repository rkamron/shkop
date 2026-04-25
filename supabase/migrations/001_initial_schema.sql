-- =============================================================================
-- Shkop — Initial Schema Migration
-- Run this in the Supabase SQL editor (Dashboard > SQL Editor > New query).
-- Drop existing tables first with 000_drop_all.sql if re-running from scratch.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- Utility: auto-update updated_at on every row mutation
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- =============================================================================
-- TABLES
-- =============================================================================


-- -----------------------------------------------------------------------------
-- profiles
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS profiles (
  id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       text,
  username    text UNIQUE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT username_length CHECK (char_length(username) BETWEEN 3 AND 30),
  CONSTRAINT username_format CHECK (username ~ '^[a-zA-Z0-9_]+$')
);

CREATE OR REPLACE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- -----------------------------------------------------------------------------
-- preferences
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS preferences (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  favorite_colors  text[] NOT NULL DEFAULT '{}',
  disliked_colors  text[] NOT NULL DEFAULT '{}',
  preferred_styles text[] NOT NULL DEFAULT '{}',
  sizes            jsonb  NOT NULL DEFAULT '{}'::jsonb,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE TRIGGER trg_preferences_updated_at
  BEFORE UPDATE ON preferences
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- -----------------------------------------------------------------------------
-- clothing_items
-- Core table. Nullable columns are intentional — AI extraction may not always
-- determine every attribute.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clothing_items (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name             text,
  image_path       text NOT NULL,
  category         text,
  subcategory      text,
  color            text,
  secondary_colors text[],
  pattern          text,
  material         text,
  formality        text,
  fit              text,
  season_tags      text[],
  occasion_tags    text[],
  style_tags       text[],
  weather_tags     text[],
  brand            text,
  ai_raw_output    jsonb,
  is_favorite      boolean NOT NULL DEFAULT false,
  last_worn        date,
  notes            text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE TRIGGER trg_clothing_items_updated_at
  BEFORE UPDATE ON clothing_items
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- -----------------------------------------------------------------------------
-- outfits
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS outfits (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        text,
  occasion    text,
  notes       text,
  is_favorite boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE TRIGGER trg_outfits_updated_at
  BEFORE UPDATE ON outfits
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- -----------------------------------------------------------------------------
-- outfit_items
-- Join table. Access is derived from owning the referenced outfit.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS outfit_items (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  outfit_id        uuid NOT NULL REFERENCES outfits(id) ON DELETE CASCADE,
  clothing_item_id uuid NOT NULL REFERENCES clothing_items(id) ON DELETE CASCADE,
  created_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT outfit_items_unique UNIQUE (outfit_id, clothing_item_id)
);


-- -----------------------------------------------------------------------------
-- wear_history
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS wear_history (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  outfit_id  uuid REFERENCES outfits(id) ON DELETE SET NULL,
  worn_date  date NOT NULL,
  notes      text,
  created_at timestamptz NOT NULL DEFAULT now()
);


-- -----------------------------------------------------------------------------
-- feedback
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS feedback (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  outfit_id     uuid NOT NULL REFERENCES outfits(id) ON DELETE CASCADE,
  feedback_type text NOT NULL,
  feedback_note text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT feedback_type_values CHECK (
    feedback_type IN ('liked', 'disliked', 'too_formal', 'too_casual', 'too_hot', 'too_cold')
  )
);


-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE profiles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE preferences    ENABLE ROW LEVEL SECURITY;
ALTER TABLE clothing_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE outfits        ENABLE ROW LEVEL SECURITY;
ALTER TABLE outfit_items   ENABLE ROW LEVEL SECURITY;
ALTER TABLE wear_history   ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback       ENABLE ROW LEVEL SECURITY;


-- profiles ----------------------------------------------------------------
CREATE POLICY "profiles: own row select"
  ON profiles FOR SELECT USING (id = auth.uid());

CREATE POLICY "profiles: own row insert"
  ON profiles FOR INSERT WITH CHECK (id = auth.uid());

CREATE POLICY "profiles: own row update"
  ON profiles FOR UPDATE USING (id = auth.uid());

CREATE POLICY "profiles: own row delete"
  ON profiles FOR DELETE USING (id = auth.uid());


-- preferences -------------------------------------------------------------
CREATE POLICY "preferences: own row select"
  ON preferences FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "preferences: own row insert"
  ON preferences FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "preferences: own row update"
  ON preferences FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "preferences: own row delete"
  ON preferences FOR DELETE USING (user_id = auth.uid());


-- clothing_items ----------------------------------------------------------
CREATE POLICY "clothing_items: own rows select"
  ON clothing_items FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "clothing_items: own rows insert"
  ON clothing_items FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "clothing_items: own rows update"
  ON clothing_items FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "clothing_items: own rows delete"
  ON clothing_items FOR DELETE USING (user_id = auth.uid());


-- outfits -----------------------------------------------------------------
CREATE POLICY "outfits: own rows select"
  ON outfits FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "outfits: own rows insert"
  ON outfits FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "outfits: own rows update"
  ON outfits FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "outfits: own rows delete"
  ON outfits FOR DELETE USING (user_id = auth.uid());


-- outfit_items (access derived from owning the outfit) --------------------
CREATE POLICY "outfit_items: own rows select"
  ON outfit_items FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM outfits
      WHERE outfits.id = outfit_items.outfit_id
        AND outfits.user_id = auth.uid()
    )
  );

CREATE POLICY "outfit_items: own rows insert"
  ON outfit_items FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM outfits
      WHERE outfits.id = outfit_items.outfit_id
        AND outfits.user_id = auth.uid()
    )
  );

CREATE POLICY "outfit_items: own rows update"
  ON outfit_items FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM outfits
      WHERE outfits.id = outfit_items.outfit_id
        AND outfits.user_id = auth.uid()
    )
  );

CREATE POLICY "outfit_items: own rows delete"
  ON outfit_items FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM outfits
      WHERE outfits.id = outfit_items.outfit_id
        AND outfits.user_id = auth.uid()
    )
  );


-- wear_history ------------------------------------------------------------
CREATE POLICY "wear_history: own rows select"
  ON wear_history FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "wear_history: own rows insert"
  ON wear_history FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "wear_history: own rows update"
  ON wear_history FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "wear_history: own rows delete"
  ON wear_history FOR DELETE USING (user_id = auth.uid());


-- feedback ----------------------------------------------------------------
CREATE POLICY "feedback: own rows select"
  ON feedback FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "feedback: own rows insert"
  ON feedback FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "feedback: own rows update"
  ON feedback FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "feedback: own rows delete"
  ON feedback FOR DELETE USING (user_id = auth.uid());


-- =============================================================================
-- STORAGE
-- =============================================================================
-- Run these AFTER creating the 'clothing' bucket in the Supabase dashboard:
--   Storage > New bucket > Name: "clothing" > Public: OFF
--
-- Then copy the block below into a new SQL query and run it separately.
-- =============================================================================

/*

CREATE POLICY "clothing: own objects select"
  ON storage.objects FOR SELECT USING (
    bucket_id = 'clothing'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "clothing: own objects insert"
  ON storage.objects FOR INSERT WITH CHECK (
    bucket_id = 'clothing'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "clothing: own objects update"
  ON storage.objects FOR UPDATE USING (
    bucket_id = 'clothing'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "clothing: own objects delete"
  ON storage.objects FOR DELETE USING (
    bucket_id = 'clothing'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

*/
