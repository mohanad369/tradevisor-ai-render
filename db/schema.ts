import { sqliteTable, integer, text, int } from "drizzle-orm/sqlite-core";

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
export const vipCodes = sqliteTable("vip_codes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  code: text("code").notNull().unique(),
  used: integer("used", { mode: "boolean" }).notNull().default(false),
  assignedTo: text("assigned_to"),
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
  // The VIP subscriber who is the partner (referrer)
  referrerCode: text("referrer_code").notNull(),
  referrerEmail: text("referrer_email").notNull(),
  // The invited person
  invitedEmail: text("invited_email").notNull(),
  invitedName: text("invited_name"),
  // Payment proof from invited
  txId: text("tx_id"),
  amount: text("amount").default("$88"),
  screenshot: text("screenshot"),
  // Status: PENDING → APPROVED → REWARDED
  status: text("status").notNull().default("PENDING"),
  submittedAt: integer("submitted_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
  approvedAt: integer("approved_at", { mode: "timestamp" }),
  // Reward: free month granted to referrer
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
