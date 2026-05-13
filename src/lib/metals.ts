/**
 * Metals API — Re-exports from goldapi.ts for backward compatibility
 * All API calls go through secure backend proxy
 */

export { getMetalPrice, getCachedPrice, getAllMetalPrices } from "./goldapi";
export type { MetalPrice } from "./goldapi";

import { getMetalPrice } from "./goldapi";

/** Get metals prices (backward compat shape) */
export async function getMetalsPrices(): Promise<{ USDXAU: number }> {
  const mp = await getMetalPrice("XAU");
  return { USDXAU: mp.price };
}

/** Get gold price (convenience) */
export async function getGoldPrice(): Promise<number> {
  const mp = await getMetalPrice("XAU");
  return mp.price;
}

/** Get silver price */
export async function getSilverPrice(): Promise<number> {
  const mp = await getMetalPrice("XAG");
  return mp.price;
}
