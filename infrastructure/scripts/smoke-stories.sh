#!/usr/bin/env bash
# Post-deploy smoke tests for workshop POC stories (via frontend security proxies).
# Usage:
#   ./infrastructure/scripts/smoke-stories.sh [APP_URL]
#   ./infrastructure/scripts/smoke-stories.sh --story ai-support-hijack [APP_URL]
#
# APP_URL defaults to terraform output application_url (ECS) or http://localhost:3000.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
PLATFORM="${PLATFORM:-ecs}"
TF_DIR="${ROOT_DIR}/infrastructure/${PLATFORM}/terraform"
STORY_FILTER=""
APP_URL=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --story)
      STORY_FILTER="${2:-}"
      shift 2
      ;;
    --help|-h)
      sed -n '2,8p' "$0"
      exit 0
      ;;
    *)
      APP_URL="$1"
      shift
      ;;
  esac
done

if [[ -z "$APP_URL" ]]; then
  APP_URL="$(cd "$TF_DIR" && terraform output -raw application_url 2>/dev/null || true)"
fi
if [[ -z "$APP_URL" || "$APP_URL" == "http://" ]]; then
  APP_URL="http://localhost:3000"
fi
APP_URL="${APP_URL%/}"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

pass=0
fail=0
skip=0

ok()   { echo -e "${GREEN}PASS${NC} $1"; pass=$((pass + 1)); }
bad()  { echo -e "${RED}FAIL${NC} $1"; fail=$((fail + 1)); }
warn() { echo -e "${YELLOW}SKIP${NC} $1"; skip=$((skip + 1)); }

# poc_id -> "METHOD|path|aws_only(0|1)"
declare -A POC_MAP=(
  [path-traversal]="GET|/api/security/demo/traversal|0"
  [pillow-rce]="POST|/api/security/demo/pillow|0"
  [shell-pipe]="POST|/api/security/demo/runtime/shell-pipe|0"
  [cve-probe-story]="POST|/api/security/demo/runtime/cve-probe-story|0"
  [cryptominer-sim]="POST|/api/security/demo/runtime/cryptominer-sim|0"
  [curl-pipe-sh]="POST|/api/security/demo/runtime/curl-pipe-sh|0"
  [renamed-downloader]="POST|/api/security/demo/runtime/renamed-downloader|0"
  [package-manager]="POST|/api/security/demo/runtime/package-manager|0"
  [sensitive-file-cat]="POST|/api/security/demo/runtime/sensitive-file-cat|0"
  [metadata-creds]="POST|/api/security/demo/runtime/metadata-creds|1"
  [order-yaml-checkout]="POST|/api/security/demo/order-yaml-checkout|0"
  [iam-role-abuse]="POST|/api/security/demo/iam-abuse|1"
  [s3-exfil]="POST|/api/security/demo/runtime/s3-exfil|1"
  [ai-order-hijack]="POST|/api/security/demo/runtime/ai-order-hijack|0"
  [ai-chat-unauth]="POST|/api/security/demo/runtime/ai-prompt-injection|0"
  [unauth-reindex]="POST|/api/security/demo/reindex|0"
  [ai-sensitive-disclosure]="POST|/api/security/demo/runtime/ai-sensitive-disclosure|0"
  [langchain-ai]="POST|/api/security/demo/runtime/langchain-ai|0"
  [react2shell]="POST|/api/security/demo/react2shell|0"
)

declare -A STORY_POCS=(
  [ai-support-hijack]="path-traversal ai-order-hijack metadata-creds iam-role-abuse"
  [story-1-cve-probing]="path-traversal pillow-rce shell-pipe cve-probe-story metadata-creds iam-role-abuse"
  [story-2-frontend-rce]="react2shell order-yaml-checkout"
  [identity-to-data]="metadata-creds iam-role-abuse s3-exfil"
  [ai-data-plane]="ai-chat-unauth unauth-reindex ai-sensitive-disclosure langchain-ai"
)

is_aws_deployed() {
  [[ "$APP_URL" != *"localhost"* && "$APP_URL" != *"127.0.0.1"* ]]
}

assert_exploited() {
  local poc_id="$1"
  local body_file="$2"
  local http_code="$3"

  if [[ "$http_code" == "503" ]]; then
    warn "$poc_id — HTTP 503 (expected off AWS for some PoCs)"
    return 0
  fi
  if [[ "$http_code" != "200" ]]; then
    bad "$poc_id — HTTP $http_code"
    [[ -s "$body_file" ]] && head -c 300 "$body_file" && echo ""
    return 0
  fi

  if command -v jq >/dev/null 2>&1; then
    if jq -e '.exploited == true' "$body_file" >/dev/null 2>&1; then
      ok "$poc_id"
    else
      bad "$poc_id — HTTP 200 but exploited != true"
      jq '{exploited, detail, pattern, cve}' "$body_file" 2>/dev/null || head -c 300 "$body_file"
    fi
  else
    if grep -q '"exploited"[[:space:]]*:[[:space:]]*true' "$body_file"; then
      ok "$poc_id"
    else
      bad "$poc_id — HTTP 200 but exploited not true (install jq for clearer errors)"
      head -c 300 "$body_file"
      echo ""
    fi
  fi
}

run_poc() {
  local poc_id="$1"
  local spec="${POC_MAP[$poc_id]:-}"
  if [[ -z "$spec" ]]; then
    warn "$poc_id — no smoke mapping"
    return 0
  fi

  IFS='|' read -r method path aws_only <<< "$spec"
  if [[ "$aws_only" == "1" ]] && ! is_aws_deployed; then
    warn "$poc_id — AWS-only PoC (local URL)"
    return 0
  fi

  local url="${APP_URL}${path}"
  local body_file="/tmp/jss-smoke-${poc_id}.json"
  local http_code

  if [[ "$method" == "POST" ]]; then
    http_code=$(curl -sS -o "$body_file" -w "%{http_code}" -X POST "$url" -H "Content-Type: application/json" -d '{}' || echo "000")
  else
    http_code=$(curl -sS -o "$body_file" -w "%{http_code}" "$url" || echo "000")
  fi

  assert_exploited "$poc_id" "$body_file" "$http_code"
}

echo -e "${BLUE}Jay's Surf Shop — story smoke tests${NC}"
echo "Target: $APP_URL"
echo ""

# Posture sanity check
posture_code=$(curl -sS -o /tmp/jss-smoke-posture.json -w "%{http_code}" "${APP_URL}/api/security/posture" || echo "000")
if [[ "$posture_code" == "200" ]]; then
  ok "posture API"
else
  bad "posture API — HTTP $posture_code"
fi

stories=()
if [[ -n "$STORY_FILTER" ]]; then
  stories=("$STORY_FILTER")
else
  stories=(ai-support-hijack story-1-cve-probing identity-to-data ai-data-plane)
fi

for story in "${stories[@]}"; do
  echo ""
  echo -e "${BLUE}Story: ${story}${NC}"
  pocs="${STORY_POCS[$story]:-}"
  if [[ -z "$pocs" ]]; then
    bad "unknown story id: $story"
    continue
  fi
  for poc_id in $pocs; do
    run_poc "$poc_id"
  done
done

echo ""
echo "Results: ${pass} passed, ${fail} failed, ${skip} skipped"
if [[ "$fail" -gt 0 ]]; then
  exit 1
fi
