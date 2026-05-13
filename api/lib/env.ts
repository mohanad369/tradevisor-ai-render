// Central env helper
import "dotenv/config";

const DATABASE_URL = process.env.DATABASE_URL ?? "mysql://root@127.0.0.1:3306/tradevisor";
const IS_PRODUCTION = process.env.NODE_ENV === "production";
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const WORQHAT_API_KEY = process.env.WORQHAT_API_KEY;   // keep variable, ignore contents
const PUBLIC_SITE_ORIGIN = process.env.PUBLIC_SITE_ORIGIN ?? "https://tradevisorai.com";
const PUBLIC_SITE_ORIGIN_WWW = process.env.PUBLIC_SITE_ORIGIN_WWW ?? "https://www.tradevisorai.com";

export const env = {
  DATABASE_URL,
  IS_PRODUCTION,
  ANTHROPIC_API_KEY,
  WORQHAT_API_KEY,
  PUBLIC_SITE_ORIGIN,
  PUBLIC_SITE_ORIGIN_WWW,
};
