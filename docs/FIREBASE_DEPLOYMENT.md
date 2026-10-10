# Deploying VillageCrunch on Firebase — end to end

**Architecture**

```
Browser ──► Firebase Hosting (CDN)
              ├─ static React build (backend/frontend/dist)
              └─ rewrites: /api/**  /sitemap.xml  /robots.txt
                           /uploads/**  /Product_Images/**  /Review_Images/**
                              │
                              ▼
                        Cloud Run  "villagecrunch"   (Express, from ./Dockerfile)
                          ├─ Firestore            (all data)
                          ├─ Cloud Storage bucket (uploaded images, mounted at /data/uploads)
                          └─ Secret Manager       (JWT + Razorpay secrets)
```

Authentication stays the app's own JWT login (no Firebase Auth). Browsers never talk to
Firestore: `firestore.rules` denies all client access; only the API (Admin SDK) reads/writes.

> **Billing:** Hosting → Cloud Run rewrites and Cloud Run itself require the **Blaze
> (pay-as-you-go)** plan. A shop of this size normally stays in the free tiers
> (Cloud Run 2M requests/month, Firestore 50k reads + 20k writes/day) but **set a budget
> alert** (step 1).

Replace `PROJECT_ID` below with your project id. Region used throughout: `asia-south1` (Mumbai).

---

## 0. Prerequisites

```bash
npm i -g firebase-tools        # >= 13
gcloud --version               # Google Cloud CLI
firebase login && gcloud auth login
```

## 1. Project, billing, APIs

1. <https://console.firebase.google.com> → **Add project** (or pick an existing GCP project).
2. **Upgrade to Blaze** (Console → Usage and billing).
3. Budget alert: Cloud Console → Billing → Budgets & alerts → e.g. ₹1,000/month, alert at 50/90/100%.
4. Enable APIs and set defaults:

```bash
export PROJECT_ID=your-project-id
gcloud config set project $PROJECT_ID
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com \
  firestore.googleapis.com secretmanager.googleapis.com storage.googleapis.com iam.googleapis.com
cp .firebaserc.example .firebaserc      # edit: your project id
```

## 2. Firestore

```bash
gcloud firestore databases create --location=asia-south1 --type=firestore-native
firebase deploy --only firestore        # deploys firestore.rules (deny-all) + indexes
```

**Location cannot be changed later** — pick the region closest to your customers.

**TTL for abandoned checkouts.** Payment attempts are stored in `liveOrders` with an
`expiryTime` that Mongo used to purge automatically. Firestore needs an explicit policy:

```bash
gcloud firestore fields ttls update expiryTime --collection-group=liveOrders --enable-ttl
```

TTL deletion is best-effort (typically within ~24h); the app never relies on it for correctness.

## 3. Storage bucket for uploads

Product and review images uploaded through the app are files on disk. Cloud Run's disk is
ephemeral, so a Cloud Storage bucket is mounted at `/data/uploads`:

```bash
gcloud storage buckets create gs://$PROJECT_ID-villagecrunch-uploads \
  --location=asia-south1 --uniform-bucket-level-access
```

Limits to know: there is no file locking (concurrent writes to the *same* object: last wins —
fine because every upload gets a unique name) and the first read of an object is slower than
local disk. Images are served through Hosting; add a `Cache-Control` if you want CDN caching.

## 4. Runtime service account and secrets

```bash
# identity the Cloud Run service runs as
gcloud iam service-accounts create villagecrunch-run --display-name="VillageCrunch runtime"
SA=villagecrunch-run@$PROJECT_ID.iam.gserviceaccount.com
gcloud projects add-iam-policy-binding $PROJECT_ID --member=serviceAccount:$SA --role=roles/datastore.user
gcloud storage buckets add-iam-policy-binding gs://$PROJECT_ID-villagecrunch-uploads \
  --member=serviceAccount:$SA --role=roles/storage.objectUser

# secrets
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))" | \
  gcloud secrets create vc-jwt-secret --data-file=-
printf '%s' 'rzp_live_xxx'  | gcloud secrets create vc-razorpay-key-id --data-file=-
printf '%s' 'xxxxxxxx'      | gcloud secrets create vc-razorpay-key-secret --data-file=-
for s in vc-jwt-secret vc-razorpay-key-id vc-razorpay-key-secret; do
  gcloud secrets add-iam-policy-binding $s --member=serviceAccount:$SA --role=roles/secretmanager.secretAccessor
done
```

Use `rzp_test_` keys until you have verified a full test payment on the live URL.
Email/SMS variables (`EMAIL_USER`, `EMAIL_APP_PASSWORD`, `ADMIN_EMAIL`, `SMS_SERVICE`, …) are
added the same way: create a secret and append it to `--set-secrets` in
`scripts/deploy-firebase.sh`.

## 5. First deploy

```bash
PROJECT_ID=$PROJECT_ID ./scripts/deploy-firebase.sh
```

The script (1) builds the container with Cloud Build from the `Dockerfile` and deploys Cloud Run
with the bucket mounted, secrets injected and `FIREBASE_PROJECT_ID` set, then (2) builds the
frontend and runs `firebase deploy --only hosting,firestore`.

