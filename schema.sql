CREATE TABLE IF NOT EXISTS receipts (
  id          SERIAL PRIMARY KEY,
  order_id    TEXT UNIQUE NOT NULL,
  store       TEXT NOT NULL,
  order_date  TIMESTAMPTZ NOT NULL,
  total       NUMERIC(10,2) NOT NULL,
  item_count  INTEGER NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS line_items (
  id          SERIAL PRIMARY KEY,
  receipt_id  INTEGER NOT NULL REFERENCES receipts(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  quantity    NUMERIC(10,3) NOT NULL,
  unit        TEXT NOT NULL,  -- 'lb' or 'ct'
  total_price NUMERIC(10,2) NOT NULL,
  unit_price  NUMERIC(10,4) GENERATED ALWAYS AS (total_price / NULLIF(quantity, 0)) STORED
);

CREATE TABLE IF NOT EXISTS sync_state (
  id               INTEGER PRIMARY KEY DEFAULT 1,
  refresh_token    TEXT,
  last_history_id  TEXT,
  last_synced_at   TIMESTAMPTZ
);

-- Seed sync_state row so we can UPDATE instead of INSERT
INSERT INTO sync_state (id) VALUES (1) ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS item_categories (
  id       SERIAL PRIMARY KEY,
  name     TEXT NOT NULL UNIQUE,
  keywords TEXT NOT NULL DEFAULT ''  -- comma-separated, case-insensitive substring matches
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_line_items_receipt_id ON line_items(receipt_id);
CREATE INDEX IF NOT EXISTS idx_line_items_name ON line_items(name);
CREATE INDEX IF NOT EXISTS idx_receipts_order_date ON receipts(order_date);
