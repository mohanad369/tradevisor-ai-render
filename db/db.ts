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
//   Replaces missing migrations / db:push step.
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
    assigned_to TEXT
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

  -- Helpful indexes for the admin queries
  CREATE INDEX IF NOT EXISTS idx_vip_payments_status     ON vip_payments(status);
  CREATE INDEX IF NOT EXISTS idx_vip_payments_submitted  ON vip_payments(submitted_at);
  CREATE INDEX IF NOT EXISTS idx_vip_subs_email          ON vip_subscribers(email);
  CREATE INDEX IF NOT EXISTS idx_vip_subs_code           ON vip_subscribers(code);
  CREATE INDEX IF NOT EXISTS idx_vip_sessions_token      ON vip_sessions(session_token);
  CREATE INDEX IF NOT EXISTS idx_vip_sessions_sub        ON vip_sessions(subscriber_id);
  CREATE INDEX IF NOT EXISTS idx_vip_sessions_active     ON vip_sessions(active);
`);

console.log("[DB] Schema ready (all tables ensured).");

export const db = drizzle(client, { schema });
