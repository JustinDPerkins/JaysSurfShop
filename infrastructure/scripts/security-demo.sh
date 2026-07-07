#!/usr/bin/env bash
# Security workshop script for Jay's Surf Shop (vulnerable by default)
# Usage: ./infrastructure/scripts/security-demo.sh <phase>
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
PLATFORM="${PLATFORM:-ecs}"
TF_DIR="${ROOT_DIR}/infrastructure/${PLATFORM}/terraform"
DEMO_CVE="CVE-2023-50447"
DEMO_CVE_PACKAGE="pillow@10.0.1"
AWS_REGION="${AWS_REGION:-us-east-1}"
PROJECT_NAME="${PROJECT_NAME:-jays-surf-shop}"
ENVIRONMENT="${ENVIRONMENT:-demo}"
ECR_REPO="${PROJECT_NAME}-${ENVIRONMENT}/chat-rag"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

header() { echo -e "\n${BLUE}══ $1 ══${NC}\n"; }
ok()     { echo -e "${GREEN}✓${NC} $1"; }
warn()   { echo -e "${YELLOW}!${NC} $1"; }
fail()   { echo -e "${RED}✗${NC} $1"; }

tf_output() {
  (cd "$TF_DIR" && terraform output -raw "$1" 2>/dev/null) || true
}

print_banner() {
  echo "Jay's Surf Shop — Security Demo"
  echo "Misconfiguration: public S3 bucket + synthetic customer export"
  echo "CVE:              ${DEMO_CVE} (${DEMO_CVE_PACKAGE} in chat-rag image)"
  echo "Runbook:          docs/WORKSHOP.md"
}

phase_baseline() {
  header "Posture check"
  print_banner
  ok "Workshop misconfigs and CVEs are enabled by default in this deployment"

  APP_URL="$(tf_output application_url)"
  if [[ -n "$APP_URL" && "$APP_URL" != "http://" ]]; then
    if curl -sf "${APP_URL}/api/security/posture" >/dev/null; then
      ok "Posture API reachable: ${APP_URL}/api/security/posture"
    else
      warn "Posture API not reachable at ${APP_URL}"
    fi
  else
    warn "Terraform not applied — use local docker compose or deploy to AWS first"
  fi

  EXFIL_URL="$(tf_output demo_exfiltration_url)"
  if [[ -n "$EXFIL_URL" ]]; then
    fail "Public exfiltration URL is live: ${EXFIL_URL}"
    warn "CSPM should flag: public S3 bucket with sensitive export"
  else
    warn "No AWS exfil URL yet — run terraform apply for CSPM S3 demo"
  fi

  API_URL="$(tf_output order_webhook_url)"
  if [[ -n "$API_URL" ]]; then
    fail "Public unauthenticated API Gateway is live: ${API_URL}"
    if curl -sf "${API_URL}/demo/eicar" | grep -q "EICAR-STANDARD-ANTIVIRUS-TEST-FILE"; then
      ok "No auth required — EICAR endpoint reachable from internet"
    else
      warn "API Gateway reachable but EICAR demo response unexpected"
    fi
  else
    warn "No API Gateway URL yet — run terraform apply for serverless demo"
  fi

  echo ""
  echo "Built-in findings to validate in your tooling:"
  echo "  • Public S3 bucket with synthetic customer export (AWS)"
  echo "  • ECS task role with s3:*, iam:*, secretsmanager:* on * (AWS)"
  echo "  • SSH (22) open to 0.0.0.0/0 on ECS security group (AWS)"
  echo "  • Public API Gateway HTTP API — no authorizer, CORS * (AWS)"
  echo "  • Overprivileged Lambda execution role (AWS)"
  echo "  • CVE-2023-50447 in chat-rag image (local + AWS)"
  echo "  • CVE-2020-14343 in order-webhook Lambda (AWS)"
  echo "  • chat-rag on host port 8001 + unauthenticated /reindex (local compose)"
}

phase_scenario() {
  header "Workshop scenario"
  print_banner
  cat <<'EOF'
This deployment ships vulnerable by default:

AWS (terraform apply):
  • Public S3 bucket with world-readable synthetic customer-export.json
  • Overprivileged ECS task IAM policy
  • SSH open on ECS security group
  • Public API Gateway HTTP API (no authorizer, no API key, CORS *)
  • Overprivileged Lambda execution role + EICAR / PyYAML CVE
  • chat-rag image includes pillow 10.0.1 (CVE-2023-50447)

Local (docker compose up --build):
  • Pillow CVE + exploit endpoints always on
  • chat-rag exposed on port 8001
  • PoC buttons at http://localhost:3000/security

Demo commands:
  ./infrastructure/scripts/security-demo.sh exploit       # S3 exfil (AWS)
  ./infrastructure/scripts/security-demo.sh public-api    # unauthenticated API GW (AWS)
  ./infrastructure/scripts/security-demo.sh scan-cve      # container scan
  ./infrastructure/scripts/security-demo.sh exploit-live  # local PoCs
  ./infrastructure/scripts/security-demo.sh local-abuse   # unauth /reindex
EOF
}

