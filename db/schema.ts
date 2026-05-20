import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";

// ─── Orders (existing) ───
export const orders = sqliteTable("orders", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  orderId: text("order_id").notNull().unique(),
  planName: text("plan_name").notNull(),
  amount: text("amount").notNull(),
  walletAddress: text("wallet_address").notNull(),
  status: text("status").notNull().default("pending"),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

// ─── VIP Payments ───
export const vipPayments = sqliteTable("vip_payments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  orderId: text("order_id").notNull().unique(),
  planName: text("plan_name").notNull(),
  amount: text("amount").notNull(),
  email: text("email").notNull(),
  txId: text("tx_id").notNull(),
  status: text("status").notNull().default("PENDING"),
  screenshot: text("screenshot").default(""),
  submittedAt: integer("submitted_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
  approvedAt: integer("approved_at", { mode: "timestamp" }),
  assignedCode: text("assigned_code"),
});

// ─── VIP Subscribers ───
export const vipSubscribers = sqliteTable("vip_subscribers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  subscriberId: text("subscriber_id").notNull().unique(),
  orderId: text("order_id").notNull(),
  email: text("email").notNull(),
  code: text("code").notNull().unique(),
  plan: text("plan").notNull(),
  amount: text("amount").notNull(),
  txId: text("tx_id").notNull(),
  status: text("status").notNull().default("ACTIVE"),
  startDate: integer("start_date", { mode: "timestamp" }).$defaultFn(() => new Date()),
  endDate: integer("end_date", { mode: "timestamp" }),
});

// ─── VIP Access Codes ───
// FIX: added `codeType` column so monthly and yearly pools live in the DB
// instead of being split between DB (any-pool) and admin browser localStorage.
// Existing rows get the default "yearly" via the migration in db.ts.
export const vipCodes = sqliteTable("vip_codes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  code: text("code").notNull().unique(),
  used: integer("used", { mode: "boolean" }).notNull().default(false),
  assignedTo: text("assigned_to"),
  // "monthly" or "yearly" — picked when approving a payment.
  codeType: text("code_type").notNull().default("yearly"),
});

