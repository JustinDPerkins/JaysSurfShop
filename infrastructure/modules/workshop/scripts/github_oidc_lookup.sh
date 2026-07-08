#!/usr/bin/env bash
# Returns whether to create the GitHub OIDC provider or reuse an existing one.
set -euo pipefail

arn="$(aws iam list-open-id-connect-providers \
  --output text \
  --query "OpenIDConnectProviderList[?contains(Arn, 'token.actions.githubusercontent.com')].Arn" \
  2>/dev/null | head -1 || true)"

if [[ -n "${arn}" ]]; then
  printf '{"create":"false","arn":"%s"}\n' "${arn}"
else
  printf '{"create":"true","arn":""}\n'
fi
