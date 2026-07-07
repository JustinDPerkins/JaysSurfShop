#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
TERRAFORM_DIR="${SCRIPT_DIR}/../terraform"

cd "$TERRAFORM_DIR"

if [ ! -f terraform.tfvars ]; then
  echo "ERROR: Create terraform.tfvars from terraform.tfvars.example"
  exit 1
fi

if [ -z "${TF_VAR_openai_api_key:-}" ]; then
  echo "WARNING: TF_VAR_openai_api_key not set"
fi

echo "==> Terraform init..."
terraform init

echo "==> Terraform plan..."
terraform plan -out=tfplan

echo "==> Terraform apply..."
terraform apply tfplan

echo ""
echo "==> Deployment complete!"
terraform output application_url
terraform output order_webhook_url
echo "Security dashboard: $(terraform output -raw application_url)/security"
echo "Checkout webhook: $(terraform output -raw order_checkout_url)"