The deploy order matters: the Cloud Run service must exist before Hosting rewrites point at it.

Your site is live at `https://PROJECT_ID.web.app`. Check:

```bash
curl https://$PROJECT_ID.web.app/api/health          # {"status":"ok", ... firestore ok}
```

### Create the first admin

```bash
cd backend
GOOGLE_APPLICATION_CREDENTIALS=./sa.json FIREBASE_PROJECT_ID=$PROJECT_ID \
  node scripts/createAdmin.js you@example.com "Your Name" 9XXXXXXXXX
```

(`sa.json` = a service-account key with `roles/datastore.user`; create it for the run and
delete it afterwards. Never commit it — `.gitignore` already excludes `*-service-account*.json`.)

## 6. Migrate existing MongoDB data

Do this **before** pointing real traffic at the new site, then again right before cut-over
for the delta (the script is idempotent: existing documents are skipped).

```bash
cd backend && npm ci          # installs the mongodb driver (dev dependency)
export MONGODB_URI='mongodb+srv://…'          # read-only access is enough
export FIREBASE_PROJECT_ID=$PROJECT_ID GOOGLE_APPLICATION_CREDENTIALS=./sa.json

npm run migrate:firestore -- --dry-run        # validates every document, writes nothing
npm run migrate:firestore                     # real run
```

What it guarantees: every document keeps its `_id` (as a 24-hex string), so product URLs,
order references and logged-in users' JWTs keep working; dates stay dates; Mongo `Map`s become
plain objects; unique constraints (emails, order numbers, promo codes …) are enforced through
the same `_unique` marker docs the app uses. Anything that fails validation is listed with its
id — fix the source data and re-run. MongoDB is only read.

Verify counts in the Firestore console against `db.<collection>.countDocuments()`.

Cut-over plan: freeze orders (maintenance banner) → final migrate run → switch DNS → keep Mongo
read-only for ~2 weeks as a fallback → then delete it.

**Rotate the old Atlas password now** — it was in git history of this repo.

## 7. Custom domain

Console → Hosting → **Add custom domain**, follow the DNS records, wait for the certificate.
Then update the service:

```bash
gcloud run services update villagecrunch --region asia-south1 \
  --update-env-vars FRONTEND_URL=https://www.yourdomain.com
```

(`FRONTEND_URL` drives CORS, email links and the sitemap.) Add the domain in Razorpay's
dashboard if you restrict allowed websites.

## 8. Client IP behind two proxies (`TRUST_PROXY`)

