ALTER TABLE notes ADD COLUMN embedding TEXT;

CREATE TABLE note_chunks (
  id TEXT PRIMARY KEY,
  note_id TEXT NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  embedding TEXT,
  chunk_index INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX idx_note_chunks_note_id ON note_chunks(note_id);