#!/usr/bin/env bash
# Destroy the legacy flat terraform stack, then deploy from infrastructure/ecs/terraform/
#
# Use this when migrating from infrastructure/terraform/ to the new ecs/ layout.
# Recommended over state migration — clean state, no address churn.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
OLD_DIR="${SCRIPT_DIR}/../terraform"
NEW_DIR="${SCRIPT_DIR}/../ecs/terraform"

echo "==> Step 1: Restore legacy .tf files from git (if needed) and destroy"
cd "$OLD_DIR"

if [ ! -f versions.tf ]; then
  echo "Restoring legacy terraform config from git..."
  git -C "${SCRIPT_DIR}/../.." checkout HEAD -- infrastructure/terraform/*.tf infrastructure/terraform/terraform.tfvars.example
fi

if [ -f terraform.tfstate ] && [ -s terraform.tfstate ]; then
  terraform init -input=false
  echo ""
  echo "WARNING: This will destroy all AWS resources in the legacy stack."
  echo "Press Ctrl+C within 10 seconds to abort..."
  sleep 10
  terraform destroy -auto-approve
  echo "Legacy stack destroyed."
else
  echo "No legacy state — skipping destroy"
fi

# Remove restored .tf files, keep README
rm -f "${OLD_DIR}"/*.tf "${OLD_DIR}"/terraform.tfvars.example "${OLD_DIR}"/terraform.tfstate* "${OLD_DIR}"/tfplan 2>/dev/null || true

echo ""
echo "==> Step 2: Clean ECS terraform state (fresh deploy)"
rm -f "${NEW_DIR}/terraform.tfstate" "${NEW_DIR}/terraform.tfstate.backup" "${NEW_DIR}/tfplan"

echo ""
echo "==> Step 3: Deploy from infrastructure/ecs/terraform/"
exec "${SCRIPT_DIR}/deploy-ecs.sh"
