#!/usr/bin/env bash
# Package order-webhook Lambda with vulnerable PyYAML for terraform archive_file.
set -euo pipefail

DIR="$(cd "$(dirname "$0")" && pwd)"
PACKAGE_DIR="${DIR}/package"

rm -rf "${PACKAGE_DIR}"
mkdir -p "${PACKAGE_DIR}"

python3 -m pip install -r "${DIR}/requirements.txt" -t "${PACKAGE_DIR}" --quiet --upgrade
cp "${DIR}/handler.py" "${DIR}/workshop_chain.py" "${PACKAGE_DIR}/"

echo "Lambda package ready: ${PACKAGE_DIR}"
