#!/usr/bin/env bash
# Deploy VillageCrunch: Cloud Run (API) -> Firebase Hosting (frontend + routing) -> Firestore rules.
#
#   PROJECT_ID=my-proj ./scripts/deploy-firebase.sh            # everything
#   PROJECT_ID=my-proj ./scripts/deploy-firebase.sh backend    # Cloud Run only
#   PROJECT_ID=my-proj ./scripts/deploy-firebase.sh hosting    # Hosting only
#
# One-time setup (secrets, bucket, service account, TTL policy) is in docs/FIREBASE_DEPLOYMENT.md.
set -euo pipefail

: "${PROJECT_ID:?Set PROJECT_ID to your Firebase/GCP project id}"
REGION="${REGION:-asia-south1}"
SERVICE="${SERVICE:-villagecrunch}"
BUCKET="${UPLOADS_BUCKET:-${PROJECT_ID}-villagecrunch-uploads}"
RUNTIME_SA="${RUNTIME_SA:-villagecrunch-run@${PROJECT_ID}.iam.gserviceaccount.com}"
SITE_URL="${SITE_URL:-https://${PROJECT_ID}.web.app}"
TARGET="${1:-all}"
cd "$(dirname "$0")/.."

deploy_backend() {
  echo "==> Deploying Cloud Run service ${SERVICE} (${REGION})"
  gcloud run deploy "$SERVICE" \
    --project "$PROJECT_ID" --region "$REGION" \
    --source . \
    --execution-environment gen2 \
    --service-account "$RUNTIME_SA" \
    --allow-unauthenticated \
    --port 8080 \
    --min-instances 0 --max-instances 5 \
    --cpu 1 --memory 512Mi --timeout 60 \
    --add-volume "name=uploads,type=cloud-storage,bucket=${BUCKET}" \
    --add-volume-mount "volume=uploads,mount-path=/data/uploads" \
    --set-env-vars "NODE_ENV=production,FIREBASE_PROJECT_ID=${PROJECT_ID},FRONTEND_URL=${SITE_URL},UPLOAD_DIR=/data/uploads,TRUST_PROXY=${TRUST_PROXY:-2}" \
    --set-secrets "JWT_SECRET=vc-jwt-secret:latest,RAZORPAY_KEY_ID=vc-razorpay-key-id:latest,RAZORPAY_KEY_SECRET=vc-razorpay-key-secret:latest"
}

deploy_hosting() {
  echo "==> Building frontend"
  (cd backend/frontend && npm ci && VITE_API_URL=/api npm run build)
  echo "==> Deploying Firebase Hosting + Firestore rules"
  npx --yes firebase-tools@13 deploy --project "$PROJECT_ID" --only hosting,firestore
}

case "$TARGET" in
  backend) deploy_backend ;;
  hosting) deploy_hosting ;;
  all) deploy_backend; deploy_hosting ;;
  *) echo "Unknown target: $TARGET (use all|backend|hosting)"; exit 1 ;;
esac
echo "Done -> ${SITE_URL}"
