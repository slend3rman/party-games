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
  ('What animal is this? 🐘', 'elephant', 'emoji'),
  ('What fruit is this? 🍎', 'apple', 'emoji'),
  ('What sport is this? ⚽', 'football', 'emoji'),
  ('What instrument is this? 🎸', 'guitar', 'emoji'),
  ('What weather is this? 🌧️', 'rain', 'emoji'),
  ('What food is this? 🍕', 'pizza', 'emoji'),
  ('What animal is this? 🦁', 'lion', 'emoji'),
  ('What is this? 🌋', 'volcano', 'emoji'),
  ('What vehicle is this? 🚁', 'helicopter', 'emoji'),
  ('What is this? 🏰', 'castle', 'emoji'),

  -- General knowledge
  ('What is the largest planet in our solar system?', 'jupiter', 'science'),
  ('What is the chemical symbol for gold?', 'au', 'science'),
  ('How many sides does a hexagon have?', '6', 'math'),
  ('What is the capital of Japan?', 'tokyo', 'geography'),
  ('What is the hardest natural substance on Earth?', 'diamond', 'science'),
  ('In what year did the Titanic sink?', '1912', 'history'),
  ('What is the smallest prime number?', '2', 'math'),
  ('What color do you get when you mix red and blue?', 'purple', 'general'),
  ('How many continents are there?', '7', 'geography'),
  ('What gas do plants absorb from the atmosphere?', 'carbon dioxide', 'science');
