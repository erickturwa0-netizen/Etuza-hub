# Deploy note

Live site `etuza-hub-v2.vercel.app` was still serving an old build (no REFERRAL BONUS on /vpn, no AI playables).

**Action required in Vercel Dashboard:**
1. Open project linked to this repo
2. Deployments → latest commit on `main` → **Redeploy** (or Promote to Production)
3. If builds are **Error**, open logs and fix; production will stay old until a green build

Stamp: 2026-11-07T03:15-HKT
