# VIP2 Gold Chart AI Integration

## Status: STORED IN ADDONS (NOT ACTIVE)

These files are stored in isolation. To activate, merge into the main app.

---

## Endpoint
```
POST /api/vip2/gold/chart-ai
```

## Request
```
multipart/form-data
  chart: image file
  timeframe: optional string
  notes: optional string
```

## Server Files
| File | Status |
|------|--------|
| `api/addons/vip2/lib/vip2GoldChartAi.ts` | Stored |
| `api/addons/vip2/router.ts` | Stored |
| `api/addons/vip2/boot-patch.ts` | Stored (how to patch boot.ts) |

## Frontend Files
| File | Status |
|------|--------|
| `src/addons/vip2/lib/vip2GoldChartApi.ts` | Stored |
| `src/addons/vip2/components/VIP2GoldChartAI.tsx` | Stored |
| `src/addons/vip2/dashboard-patch.ts` | Stored (how to patch VIPDashboard.tsx) |

## Required Env Variables
```env
OPENAI_API_KEY=your_server_key_here
VIP2_OPENAI_MODEL=gpt-4o-mini
```

## Required Dependencies
```json
"openai": "latest"
```

## How to Activate
1. Install `openai` package
2. Add env variables
3. Import and mount vip2 router in `api/router.ts`
4. Add VIP2GoldChartAI component to VIPDashboard tabs
5. Remove this folder from `.gitignore` if needed
