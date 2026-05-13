# Free Deployment Notes

Recommended free host for this full-stack Node app: Render Web Service.

Free URL:

```text
https://tradevisor-ai.onrender.com
```

If Render says the name is taken, choose another service name and update:

```text
PUBLIC_SITE_ORIGIN=https://your-service-name.onrender.com
PUBLIC_SITE_ORIGIN_WWW=https://your-service-name.onrender.com
```

## Render Settings

Use the included `render.yaml` as a Blueprint, or create a Web Service manually:

```text
Runtime: Node
Plan: Free
Build command: npm ci && npm run build
Start command: npm run start
Health check path: /api/vip2/health
```

Environment variables:

```text
NODE_ENV=production
NODE_VERSION=20
DB_DIR=/tmp/tradevisor-db
PUBLIC_SITE_ORIGIN=https://tradevisor-ai.onrender.com
PUBLIC_SITE_ORIGIN_WWW=https://tradevisor-ai.onrender.com
VIP2_OPENAI_MODEL=gpt-4o-mini
OPENAI_API_KEY=<server-side key>
```

## Important Free-Tier Limits

Render Free gives a public `onrender.com` subdomain, but the service sleeps after inactivity.

The current app uses SQLite. On Render Free, local files are temporary, so payment/VIP data can be lost after restarts or redeploys. For a real launch, move VIP/payment storage to Postgres or use a paid persistent disk.
