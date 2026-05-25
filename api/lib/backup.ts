import fs from "fs";
import path from "path";
import { sqliteClient, DATABASE_DIR } from "../../db/db";

/**
 * Database backup system.
 * ───────────────────────
 * The Render persistent disk protects the DB across deploys, but NOT
 * against disk corruption, accidental deletion, or a bad migration.
 * This module takes periodic point-in-time snapshots so the data can
 * always be recovered.
 *
 * It uses better-sqlite3's `.backup()` — SQLite's native ONLINE backup
 * API. It is safe to run while the app is live: it does not lock the
 * database or block reads/writes, and it produces a consistent copy.
 *
 * Backups are stored on the same persistent disk under /backups and
 * rotated so only the most recent N are kept (disk space is bounded).
 */

const BACKUP_DIR = path.join(DATABASE_DIR, "backups");
const MAX_BACKUPS = 10;                       // keep the 10 most recent
const BACKUP_INTERVAL_MS = 6 * 60 * 60 * 1000; // every 6 hours

let backupTimer: NodeJS.Timeout | null = null;

function ensureBackupDir(): void {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
}

/** Take a single snapshot now. Returns the file path, or null on failure. */
export async function runBackup(): Promise<string | null> {
  try {
    ensureBackupDir();
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const dest = path.join(BACKUP_DIR, `tradevisor-${stamp}.db`);

    // better-sqlite3's online backup — consistent, non-blocking.
    await sqliteClient.backup(dest);

    rotateOldBackups();
    console.log(`[Backup] Snapshot saved: ${path.basename(dest)}`);
    return dest;
  } catch (err) {
    console.error("[Backup] FAILED to create snapshot:", (err as Error)?.message);
    // A failing backup is a silent disaster-recovery risk — alert the owner.
    try {
      const { sendAlert } = await import("./alerting");
      await sendAlert("Database backup failed", String((err as Error)?.stack || err));
    } catch { /* alerting must never crash the backup path */ }
    return null;
  }
}

/** Delete the oldest backups beyond MAX_BACKUPS. */
function rotateOldBackups(): void {
  try {
    const files = fs.readdirSync(BACKUP_DIR)
      .filter((f) => f.startsWith("tradevisor-") && f.endsWith(".db"))
      .map((f) => ({ name: f, time: fs.statSync(path.join(BACKUP_DIR, f)).mtimeMs }))
      .sort((a, b) => b.time - a.time); // newest first

    for (const stale of files.slice(MAX_BACKUPS)) {
      fs.unlinkSync(path.join(BACKUP_DIR, stale.name));
      console.log(`[Backup] Rotated out old snapshot: ${stale.name}`);
    }
  } catch (err) {
    console.error("[Backup] rotation check failed:", (err as Error)?.message);
  }
}

/** List existing backups, newest first. */
export function listBackups(): Array<{ name: string; sizeKB: number; createdAt: string }> {
  try {
    ensureBackupDir();
    return fs.readdirSync(BACKUP_DIR)
      .filter((f) => f.startsWith("tradevisor-") && f.endsWith(".db"))
      .map((f) => {
        const st = fs.statSync(path.join(BACKUP_DIR, f));
        return {
          name: f,
          sizeKB: Math.round(st.size / 1024),
          createdAt: new Date(st.mtimeMs).toISOString(),
        };
      })
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  } catch {
    return [];
  }
}

/**
 * Start the periodic backup scheduler. Called once at server startup.
 * Takes one backup shortly after boot, then every BACKUP_INTERVAL_MS.
 */
export function startBackupScheduler(): void {
  if (backupTimer) return; // already running

  // First snapshot 60s after boot (lets the server settle first).
  setTimeout(() => { void runBackup(); }, 60_000);

  backupTimer = setInterval(() => { void runBackup(); }, BACKUP_INTERVAL_MS);
  console.log(`[Backup] Scheduler started — every ${BACKUP_INTERVAL_MS / 3_600_000}h, keeping ${MAX_BACKUPS} snapshots.`);
}
