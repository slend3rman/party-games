-- ============================================================
-- Party Games - Question Bank
-- Run this in the Supabase SQL Editor to create/reset the question bank.
-- Re-run anytime to drop and recreate with fresh questions.
-- Emojis work natively in PostgreSQL TEXT columns (UTF-8).
-- ============================================================

DROP TABLE IF EXISTS questions CASCADE;

CREATE TABLE questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on questions" ON questions FOR ALL USING (true) WITH CHECK (true);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE questions;

-- ============================================================
-- SAMPLE QUESTIONS
-- Edit, add, or remove as you like. Then re-run the whole script.
-- ============================================================

INSERT INTO questions (question, answer, category) VALUES
  -- Emoji questions
  ('What city is this? 🐤 A ➡️', 'chicago', 'emoji'),
  ('Guess the celebrity 🐝🔛🌊', 'beyonce', 'emoji'),
  ('What city is this? 💥🍆', 'bangkok', 'emoji'),
  ('What movie is this? 🥊♣️', 'fight club', 'emoji'),
  ('What brand is this? Hint: its food 🧍‍♂️🧍‍♂️🧍‍♂️🧍‍♂️🧍‍♂️', 'five guys', 'emoji'),
  ('What animal is this? 🌕🔑', 'monkey', 'emoji'),
  ('What city is this? 🍐is', 'paris', 'emoji'),
  ('What city is this? Hint: second emoji is a boat, you can ride it in a __ 🧂🚤🌆', 'Salt Lake City', 'emoji'),
  ('What series is this? ☂️🎓', 'Umbrella Academy', 'emoji'),
  ('What series is this? 🏰', 'castle', 'emoji'),

  -- General knowledge
  ('In food, which vegetable is the principal ingredient in the Irish pancake dish boxti?', 'potato', 'general'),
  ('What is the chemical symbol for gold?', 'au', 'science'),
  ('In what year did the Titanic sink?', '1912', 'history'),
  ('What color do you get when you mix red and blue?', 'purple', 'general');
