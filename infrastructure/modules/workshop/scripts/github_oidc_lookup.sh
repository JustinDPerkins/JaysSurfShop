#!/usr/bin/env bash
# Returns whether to create the GitHub OIDC provider in the current AWS account.
set -euo pipefail

account="$(aws sts get-caller-identity --query Account --output text 2>/dev/null || true)"
if [[ -z "${account}" ]]; then
  printf '{"create":"true","arn":""}\n'
  exit 0
fi

arn="arn:aws:iam::${account}:oidc-provider/token.actions.githubusercontent.com"
if aws iam get-open-id-connect-provider --open-id-connect-provider-arn "${arn}" >/dev/null 2>&1; then
  printf '{"create":"false","arn":"%s"}\n' "${arn}"
else
  printf '{"create":"true","arn":""}\n'
fi
