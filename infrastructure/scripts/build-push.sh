#!/usr/bin/env bash
set -euo pipefail

AWS_REGION="${AWS_REGION:-us-east-1}"
AWS_ACCOUNT_ID="${AWS_ACCOUNT_ID:-$(aws sts get-caller-identity --query Account --output text)}"
PROJECT_NAME="${PROJECT_NAME:-jays-surf-shop}"
ENVIRONMENT="${ENVIRONMENT:-demo}"
IMAGE_TAG="${IMAGE_TAG:-latest}"
ECR_PREFIX="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${PROJECT_NAME}-${ENVIRONMENT}"

echo "==> Logging into ECR..."
aws ecr get-login-password --region "$AWS_REGION" | \
  docker login --username AWS --password-stdin "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"

build_and_push() {
  local service="$1"
  local context="$2"
  local repo="${ECR_PREFIX}/${service}"

  echo "==> Building ${service}..."
  docker build -t "${repo}:${IMAGE_TAG}" -t "${repo}:latest" "$context"

  echo "==> Pushing ${service}..."
  docker push "${repo}:${IMAGE_TAG}"
  docker push "${repo}:latest"
}

build_and_push "frontend" "${ROOT_DIR}/frontend"
build_and_push "chat-rag" "${ROOT_DIR}/services/chat-rag"
build_and_push "board-generator" "${ROOT_DIR}/services/board-generator"

echo "==> Done. Images pushed with tag: ${IMAGE_TAG}"
