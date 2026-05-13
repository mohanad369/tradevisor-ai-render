import { db } from "./db";
import { vipCodes } from "./schema";
import { sql } from "drizzle-orm";

export async function seedVIPCodes() {
  try {
    // Check if any codes exist
    const existing = db.select().from(vipCodes).all();
    if (existing.length > 0) return; // Already seeded

    console.log("[Seed] Generating 100 VIP access codes...");

    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    const codes: Array<{ code: string; used: boolean; assignedTo: string | null }> = [];

    for (let i = 0; i < 100; i++) {
      let code = "";
      for (let j = 0; j < 8; j++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      codes.push({ code, used: false, assignedTo: null });
    }

    await db.insert(vipCodes).values(codes);
    console.log("[Seed] 100 VIP codes created successfully.");
  } catch (err) {
    console.error("[Seed] Error:", err);
  }
}
