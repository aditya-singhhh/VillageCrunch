#!/usr/bin/env bash
# Add DOMAIN and www.DOMAIN to Firebase Hosting and print the DNS records the registrar needs.
# Records are printed as GitHub annotations and in the job summary.
set -euo pipefail
: "${PROJECT_ID:?}" "${DOMAIN:?}"
SITE="${SITE_ID:-$PROJECT_ID}"
API="https://firebasehosting.googleapis.com/v1beta1/projects/${PROJECT_ID}/sites/${SITE}/customDomains"
TOKEN="$(gcloud auth print-access-token)"
H=(-H "Authorization: Bearer ${TOKEN}" -H "Content-Type: application/json" -H "x-goog-user-project: ${PROJECT_ID}")

add() {
  local d="$1" extra="$2"
  echo "==> Adding ${d}"
  curl -sS -X POST "${API}?customDomainId=${d}" "${H[@]}" -d "${extra}" | tee "/tmp/add-${d}.json" >/dev/null || true
}
add "${DOMAIN}" '{}'
add "www.${DOMAIN}" "{\"redirectTarget\":\"${DOMAIN}\"}"

sleep 20
{
  echo "## DNS records to add at your registrar"
  echo
  echo "| Host | Type | Value |"
  echo "|---|---|---|"
} >> "$GITHUB_STEP_SUMMARY"
for d in "${DOMAIN}" "www.${DOMAIN}"; do
  curl -sS "${API}/${d}" "${H[@]}" > "/tmp/get-${d}.json"
  node -e '
    const j=require(process.argv[1]); const d=process.argv[2];
    const out=[];
    const walk=(u)=>{ for (const s of (u?.desired||[])) for (const r of (s.records||[])) out.push([r.domainName||d,r.type,r.rdata]); };
    walk(j.requiredDnsUpdates);
    if (j.error) console.log(`::warning title=${d}::${j.error.message}`);
    for (const [h,t,v] of out) {
      console.log(`::notice title=DNS ${t} ${h}::${v}`);
      require("fs").appendFileSync(process.env.GITHUB_STEP_SUMMARY, `| ${h} | ${t} | ${v} |\n`);
    }
    const seen=[];
    for (const s of (j.requiredDnsUpdates?.discovered||[])) for (const r of (s.records||[])) seen.push(`${r.type} ${r.rdata}`);
    console.log(`::notice title=Status ${d}::hostState=${j.hostState||"?"} ownershipState=${j.ownershipState||"?"} cert=${j.cert?.state||"?"} | Firebase sees: ${seen.join(", ")||"nothing"}`);
  ' "/tmp/get-${d}.json" "$d"
done
