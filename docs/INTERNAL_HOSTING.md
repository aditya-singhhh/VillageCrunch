# Internal hosting guide

Runs the whole store (API + React app + MongoDB) on one machine with Docker.

## 1. Prepare
```bash
cp backend/.env.example backend/.env
```
Fill in at minimum:

| Variable | Notes |
|---|---|
| `JWT_SECRET` | `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` — app refuses to start without it |
| `FRONTEND_URL` | the internal URL users will open, e.g. `https://shop.internal.example.com` |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | **use `rzp_test_` keys for internal/staging** |
| `ADMIN_EMAIL`, `ADMIN_PHONE` | where new-order alerts go |

Leave `SMS_SERVICE` empty and `EMAIL_*` unset to disable real customer notifications while testing.

## 2. Start
```bash
docker compose up -d --build
docker compose exec app node scripts/createAdmin.js you@company.com "Your Name" 9XXXXXXXXX
```
Open `http://<host>:8080`. Admins can **no longer** be created via sign-up; use the script above.

Optional HTTPS: edit `Caddyfile` with your hostname, then `docker compose --profile proxy up -d`.

## 3. Operate
- Health: `GET /api/health` (returns 503 if MongoDB is down)
- Logs: `docker compose logs -f app`
- Backups: `docker compose exec mongo mongodump --archive --gzip > backup.gz` and back up the `uploads` volume
- Update: `git pull && docker compose up -d --build`
- Load sample catalogue: `docker compose exec app node scripts/seedProducts.js`

## 4. Keep it internal
Bind to a private network/VPN or firewall port 8080/443 to your office range. Don't expose MongoDB (compose does not publish it).