phase_exploit() {
  header "Controlled exfiltration simulation"
  print_banner

  EXFIL_URL="$(tf_output demo_exfiltration_url)"
  if [[ -z "$EXFIL_URL" ]]; then
    fail "Demo exfiltration URL not available — run terraform apply first"
    exit 1
  fi

  warn "Simulating attacker downloading public customer export..."
  echo "GET ${EXFIL_URL}"
  echo ""

  HTTP_CODE=$(curl -s -o /tmp/jss-exfil.json -w "%{http_code}" "$EXFIL_URL")
  if [[ "$HTTP_CODE" == "200" ]]; then
    fail "DATA EXFILTRATED — HTTP ${HTTP_CODE} (intentional demo finding)"
    echo ""
    echo "Sample records (synthetic data):"
    if command -v jq >/dev/null 2>&1; then
      jq '{export_id, record_count, sample: .records[0]}' /tmp/jss-exfil.json
    else
      head -c 500 /tmp/jss-exfil.json
      echo "..."
    fi
  else
    fail "Exfiltration failed (HTTP ${HTTP_CODE})"
    exit 1
  fi
}

scan_with_docker() {
  local image="$1"
  header "Scanning with Docker: ${image}"

  local pillow_version
  pillow_version=$(docker run --rm --entrypoint pip "$image" show pillow 2>/dev/null | awk '/^Version:/ {print $2}' || true)

  if [[ "$pillow_version" == "10.0.1" ]]; then
    fail "CVE DETECTED: ${DEMO_CVE} — pillow ${pillow_version}"
    ok "Container scan validated"
    return 0
  fi

  if [[ -n "$pillow_version" ]]; then
    warn "pillow ${pillow_version} found but expected 10.0.1"
  else
    warn "pillow not found — rebuild: docker compose build chat-rag"
  fi
  return 1
}

scan_with_trivy() {
  local image="$1"
  header "Scanning with Trivy: ${image}"

  if ! command -v trivy >/dev/null 2>&1; then
    warn "Trivy not installed (optional)"
    return 1
  fi

  trivy image --severity HIGH,CRITICAL --ignore-unfixed "$image" 2>/dev/null | grep -E "CVE-2023-50447|pillow" || true

  if trivy image --severity HIGH,CRITICAL --ignore-unfixed "$image" 2>/dev/null | grep -q "CVE-2023-50447"; then
    fail "CVE DETECTED: ${DEMO_CVE}"
    return 0
  fi
  return 1
}

scan_with_ecr() {
  header "Scanning ECR: ${ECR_REPO}:${IMAGE_TAG:-latest}"

  if ! command -v aws >/dev/null 2>&1; then
    warn "AWS CLI not available"
    return 1
  fi

  local tag="${IMAGE_TAG:-latest}"
  local basic
  basic=$(aws ecr describe-image-scan-findings \
    --repository-name "$ECR_REPO" \
    --image-id "imageTag=${tag}" \
    --region "$AWS_REGION" \
    --output json 2>/dev/null || echo "")

  if echo "$basic" | grep -q "CVE-2023-50447"; then
    fail "CVE DETECTED in ECR: ${DEMO_CVE}"
    return 0
  fi

  warn "CVE-2023-50447 not in ECR results yet — push image and wait for scan"
  return 1
}

resolve_chat_rag_image() {
  COMPOSE_IMAGE=$(docker compose -f "${ROOT_DIR}/docker-compose.yml" images -q chat-rag 2>/dev/null | head -1 || true)
  if [[ -n "$COMPOSE_IMAGE" ]]; then
    echo "$COMPOSE_IMAGE"
    return 0
  fi
  return 1
}

phase_scan_cve() {
  header "CVE detection (${DEMO_CVE})"
  print_banner

  local image found=1
  if image=$(resolve_chat_rag_image); then
    :
  else
    warn "No local chat-rag image — building..."
    docker build -t jss-chat-rag-demo "${ROOT_DIR}/services/chat-rag"
    image="jss-chat-rag-demo"
  fi

  echo "Target image: ${image}"
  echo ""

  scan_with_trivy "$image" && found=0 || true
  scan_with_docker "$image" && found=0 || true
  scan_with_ecr && found=0 || true

  if [[ "$found" -ne 0 ]]; then
    warn "Expected ${DEMO_CVE} in chat-rag — run: docker compose up -d --build chat-rag"
  fi
}

