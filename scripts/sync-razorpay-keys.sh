#!/usr/bin/env bash
# Copy the RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET GitHub secrets into Secret Manager (new version
# only when changed). Never fails the workflow; reports what happened as annotations.
set -uo pipefail
: "${PROJECT_ID:?}"
say() { echo "::$1 title=Razorpay::$(echo "$2" | tr '\n' ' ' | cut -c1-500)"; }
if [ -z "${RAZORPAY_KEY_ID:-}" ] || [ -z "${RAZORPAY_KEY_SECRET:-}" ]; then
  say warning "RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET GitHub secrets not found - online payments stay off (COD only)"; exit 0
fi
case "$RAZORPAY_KEY_ID" in rzp_live_*) mode=LIVE;; rzp_test_*) mode=TEST;; *) say warning "RAZORPAY_KEY_ID does not start with rzp_live_ or rzp_test_ - check the secret"; exit 0;; esac
changed=0
for pair in "vc-razorpay-key-id:RAZORPAY_KEY_ID" "vc-razorpay-key-secret:RAZORPAY_KEY_SECRET"; do
  name="${pair%%:*}"; var="${pair##*:}"; val="${!var}"
  cur=$(gcloud secrets versions access latest --secret "$name" --project "$PROJECT_ID" 2>/tmp/rzp_err) || cur=""
  if [ "$cur" = "$val" ]; then continue; fi
  if out=$(printf '%s' "$val" | gcloud secrets versions add "$name" --data-file=- --project "$PROJECT_ID" 2>&1); then
    changed=1
  else
    say error "could not update $name: $out"; exit 0
  fi
done
say notice "$mode keys in place$([ $changed = 1 ] && echo ' (updated)')"
echo "RZP_CHANGED=$changed" >> "${GITHUB_ENV:-/dev/null}"
