CREATE TABLE IF NOT EXISTS categories (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  type       TEXT    NOT NULL CHECK(type IN ('income','expense')),
  name       TEXT    NOT NULL,
  icon       TEXT    NOT NULL DEFAULT '•',
  color      TEXT    NOT NULL DEFAULT '#f5f5f5',
  sort_order INTEGER DEFAULT 0,
  is_default INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS payment_methods (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT    NOT NULL UNIQUE,
  sort_order INTEGER DEFAULT 0,
  is_default INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS transactions (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  date              TEXT    NOT NULL,
  type              TEXT    NOT NULL CHECK(type IN ('income','expense')),
  name              TEXT    NOT NULL,
  category_id       INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  payment_method_id INTEGER REFERENCES payment_methods(id) ON DELETE SET NULL,
  amount            INTEGER NOT NULL CHECK(amount > 0),
  memo              TEXT    DEFAULT '',
  created_at        TEXT    DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS budgets (
  id     INTEGER PRIMARY KEY AUTOINCREMENT,
  year   INTEGER NOT NULL,
  month  INTEGER NOT NULL CHECK(month BETWEEN 1 AND 12),
  amount INTEGER NOT NULL CHECK(amount >= 0),
  UNIQUE(year, month)
);

CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_transactions_date     ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_type     ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category_id);
