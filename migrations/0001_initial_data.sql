-- Migration number: 0001 	 2025-07-06T10:11:10.121Z
CREATE TABLE IF NOT EXISTS calendar_events (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  location TEXT,
  organizer TEXT,
  attendees TEXT, -- JSON array of email addresses
  created_at TEXT NOT NULL,
  modified_at TEXT NOT NULL,
  event_type TEXT NOT NULL, -- e.g., 'storskrald', 'glas_metal'
  source_email TEXT -- Store original email for reference
);

CREATE INDEX IF NOT EXISTS idx_events_start_date ON calendar_events(start_date);
CREATE INDEX IF NOT EXISTS idx_events_type ON calendar_events(event_type);
CREATE INDEX IF NOT EXISTS idx_events_created ON calendar_events(created_at);