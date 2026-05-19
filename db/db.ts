import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import * as schema from "./schema";

// ─── Resolve DB path safely (absolute, with env override) ───
const DB_DIR = process.env.DB_DIR
  ? path.resolve(process.env.DB_DIR)
  : path.resolve(process.cwd(), "db");

if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });

const DB_PATH = path.join(DB_DIR, "tradevisor.db");
console.log("[DB] Using SQLite file at:", DB_PATH);

const client = new Database(DB_PATH);

// ─── Reliability pragmas ───
client.pragma("journal_mode = WAL");
client.pragma("foreign_keys = ON");

// ─── Auto-create all tables on startup (idempotent) ───
// Replaces missing migrations / db:push step.
//
// FIX #1: previously the `referrals` table was defined in schema.ts but missing
//         here, so every referrals query crashed with "no such table".
// FIX #2: `vip_codes` now has a `code_type` column to separate monthly/yearly
//         pools in the DB instead of admin browser localStorage.
client.exec(`
  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id TEXT NOT NULL UNIQUE,
    plan_name TEXT NOT NULL,
    amount TEXT NOT NULL,
    wallet_address TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at INTEGER
  );

  CREATE TABLE IF NOT EXISTS vip_payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id TEXT NOT NULL UNIQUE,
    plan_name TEXT NOT NULL,
    amount TEXT NOT NULL,
    email TEXT NOT NULL,
    tx_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING',
    screenshot TEXT DEFAULT '',
    submitted_at INTEGER,
    approved_at INTEGER,
    assigned_code TEXT
  );

  CREATE TABLE IF NOT EXISTS vip_subscribers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    subscriber_id TEXT NOT NULL UNIQUE,
    order_id TEXT NOT NULL,
    email TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE,
    plan TEXT NOT NULL,
    amount TEXT NOT NULL,
    tx_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'ACTIVE',
    start_date INTEGER,
    end_date INTEGER
  );

  CREATE TABLE IF NOT EXISTS vip_codes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT NOT NULL UNIQUE,
    used INTEGER NOT NULL DEFAULT 0,
    assigned_to TEXT,
    code_type TEXT NOT NULL DEFAULT 'yearly'
  );

  CREATE TABLE IF NOT EXISTS support_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    language TEXT DEFAULT 'en',
    created_at INTEGER
  );

  CREATE TABLE IF NOT EXISTS vip_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_token TEXT NOT NULL UNIQUE,
    subscriber_id TEXT NOT NULL,
    email TEXT NOT NULL,
    code TEXT NOT NULL,
    device_id TEXT NOT NULL,
    ip TEXT DEFAULT '',
    user_agent TEXT DEFAULT '',
    active INTEGER NOT NULL DEFAULT 1,
    created_at INTEGER,
    expires_at INTEGER,
    last_seen_at INTEGER
  );

  CREATE TABLE IF NOT EXISTS referrals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    referral_id TEXT NOT NULL UNIQUE,
    referrer_code TEXT NOT NULL,
    referrer_email TEXT NOT NULL,
    invited_email TEXT NOT NULL,
    invited_name TEXT,
    tx_id TEXT,
    amount TEXT DEFAULT '$88',
    screenshot TEXT,
    status TEXT NOT NULL DEFAULT 'PENDING',
    submitted_at INTEGER,
    approved_at INTEGER,
    reward_granted INTEGER NOT NULL DEFAULT 0,
    reward_date INTEGER
  );

  CREATE TABLE IF NOT EXISTS payment_invoices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id TEXT NOT NULL UNIQUE,
    provider TEXT NOT NULL,
    provider_invoice_id TEXT NOT NULL,
    invoice_url TEXT NOT NULL,
    email TEXT NOT NULL,
    plan_name TEXT NOT NULL,
    amount TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'WAITING',
    raw_payload TEXT DEFAULT '',
    created_at INTEGER,
    updated_at INTEGER
  );

  -- Helpful indexes for the admin queries
  CREATE INDEX IF NOT EXISTS idx_vip_payments_status     ON vip_payments(status);
  CREATE INDEX IF NOT EXISTS idx_vip_payments_submitted  ON vip_payments(submitted_at);
  CREATE INDEX IF NOT EXISTS idx_vip_subs_email          ON vip_subscribers(email);
  CREATE INDEX IF NOT EXISTS idx_vip_subs_code           ON vip_subscribers(code);
  CREATE INDEX IF NOT EXISTS idx_vip_codes_type          ON vip_codes(code_type);
  CREATE INDEX IF NOT EXISTS idx_vip_codes_used          ON vip_codes(used);
  CREATE INDEX IF NOT EXISTS idx_vip_sessions_token      ON vip_sessions(session_token);
  CREATE INDEX IF NOT EXISTS idx_vip_sessions_sub        ON vip_sessions(subscriber_id);
  CREATE INDEX IF NOT EXISTS idx_vip_sessions_active     ON vip_sessions(active);
  CREATE INDEX IF NOT EXISTS idx_referrals_status        ON referrals(status);
  CREATE INDEX IF NOT EXISTS idx_referrals_referrer      ON referrals(referrer_code);
  CREATE INDEX IF NOT EXISTS idx_payment_invoices_order  ON payment_invoices(order_id);
  CREATE INDEX IF NOT EXISTS idx_payment_invoices_status ON payment_invoices(status);
`);

// ─── Lightweight migration: add `code_type` to vip_codes if it's an old DB ───
// SQLite has no "ADD COLUMN IF NOT EXISTS", so we look at the schema ourselves.
try {
  const cols = client.prepare("PRAGMA table_info(vip_codes)").all() as Array<{ name: string }>;
  const hasType = cols.some((c) => c.name === "code_type");
  if (!hasType) {
    console.log("[DB] Migrating: adding vip_codes.code_type column");
    client.exec(`ALTER TABLE vip_codes ADD COLUMN code_type TEXT NOT NULL DEFAULT 'yearly'`);
    client.exec(`CREATE INDEX IF NOT EXISTS idx_vip_codes_type ON vip_codes(code_type)`);
  }
} catch (err) {
  console.error("[DB] Migration check failed:", err);
}

console.log("[DB] Schema ready (all tables ensured).");

export const db = drizzle(client, { schema });
