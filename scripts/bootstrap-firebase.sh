#!/usr/bin/env bash
# One-time (idempotent) cloud setup: APIs, Firestore, uploads bucket, runtime service account,
# secrets, TTL policy, backups. Safe to re-run. Run by .github/workflows/firebase.yml ("bootstrap").
#
# Optional env: JWT_SECRET RAZORPAY_KEY_ID RAZORPAY_KEY_SECRET (only created if the secret is missing)
set -uo pipefail
: "${PROJECT_ID:?}"
REGION="${REGION:-asia-south1}"
BUCKET="${UPLOADS_BUCKET:-${PROJECT_ID}-villagecrunch-uploads}"
SA_NAME="villagecrunch-run"
SA="${SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"
G="gcloud --project=$PROJECT_ID --quiet"
step() { echo; echo "==> $*"; }

step "Enabling APIs"
$G services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com \
  firestore.googleapis.com secretmanager.googleapis.com storage.googleapis.com iam.googleapis.com \
  firebase.googleapis.com firebasehosting.googleapis.com cloudresourcemanager.googleapis.com || exit 1

step "Firestore database"
if $G firestore databases describe --database='(default)' >/dev/null 2>&1; then
  echo "exists"
else
  $G firestore databases create --location="$REGION" --type=firestore-native || exit 1
fi

step "Uploads bucket"
if $G storage buckets describe "gs://$BUCKET" >/dev/null 2>&1; then echo "exists"; else
  $G storage buckets create "gs://$BUCKET" --location="$REGION" --uniform-bucket-level-access || exit 1
fi

step "Runtime service account"
$G iam service-accounts describe "$SA" >/dev/null 2>&1 || $G iam service-accounts create "$SA_NAME" --display-name="VillageCrunch runtime" || exit 1
sleep 5
$G projects add-iam-policy-binding "$PROJECT_ID" --member="serviceAccount:$SA" --role=roles/datastore.user --condition=None >/dev/null || exit 1
$G storage buckets add-iam-policy-binding "gs://$BUCKET" --member="serviceAccount:$SA" --role=roles/storage.objectUser >/dev/null || exit 1

step "Cloud Build permissions for source deploys (non-fatal)"
PN=$($G projects describe "$PROJECT_ID" --format='value(projectNumber)')
for r in roles/cloudbuild.builds.builder roles/run.builder; do
  $G projects add-iam-policy-binding "$PROJECT_ID" --member="serviceAccount:${PN}-compute@developer.gserviceaccount.com" --role="$r" --condition=None >/dev/null 2>&1 || true
done

step "Secrets"
make_secret() { # name value
  local name="$1" value="$2"
  if $G secrets describe "$name" >/dev/null 2>&1; then echo "$name: exists (left unchanged)"; return; fi
  printf '%s' "$value" | $G secrets create "$name" --data-file=- >/dev/null || exit 1
  echo "$name: created"
}
make_secret vc-jwt-secret "${JWT_SECRET:-$(head -c 48 /dev/urandom | base64 | tr -d '/+=\n' | head -c 64)}"
if [ -z "${RAZORPAY_KEY_ID:-}" ] || [ -z "${RAZORPAY_KEY_SECRET:-}" ]; then
  echo "WARNING: Razorpay keys not provided - using placeholders. Online payments will fail until you set"
  echo "         the RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET GitHub secrets and delete the vc-razorpay-* secrets, then re-run."
fi
make_secret vc-razorpay-key-id "${RAZORPAY_KEY_ID:-rzp_test_placeholder}"
make_secret vc-razorpay-key-secret "${RAZORPAY_KEY_SECRET:-placeholder}"
for s in vc-jwt-secret vc-razorpay-key-id vc-razorpay-key-secret; do
  $G secrets add-iam-policy-binding "$s" --member="serviceAccount:$SA" --role=roles/secretmanager.secretAccessor >/dev/null || exit 1
done

step "TTL policy for abandoned checkouts (non-fatal)"
$G firestore fields ttls update expiryTime --collection-group=liveOrders --enable-ttl --async \
  || echo "could not set TTL (set it in the console: Firestore > TTL)"

step "Daily backups, 7-day retention (non-fatal)"
if ! $G firestore backups schedules list --database='(default)' 2>/dev/null | grep -q name; then
  $G firestore backups schedules create --database='(default)' --recurrence=daily --retention=7d \
    || echo "could not create backup schedule"
fi

echo; echo "Bootstrap complete."
