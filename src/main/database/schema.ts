/**
 * Database schema, expressed as an ordered list of versioned migrations.
 *
 * Rules that protect the business data:
 *  - Migrations are immutable once released. Never edit an applied migration;
 *    add a new one with the next version number.
 *  - All money is INTEGER cents. All timestamps are TEXT (local ISO + offset).
 *  - sale_items stores SNAPSHOTS (name, prices, VAT rate) so historical
 *    reports never change when products are edited later.
 *  - Products are never hard-deleted (is_active flag) — the FK from
 *    sale_items enforces this at the database level too.
 */
export interface Migration {
  version: number;
  name: string;
  sql: string;
}

export const MIGRATIONS: readonly Migration[] = [
  {
    version: 1,
    name: 'initial_schema',
    sql: `
CREATE TABLE categories (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT    NOT NULL UNIQUE COLLATE NOCASE,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  is_active   INTEGER NOT NULL DEFAULT 1,
  created_at  TEXT    NOT NULL,
  updated_at  TEXT    NOT NULL
);

CREATE TABLE products (
  id                   INTEGER PRIMARY KEY AUTOINCREMENT,
  name                 TEXT    NOT NULL,
  category_id          INTEGER NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  cost_price_cents     INTEGER NOT NULL CHECK (cost_price_cents >= 0),
  selling_price_cents  INTEGER NOT NULL CHECK (selling_price_cents >= 0),
  barcode              TEXT,
  is_active            INTEGER NOT NULL DEFAULT 1,
  created_at           TEXT    NOT NULL,
  updated_at           TEXT    NOT NULL
);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_name     ON products(name COLLATE NOCASE);

CREATE TABLE business_days (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  business_date TEXT    NOT NULL UNIQUE,
  status        TEXT    NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  opened_at     TEXT    NOT NULL,
  closed_at     TEXT
);

CREATE TABLE sales (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  receipt_number   INTEGER NOT NULL UNIQUE,
  business_day_id  INTEGER NOT NULL REFERENCES business_days(id) ON DELETE RESTRICT,
  payment_type     TEXT    NOT NULL CHECK (payment_type IN ('cash', 'card', 'mixed')),
  status           TEXT    NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'voided')),
  subtotal_cents   INTEGER NOT NULL,
  vat_total_cents  INTEGER NOT NULL,
  total_cents      INTEGER NOT NULL,
  cost_total_cents INTEGER NOT NULL,
  created_at       TEXT    NOT NULL
);
CREATE INDEX idx_sales_business_day ON sales(business_day_id);
CREATE INDEX idx_sales_created_at   ON sales(created_at);

CREATE TABLE sale_items (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  sale_id           INTEGER NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  product_id        INTEGER NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  product_name      TEXT    NOT NULL,  -- snapshot at moment of sale
  quantity          INTEGER NOT NULL CHECK (quantity > 0),
  unit_price_cents  INTEGER NOT NULL,  -- snapshot
  cost_price_cents  INTEGER NOT NULL,  -- snapshot
  vat_rate_percent  REAL    NOT NULL,  -- snapshot
  vat_amount_cents  INTEGER NOT NULL,  -- snapshot, line VAT incl. quantity
  line_total_cents  INTEGER NOT NULL   -- snapshot, unit_price_cents × quantity
);
CREATE INDEX idx_sale_items_sale ON sale_items(sale_id);

CREATE TABLE voids (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  business_day_id  INTEGER NOT NULL REFERENCES business_days(id) ON DELETE RESTRICT,
  sale_id          INTEGER REFERENCES sales(id) ON DELETE RESTRICT,
  void_type        TEXT    NOT NULL CHECK (void_type IN ('item', 'sale')),
  details          TEXT    NOT NULL,  -- JSON snapshot of what was voided
  amount_cents     INTEGER NOT NULL,
  reason           TEXT    NOT NULL,
  created_at       TEXT    NOT NULL
);
CREATE INDEX idx_voids_business_day ON voids(business_day_id);

CREATE TABLE settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE audit_logs (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  action      TEXT    NOT NULL,
  entity_type TEXT    NOT NULL,
  entity_id   TEXT,
  details     TEXT    NOT NULL,  -- JSON (before/after, context)
  created_at  TEXT    NOT NULL
);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX idx_audit_logs_entity     ON audit_logs(entity_type, entity_id);
`
  },
  {
    version: 2,
    name: 'business_days_date_not_unique',
    sql: `
-- v1 made business_date UNIQUE, which wrongly prevents End of Day from
-- running twice in one calendar day (e.g. a midnight rollover followed by
-- a normal evening close). SQLite can't drop a column constraint, so the
-- table is rebuilt without it. Uniqueness is a service-level concern.
--
-- This follows the 12-step table-rebuild procedure from the SQLite docs:
-- foreign_keys is already OFF (the migration runner suspends enforcement
-- for the whole migration run and re-enables it afterwards), and step 8 is
-- covered by the runner's foreign_key_check after the loop.
PRAGMA legacy_alter_table = OFF;


CREATE TABLE business_days_new (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  business_date TEXT    NOT NULL,
  status        TEXT    NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  opened_at     TEXT    NOT NULL,
  closed_at     TEXT
);

-- Defensive: a day closed mid-crash by v1 could have a NULL date (the old
-- code wrote COALESCE(date,'') which yields NULL on an empty string).
UPDATE business_days SET business_date = '' WHERE business_date IS NULL;

INSERT INTO business_days_new (id, business_date, status, opened_at, closed_at)
  SELECT id, business_date, status, opened_at, closed_at FROM business_days;
DROP TABLE business_days;
ALTER TABLE business_days_new RENAME TO business_days;
`
  }


];
