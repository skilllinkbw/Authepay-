# backend/ — design reference only

The Python files in this directory (`api_gateway/main.py`,
`auth/main.py`) are **design documents**, not runnable services. They
capture an earlier FastAPI-based architecture sketch and are kept purely
for reference.

**The actual AuthePay backend is implemented in TypeScript** as Next.js
route handlers under `app/api/**`, backed by Postgres SECURITY DEFINER
functions in `supabase/migrations/`. Do not deploy anything from this
folder; there is no `requirements.txt`, no package entry point, and the
code was never executed.
