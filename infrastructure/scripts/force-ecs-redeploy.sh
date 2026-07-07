#!/usr/bin/env bash
# Restart ECS services after a new image push (GitHub Actions does not do this automatically).
set -euo pipefail

AWS_REGION="${AWS_REGION:-us-east-1}"
CLUSTER="${CLUSTER:-jays-surf-shop-demo-cluster}"
NAME_PREFIX="${NAME_PREFIX:-jays-surf-shop-demo}"

SERVICES=(
  "${NAME_PREFIX}-frontend"
  "${NAME_PREFIX}-chat-rag"
  "${NAME_PREFIX}-board-generator"
)

for svc in "${SERVICES[@]}"; do
  echo "==> Force new deployment: ${svc}"
  aws ecs update-service \
    --cluster "$CLUSTER" \
    --service "$svc" \
    --force-new-deployment \
    --region "$AWS_REGION" \
    --query 'service.{service:serviceName,status:status,running:runningCount,desired:desiredCount}' \
    --output table
done

echo ""
echo "Done. Services will roll out new tasks over the next few minutes."
