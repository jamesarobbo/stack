# Stack landing (Cloudflare Pages)

Static marketing page for the waitlist. Light mode only. Product name comes from `config.js` (`PRODUCT_NAME`).

## Local preview

```bash
cd web
python3 -m http.server 4173
```

Open `http://127.0.0.1:4173`. The form posts to the deployed stack-api waitlist route by default.

## Deploy (needs James's approval)

Do not create the Pages project or deploy until approved.

1. Create a Cloudflare Pages project pointed at this `web/` folder (no build command; output dir `.`).
2. Attach a custom domain when ready.
3. Deploy the stack-api Worker that includes `POST /v1/waitlist` and `GET /v1/admin/waitlist/count`.
4. Back up D1 first, then apply migration `server/migrations/0011_waitlist.sql` remotely with James's approval.
5. Confirm `WAITLIST_API_BASE` in `config.js` matches the live Worker origin (or the custom API host).

Waitlist storage stays on stack-api D1 (same DB as the app). Pages stays static so the marketing site stays fast and simple.