Rate limiting is per IP, so Express must resolve the real client address. Traffic goes
Hosting (Fastly) → Cloud Run front end → your container. The deploy script defaults
`TRUST_PROXY=2`. **Verify it once after the first deploy**: trigger a rate-limited route
(e.g. hit `/api/auth/login` repeatedly from your phone's data connection and from home Wi-Fi)
and check that the two networks are limited independently. If every visitor shares one
limit, the value is too low; if you can spoof your IP with an `X-Forwarded-For` header, it is
too high. Adjust with `gcloud run services update … --update-env-vars TRUST_PROXY=N`.

## 9. CI/CD (GitHub Actions, keyless)

`.github/workflows/deploy-firebase.yml` deploys on every push to `main`, after tests pass.
No long-lived keys: it uses Workload Identity Federation.

```bash
PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format='value(projectNumber)')
REPO=your-github-user/VillageCrunch

gcloud iam service-accounts create gh-deployer
DEPLOYER=gh-deployer@$PROJECT_ID.iam.gserviceaccount.com
for role in run.admin cloudbuild.builds.editor artifactregistry.writer storage.admin \
            firebasehosting.admin datastore.owner serviceusage.serviceUsageConsumer; do
  gcloud projects add-iam-policy-binding $PROJECT_ID --member=serviceAccount:$DEPLOYER --role=roles/$role
done
gcloud iam service-accounts add-iam-policy-binding \
  villagecrunch-run@$PROJECT_ID.iam.gserviceaccount.com \
  --member=serviceAccount:$DEPLOYER --role=roles/iam.serviceAccountUser

gcloud iam workload-identity-pools create github --location=global
gcloud iam workload-identity-pools providers create-oidc github-oidc --location=global \
  --workload-identity-pool=github --issuer-uri=https://token.actions.githubusercontent.com \
  --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository" \
  --attribute-condition="assertion.repository=='$REPO'"
gcloud iam service-accounts add-iam-policy-binding $DEPLOYER --role=roles/iam.workloadIdentityUser \
  --member="principalSet://iam.googleapis.com/projects/$PROJECT_NUMBER/locations/global/workloadIdentityPools/github/attribute.repository/$REPO"
```

In GitHub → Settings → Environments → `production` → **Variables**:

| Variable | Value |
|---|---|
| `GCP_PROJECT_ID` | your project id |
| `GCP_REGION` | `asia-south1` |
| `GCP_WORKLOAD_IDENTITY_PROVIDER` | `projects/<PROJECT_NUMBER>/locations/global/workloadIdentityPools/github/providers/github-oidc` |
| `GCP_DEPLOY_SERVICE_ACCOUNT` | `gh-deployer@<PROJECT_ID>.iam.gserviceaccount.com` |
| `SITE_URL` | `https://www.yourdomain.com` |
| `TRUST_PROXY` | the value verified in step 8 |

Add a required reviewer on the `production` environment if you want manual approval.
The role list above is deliberately broad to get you going — tighten it once the pipeline works.

## 10. Local development

```bash
firebase emulators:start --only firestore          # terminal 1 (needs Java 11+)
cd backend && cp .env.example .env                 # set JWT_SECRET, FIRESTORE_EMULATOR_HOST=127.0.0.1:8080
npm run dev                                        # terminal 2
```

or `docker compose up --build` (app + emulator; data is lost on restart).

Tests:

```bash
cd backend && npm test        # 44 tests on an in-memory Firestore fake, no setup needed
firebase emulators:exec --only firestore --project demo-villagecrunch \
  "cd backend && node scripts/smokeFirestore.js"   # same data layer on the REAL emulator
```

## 11. Operations

* **Logs:** Cloud Console → Cloud Run → villagecrunch → Logs.
* **Rollback:** Cloud Run → Revisions → *Manage traffic* → 100% to the previous revision
  (instant). Hosting: Console → Hosting → release history → *Rollback*.
* **Backups:** enable scheduled backups (daily, 7-day retention is cheap):
  `gcloud firestore backups schedules create --database='(default)' --recurrence=daily --retention=7d`
  and also point-in-time recovery: `gcloud firestore databases update --database='(default)' --enable-pitr`.
* **Cold starts:** `--min-instances 0` costs nothing idle but the first request after quiet
  periods takes a couple of seconds. Set `--min-instances 1` (a few $/month) for always-warm.
* **Limits:** Hosting→Cloud Run requests time out at 60 s (the service is set to 60 s too);
  nothing in the app runs that long.
* **Caching:** API responses are not cached by the CDN (Hosting only caches responses carrying
  `Cache-Control: public` / `s-maxage`, and strips cookies other than `__session`). The app
  uses a `Authorization` header, which Hosting adds to `Vary`, so authenticated responses are never
  shared. If you want the product list cached, add `Cache-Control: public, s-maxage=300` to
  that one route.

## 12. What changed in the app, and what to watch

* Mongoose is now only a **schema/validation layer**; persistence is `backend/db/` (Firestore
  Admin SDK). Routes and models are otherwise unchanged. IDs are the same 24-hex strings.
* **Transactions:** stock decrement, promo usage, order cancel, etc. run in Firestore
  transactions (`updateOne`/`findOneAndUpdate`…), so two buyers can't take the last unit.
* **Queries:** equality filters run in Firestore; everything else (regex search, `$or`,
  `$in` on array fields, sorting, pagination) is evaluated in memory over the matched documents.
  Fine for a catalogue of hundreds and thousands of orders; the **admin order/user list endpoints
  read the whole collection**, which costs reads at scale (50k free/day). Before the shop
  grows past ~10k orders: add Firestore composite indexes + cursor pagination for those
  endpoints (see `docs/ROADMAP.md`).
* **No aggregation pipelines** (`Model.aggregate` throws): stats endpoints compute in JS.
* **Unique constraints** live in the `_unique` collection — don't edit or delete it by hand.
* Free-text search is a case-insensitive substring match in memory, not full-text search; use
  Algolia/Typesense later if the catalogue gets large.
* The suite runs against an in-memory fake; the emulator smoke test (step 10) and your own
  staging deploy are what prove real-Firestore behaviour. Run both before cut-over.

## 13. Cost sanity check (rough, small shop)

| Item | Typical | Notes |
|---|---|---|
| Hosting | free | 10 GB storage, 360 MB/day transfer free; then pay-per-GB |
| Cloud Run | ~free | scale-to-zero; min-instances 1 ≈ a few USD/month |
| Firestore | ~free | watch reads from admin list pages |
| Cloud Storage | cents | images only |
| Secret Manager / Build | cents | |

## Troubleshooting

| Symptom | Cause / fix |
|---|---|
| Hosting returns 404 for `/api/*` | Cloud Run service name/region differ from `firebase.json` (`villagecrunch`, `asia-south1`), or it isn't deployed yet |
| Container fails to start, mentions volume | Service account lacks `roles/storage.objectUser` on the bucket, or execution environment isn't gen2 |
| `/api/health` says Firestore unavailable | Runtime SA missing `roles/datastore.user`, or `FIREBASE_PROJECT_ID` unset |
| `9 FAILED_PRECONDITION: The query requires an index` | A new pushed-down multi-field query; click the link in the log to create it, then add it to `firestore.indexes.json` |
| Logged-in users forced to re-login after cut-over | `JWT_SECRET` differs from the old one — reuse the old value in `vc-jwt-secret` if you want sessions to survive |
| Images 404 after deploy | Old images were on the previous host's disk: copy them into the bucket (`gcloud storage cp -r uploads/* gs://…-uploads/`) |