// ─── VIP Sessions (prevents multi-device login) ───
export const vipSessions = sqliteTable("vip_sessions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  sessionToken: text("session_token").notNull().unique(),
  subscriberId: text("subscriber_id").notNull(),
  email: text("email").notNull(),
  code: text("code").notNull(),
  deviceId: text("device_id").notNull(),
  ip: text("ip").default(""),
  userAgent: text("user_agent").default(""),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
  expiresAt: integer("expires_at", { mode: "timestamp" }),
  lastSeenAt: integer("last_seen_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

// ─── Referrals (Partner Program) ───
export const referrals = sqliteTable("referrals", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  referralId: text("referral_id").notNull().unique(),
  referrerCode: text("referrer_code").notNull(),
  referrerEmail: text("referrer_email").notNull(),
  invitedEmail: text("invited_email").notNull(),
  invitedName: text("invited_name"),
  txId: text("tx_id"),
  amount: text("amount").default("$88"),
  screenshot: text("screenshot"),
  status: text("status").notNull().default("PENDING"),
  submittedAt: integer("submitted_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
  approvedAt: integer("approved_at", { mode: "timestamp" }),
  rewardGranted: integer("reward_granted", { mode: "boolean" }).notNull().default(false),
  rewardDate: integer("reward_date", { mode: "timestamp" }),
});

// ─── Support Messages (existing) ───
export const supportMessages = sqliteTable("support_messages", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  language: text("language").default("en"),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

export const paymentInvoices = sqliteTable("payment_invoices", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  orderId: text("order_id").notNull().unique(),
  provider: text("provider").notNull(),
  providerInvoiceId: text("provider_invoice_id").notNull(),
  invoiceUrl: text("invoice_url").notNull(),
  email: text("email").notNull(),
  planName: text("plan_name").notNull(),
  amount: text("amount").notNull(),
  status: text("status").notNull().default("WAITING"),
  rawPayload: text("raw_payload").default(""),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: text("user_id").notNull().unique(),
  email: text("email").notNull().unique(),
  name: text("name").default(""),
  phone: text("phone").default(""),
  passwordHash: text("password_hash").notNull(),
  status: text("status").notNull().default("ACTIVE"),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
  lastLoginAt: integer("last_login_at", { mode: "timestamp" }),
});

export const userSessions = sqliteTable("user_sessions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  sessionToken: text("session_token").notNull().unique(),
  userId: text("user_id").notNull(),
  ip: text("ip").default(""),
  userAgent: text("user_agent").default(""),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
  expiresAt: integer("expires_at", { mode: "timestamp" }),
});

export const visitStats = sqliteTable("visit_stats", {
  day: text("day").primaryKey(),
  count: integer("count").notNull().default(0),
  updatedAt: integer("updated_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

// ─── Free Trial Usage ───
// Tracks how many free chart analyses each visitor has consumed, so the
// 4-free limit cannot be bypassed by clearing localStorage or opening a
// new browser. Keyed by a stable identifier: the logged-in userId when
// available, otherwise a hash of the visitor's IP.
export const freeUsage = sqliteTable("free_usage", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  // "user:<userId>" or "ip:<sha256 of ip>" — never the raw IP.
  identityKey: text("identity_key").notNull().unique(),
  kind: text("kind").notNull().default("ip"),       // "user" | "ip"
  used: integer("used").notNull().default(0),       // analyses consumed
  firstSeenAt: integer("first_seen_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
  lastUsedAt: integer("last_used_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

// ─── Trader Dashboard: Trading Account ───
// One row per user — their capital state and growth-plan settings.
export const traderAccounts = sqliteTable("trader_accounts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: text("user_id").notNull().unique(),
  startingCapital: text("starting_capital").notNull().default("0"),
  currentBalance: text("current_balance").notNull().default("0"),
  // Risk per trade as a percentage of balance (e.g. "1" or "2").
  riskPercent: text("risk_percent").notNull().default("1"),
  // Reward-to-risk ratio numerator (risk is always 1). Default 2 → 1:2.
  rewardRatio: text("reward_ratio").notNull().default("2"),
  currency: text("currency").notNull().default("USD"),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

// ─── Trader Dashboard: Trade Journal ───
// One row per trade the user logs (win / loss / breakeven).
export const traderTrades = sqliteTable("trader_trades", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  tradeId: text("trade_id").notNull().unique(),
  userId: text("user_id").notNull(),
  asset: text("asset").default(""),
  direction: text("direction").default(""),          // "BUY" | "SELL"
  outcome: text("outcome").notNull().default("WIN"), // "WIN" | "LOSS" | "BE"
  // Signed P/L amount in account currency (+ for win, - for loss).
  amount: text("amount").notNull().default("0"),
  lotSize: text("lot_size").default(""),
  riskPercent: text("risk_percent").default(""),
  // Optional link back to the analysis that produced this trade.
  strategy: text("strategy").default(""),
  notes: text("notes").default(""),
  // Lesson extracted by the agents from a losing/failed trade.
  lessonLearned: text("lesson_learned").default(""),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

// ─── Agent Memory ───
// Aggregated performance memory the AI agents read before a new analysis,
// so their advice reflects this user's real history (not a fixed number).
// Keyed per (userId, asset+strategy bucket).
export const agentMemory = sqliteTable("agent_memory", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  memoryKey: text("memory_key").notNull().unique(),   // "<userId>:<asset>:<strategy>"
  userId: text("user_id").notNull(),
  asset: text("asset").default(""),
  strategy: text("strategy").default(""),
  wins: integer("wins").notNull().default(0),
  losses: integer("losses").notNull().default(0),
  breakeven: integer("breakeven").notNull().default(0),
  // Short rolling text of recent lessons, newest first (capped).
  lessons: text("lessons").default(""),
  updatedAt: integer("updated_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

// ─── Daily Analysis Quota (subscribers) ───
// Per-user, per-day counter for the subscriber analysis limit
// (monthly 10/day, yearly 20/day, $25 trial 3/day).
export const dailyAnalysisUsage = sqliteTable("daily_analysis_usage", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  usageKey: text("usage_key").notNull().unique(),     // "<userId>:<YYYY-MM-DD>"
  userId: text("user_id").notNull(),
  day: text("day").notNull(),
  used: integer("used").notNull().default(0),
  updatedAt: integer("updated_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

// ─── Pending Signups (email OTP verification) ───
// Holds an unverified signup until the user enters the emailed OTP code.
// On success the row is consumed and a real `users` row is created.
export const pendingSignups = sqliteTable("pending_signups", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  email: text("email").notNull().unique(),
  name: text("name").default(""),
  phone: text("phone").notNull().default(""),
  passwordHash: text("password_hash").notNull(),
  // OTP is stored hashed, never in plain text.
  otpHash: text("otp_hash").notNull(),
  attempts: integer("attempts").notNull().default(0),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});