phase_exploit_live() {
  header "Live exploitation (container-local)"
  print_banner

  CHAT_URL="${CHAT_URL:-http://localhost:8001}"

  STATUS_CODE=$(curl -s -o /tmp/jss-exploit-status.json -w "%{http_code}" "${CHAT_URL}/demo/exploit/status")
  if [[ "$STATUS_CODE" != "200" ]]; then
    fail "Exploit lab not reachable (HTTP ${STATUS_CODE}) — run: docker compose up -d --build"
    exit 1
  fi
  ok "Exploit lab reachable"

  echo ""
  warn "Exploit 1 — CVE-2023-50447 Pillow RCE"
  HTTP_CODE=$(curl -s -o /tmp/jss-pillow-exploit.json -w "%{http_code}" -X POST "${CHAT_URL}/demo/exploit/pillow")
  if [[ "$HTTP_CODE" == "200" ]]; then
    fail "EXPLOIT SUCCESS — CVE-2023-50447 (HTTP ${HTTP_CODE})"
    command -v jq >/dev/null 2>&1 && jq '{cve, proof: .proof}' /tmp/jss-pillow-exploit.json || cat /tmp/jss-pillow-exploit.json
  else
    fail "Pillow exploit failed (HTTP ${HTTP_CODE}) — rebuild chat-rag"
  fi

  echo ""
  warn "Exploit 2 — path traversal"
  HTTP_CODE=$(curl -s -o /tmp/jss-traversal.json -w "%{http_code}" \
    "${CHAT_URL}/legacy/download?file=../confidential/api-credentials.txt")
  if [[ "$HTTP_CODE" == "200" ]]; then
    fail "EXPLOIT SUCCESS — path traversal (HTTP ${HTTP_CODE})"
    command -v jq >/dev/null 2>&1 && jq '{cve, content}' /tmp/jss-traversal.json || cat /tmp/jss-traversal.json
  else
    fail "Path traversal failed (HTTP ${HTTP_CODE})"
  fi

  echo ""
  warn "Exploit 3 — IAM task role abuse (AWS ECS only)"
  HTTP_CODE=$(curl -s -o /tmp/jss-iam-abuse.json -w "%{http_code}" -X POST "${CHAT_URL}/demo/exploit/iam-abuse")
  if [[ "$HTTP_CODE" == "200" ]]; then
    fail "EXPLOIT SUCCESS — IAM role abuse (HTTP ${HTTP_CODE})"
    command -v jq >/dev/null 2>&1 && jq '{identity: .identity, api_probes: .api_probes}' /tmp/jss-iam-abuse.json || true
  elif [[ "$HTTP_CODE" == "503" ]]; then
    warn "IAM abuse skipped — deploy to AWS ECS to run this PoC"
  else
    fail "IAM abuse failed (HTTP ${HTTP_CODE})"
  fi
}

phase_local_abuse() {
  header "Unauthenticated /reindex"
  print_banner

  CHAT_URL="${CHAT_URL:-http://localhost:8001}"
  HTTP_CODE=$(curl -s -o /tmp/jss-reindex.json -w "%{http_code}" -X POST "${CHAT_URL}/reindex")
  if [[ "$HTTP_CODE" == "200" ]]; then
    fail "UNAUTHORIZED ADMIN ACTION — reindex succeeded (HTTP ${HTTP_CODE})"
    cat /tmp/jss-reindex.json
  else
    warn "Reindex returned HTTP ${HTTP_CODE} — is chat-rag running on ${CHAT_URL}?"
  fi
}

phase_public_api() {
  header "Public unauthenticated API Gateway"
  print_banner

  API_URL="$(tf_output order_webhook_url)"
  if [[ -z "$API_URL" ]]; then
    fail "No API Gateway URL — run terraform apply first"
    exit 1
  fi

  fail "Invoke URL (no credentials): ${API_URL}"
  echo ""
  echo "Calling GET /demo/eicar without Authorization header..."
  if curl -sf "${API_URL}/demo/eicar" | tee /tmp/jss-eicar.json | grep -q "EICAR-STANDARD-ANTIVIRUS-TEST-FILE"; then
    ok "EICAR returned — API is public and unauthenticated"
    warn "CSPM should flag: API Gateway with authorization_type NONE"
  else
    fail "Unexpected response from ${API_URL}/demo/eicar"
    exit 1
  fi

  echo ""
  echo "Calling POST /demo/yaml without Authorization header..."
  if curl -sf -X POST "${API_URL}/demo/yaml" -H "Content-Type: application/json" -d '{}' | grep -q "CVE-2020-14343"; then
    ok "PyYAML exploit demo reachable without auth"
  else
    warn "YAML demo response unexpected"
  fi
}

phase_full() {
  phase_baseline
  phase_scan_cve
  phase_exploit_live || true
}

usage() {
  echo "Usage: $0 <phase>"
  echo ""
  echo "Phases:"
  echo "  baseline      Show active findings"
  echo "  scenario      Describe built-in workshop scenario"
  echo "  exploit       S3 exfiltration demo (AWS)"
  echo "  public-api    Unauthenticated API Gateway demo (AWS)"
  echo "  scan-cve      Scan chat-rag for CVE-2023-50447"
  echo "  exploit-live  Run local PoCs (Pillow RCE, path traversal)"
  echo "  local-abuse   POST /reindex without auth"
  echo "  full          baseline + scan-cve + exploit-live"
  echo ""
  echo "Legacy alias: activate → scenario"
}

case "${1:-}" in
  baseline)     phase_baseline ;;
  scenario|activate) phase_scenario ;;
  exploit)      phase_exploit ;;
  public-api)   phase_public_api ;;
  scan-cve)     phase_scan_cve ;;
  exploit-live) phase_exploit_live ;;
  local-abuse)  phase_local_abuse ;;
  full)         phase_full ;;
  *)            usage; exit 1 ;;
esac
