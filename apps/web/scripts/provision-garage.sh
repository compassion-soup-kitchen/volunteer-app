#!/usr/bin/env bash
#
# One-time Garage (S3-compatible storage) provisioning via the admin API.
#
# Drives the Garage v2 admin API to:
#   1. Apply a single-node cluster layout (skipped if already applied)
#   2. Create a bucket (skipped if it already exists)
#   3. Create an S3 access key
#   4. Grant the key full access to the bucket
#
# At the end, prints the S3_* env vars to paste into the volunteer-app service
# in Coolify.
#
# Usage:
#   GARAGE_ADMIN_URL=https://garage-admin.example.com \
#   GARAGE_ADMIN_TOKEN=<value of SERVICE_PASSWORD_GARAGE in Coolify> \
#   ./scripts/provision-garage.sh
#
# Optional env vars (with defaults):
#   BUCKET_NAME    documents
#   KEY_NAME       volunteer-app
#   ZONE           dc1
#   CAPACITY_BYTES 1000000000   # 1 GB; bump to your real disk size
#
# Requires: curl, jq.
#
# Re-running is mostly idempotent — layout & bucket are skipped if present.
# A fresh access key is created on every run; old keys remain valid until you
# revoke them with `garage key delete` or `/v2/DeleteKey`.

set -euo pipefail

: "${GARAGE_ADMIN_URL:?GARAGE_ADMIN_URL must be set}"
: "${GARAGE_ADMIN_TOKEN:?GARAGE_ADMIN_TOKEN must be set}"

BUCKET_NAME="${BUCKET_NAME:-documents}"
KEY_NAME="${KEY_NAME:-volunteer-app}"
ZONE="${ZONE:-dc1}"
CAPACITY_BYTES="${CAPACITY_BYTES:-1000000000}"

command -v curl >/dev/null || { echo "✗ curl is required" >&2; exit 1; }
command -v jq   >/dev/null || { echo "✗ jq is required (brew install jq)" >&2; exit 1; }

BASE="${GARAGE_ADMIN_URL%/}"
AUTH=( -H "Authorization: Bearer ${GARAGE_ADMIN_TOKEN}" )

api() {
  local method="$1" path="$2" body="${3:-}"
  local raw code resp
  if [ -n "$body" ]; then
    raw=$(curl -sS -w $'\n%{http_code}' -X "$method" "${AUTH[@]}" \
      -H "Content-Type: application/json" \
      -d "$body" "${BASE}${path}")
  else
    raw=$(curl -sS -w $'\n%{http_code}' -X "$method" "${AUTH[@]}" "${BASE}${path}")
  fi
  code=${raw##*$'\n'}
  resp=${raw%$'\n'*}
  if [ "$code" -ge 400 ]; then
    {
      echo "✗ HTTP $code from $method $path"
      [ -n "$body" ] && echo "  request:  $body"
      echo "  response: $resp"
    } >&2
    return 1
  fi
  printf '%s' "$resp"
}

echo "▶ Checking cluster status…"
STATUS=$(api GET /v2/GetClusterStatus)
NODE_ID=$(echo "$STATUS"      | jq -r '.nodes[0].id // empty')
LAYOUT_VERSION=$(echo "$STATUS" | jq -r '.layoutVersion // 0')

if [ -z "$NODE_ID" ]; then
  echo "✗ No nodes returned by GetClusterStatus — is Garage running?" >&2
  exit 1
fi

echo "  Node ID:        $NODE_ID"
echo "  Layout version: $LAYOUT_VERSION"

if [ "$LAYOUT_VERSION" -eq 0 ]; then
  echo "▶ Applying single-node layout (zone=$ZONE, capacity=$CAPACITY_BYTES)…"
  LAYOUT_BODY=$(jq -nc \
    --arg id   "$NODE_ID" \
    --arg zone "$ZONE" \
    --argjson cap "$CAPACITY_BYTES" \
    '{roles: [{id:$id, zone:$zone, capacity:$cap, tags:[]}]}')
  api POST /v2/UpdateClusterLayout "$LAYOUT_BODY" >/dev/null
  api POST /v2/ApplyClusterLayout '{"version":1}' >/dev/null
  echo "  Layout applied (version 1)."
else
  echo "  Layout already applied — skipping."
fi

echo "▶ Ensuring bucket '$BUCKET_NAME' exists…"
BUCKET_BODY=$(jq -nc --arg n "$BUCKET_NAME" '{globalAlias:$n}')
if BUCKET_RESP=$(api POST /v2/CreateBucket "$BUCKET_BODY" 2>/dev/null) && \
   echo "$BUCKET_RESP" | jq -e '.id' >/dev/null 2>&1; then
  BUCKET_ID=$(echo "$BUCKET_RESP" | jq -r '.id')
  echo "  Created (id: $BUCKET_ID)."
else
  BUCKET_ID=$(api GET "/v2/GetBucketInfo?globalAlias=$BUCKET_NAME" | jq -r '.id')
  echo "  Already existed (id: $BUCKET_ID)."
fi

echo "▶ Creating S3 access key '$KEY_NAME'…"
KEY_BODY=$(jq -nc --arg n "$KEY_NAME" '{name:$n}')
KEY_RESP=$(api POST /v2/CreateKey "$KEY_BODY")
ACCESS_KEY=$(echo "$KEY_RESP" | jq -r '.accessKeyId')
SECRET_KEY=$(echo "$KEY_RESP" | jq -r '.secretAccessKey')

if [ -z "$ACCESS_KEY" ] || [ "$ACCESS_KEY" = "null" ]; then
  echo "✗ Key creation did not return an accessKeyId. Raw response:" >&2
  echo "$KEY_RESP" >&2
  exit 1
fi

echo "▶ Granting key full access to '$BUCKET_NAME'…"
PERM_BODY=$(jq -nc \
  --arg b "$BUCKET_ID" \
  --arg k "$ACCESS_KEY" \
  '{bucketId:$b, accessKeyId:$k, permissions:{read:true, write:true, owner:true}}')
api POST /v2/AllowBucketKey "$PERM_BODY" >/dev/null

cat <<EOF

✓ Done. Set these on the volunteer-app service in Coolify:

  S3_ENDPOINT=<your public Garage S3 API URL (GARAGE_S3_API_URL)>
  S3_REGION=<must match s3_region in garage.toml; usually "garage">
  S3_BUCKET=$BUCKET_NAME
  S3_ACCESS_KEY=$ACCESS_KEY
  S3_SECRET_KEY=$SECRET_KEY

The secret key is only returned once — save it now.
EOF
