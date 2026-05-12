#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
BLINDFERENCE_ROOT="${REPO_ROOT}/blindference/wave2_network"
PID_FILE="${SCRIPT_DIR}/pids/agent.pid"

bash "${BLINDFERENCE_ROOT}/scripts/demo/stop.sh" all >/dev/null 2>&1 || true

if [[ -f "${PID_FILE}" ]]; then
  pid="$(cat "${PID_FILE}")"
  if [[ -n "${pid}" ]] && kill -0 "${pid}" >/dev/null 2>&1; then
    kill "${pid}" >/dev/null 2>&1 || true
  fi
  rm -f "${PID_FILE}"
fi

pkill -f 'uvicorn server:app --host 127.0.0.1 --port 8001' >/dev/null 2>&1 || true

echo "Kageyomi live stack stopped."
