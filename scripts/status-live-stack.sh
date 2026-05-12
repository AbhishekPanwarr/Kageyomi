#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
BLINDFERENCE_ROOT="${REPO_ROOT}/blindference/wave2_network"
PID_FILE="${SCRIPT_DIR}/pids/agent.pid"

echo "Kageyomi agent health:"
curl -s http://127.0.0.1:8001/health || true
echo
echo

if [[ -f "${PID_FILE}" ]]; then
  pid="$(cat "${PID_FILE}")"
  if [[ -n "${pid}" ]] && kill -0 "${pid}" >/dev/null 2>&1; then
    echo "Kageyomi agent: running (pid ${pid})"
  else
    echo "Kageyomi agent: not running"
  fi
else
  echo "Kageyomi agent: not running"
fi

echo
bash "${BLINDFERENCE_ROOT}/scripts/demo/status.sh"
