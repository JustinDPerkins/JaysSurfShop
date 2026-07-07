#!/usr/bin/env bash
# Deploy to AWS — defaults to ECS. Use deploy-ecs.sh or deploy-eks.sh explicitly.
set -euo pipefail
exec "$(dirname "$0")/deploy-ecs.sh" "$@"
