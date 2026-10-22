#!/usr/bin/env bash
# Turn on Firebase Authentication's phone (SMS OTP) sign-in and allow the site's domains.
# Idempotent; safe to run on every deploy. Never fails the deploy: problems become annotations.
set -uo pipefail
: "${PROJECT_ID:?}"
DOMAINS='["localhost","'"$PROJECT_ID"'.firebaseapp.com","'"$PROJECT_ID"'.web.app","villagecrunch.in","www.villagecrunch.in"]'
API="https://identitytoolkit.googleapis.com/admin/v2/projects/${PROJECT_ID}/config"
TOKEN=$(gcloud auth print-access-token)
H=(-H "Authorization: Bearer ${TOKEN}" -H "X-Goog-User-Project: ${PROJECT_ID}" -H "Content-Type: application/json")
note() { echo "::$1 title=Phone OTP login::$(echo "$2" | tr '\n' ' ' | cut -c1-600)"; }

gcloud services enable identitytoolkit.googleapis.com --project "$PROJECT_ID" --quiet >/dev/null 2>&1 || true

code=$(curl -s -o /tmp/authcfg.json -w '%{http_code}' "${H[@]}" "$API")
if [ "$code" = "404" ] || grep -q CONFIGURATION_NOT_FOUND /tmp/authcfg.json 2>/dev/null; then
  # Firebase Authentication was never started in this project: initialise it
  curl -s -X POST "${H[@]}" -d '{}' \
    "https://identitytoolkit.googleapis.com/v2/projects/${PROJECT_ID}/identityPlatform:initializeAuth" >/tmp/authinit.json
  code=$(curl -s -o /tmp/authcfg.json -w '%{http_code}' "${H[@]}" "$API")
fi
if [ "$code" != "200" ]; then note warning "could not read auth config (HTTP $code): $(cat /tmp/authcfg.json)"; exit 0; fi

if grep -q '"phoneNumber"' /tmp/authcfg.json && python3 - <<'PY'
import json,sys
c=json.load(open('/tmp/authcfg.json'))
ok=c.get('signIn',{}).get('phoneNumber',{}).get('enabled') and 'villagecrunch.in' in c.get('authorizedDomains',[])
sys.exit(0 if ok else 1)
PY
then note notice "already enabled"; exit 0; fi

code=$(curl -s -o /tmp/authpatch.json -w '%{http_code}' -X PATCH "${H[@]}" \
  -d '{"signIn":{"phoneNumber":{"enabled":true}},"authorizedDomains":'"$DOMAINS"'}' \
  "${API}?updateMask=signIn.phoneNumber.enabled,authorizedDomains")
if [ "$code" = "200" ]; then note notice "enabled for villagecrunch.in"; else note warning "enable failed (HTTP $code): $(cat /tmp/authpatch.json)"; fi
exit 0
