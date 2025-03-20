CREATE TABLE IF NOT EXISTS notes (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  tags TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_notes_title ON notes(title);
CREATE INDEX IF NOT EXISTS idx_notes_created_at ON notes(created_at);
CREATE INDEX IF NOT EXISTS idx_notes_updated_at ON notes(updated_at);