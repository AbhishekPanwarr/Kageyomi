#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
KAGEYOMI_ROOT="${REPO_ROOT}/Kageyomi"
BLINDFERENCE_ROOT="${REPO_ROOT}/blindference/wave2_network"
AGENT_DIR="${KAGEYOMI_ROOT}/apps/agent-py"
ICL_ENV="${BLINDFERENCE_ROOT}/packages/icl/.env"
KAGEYOMI_ENV="${KAGEYOMI_ROOT}/.env"
AGENT_ENV="${AGENT_DIR}/.env"
LOG_DIR="${SCRIPT_DIR}/logs"
PID_DIR="${SCRIPT_DIR}/pids"

mkdir -p "${LOG_DIR}" "${PID_DIR}"

stop_if_running() {
  local pid_file="$1"
  if [[ -f "${pid_file}" ]]; then
    local pid
    pid="$(cat "${pid_file}")"
    if [[ -n "${pid}" ]] && kill -0 "${pid}" >/dev/null 2>&1; then
      kill "${pid}" >/dev/null 2>&1 || true
    fi
    rm -f "${pid_file}"
  fi
}

stop_if_running "${PID_DIR}/agent.pid"

if [[ ! -f "${ICL_ENV}" ]]; then
  echo "Missing ${ICL_ENV}" >&2
  exit 1
fi

set -a
source "${ICL_ENV}"
if [[ -f "${KAGEYOMI_ENV}" ]]; then
  source "${KAGEYOMI_ENV}"
fi
if [[ -f "${AGENT_ENV}" ]]; then
  source "${AGENT_ENV}"
fi
set +a

UVICORN_BIN="${AGENT_DIR}/.venv/bin/uvicorn"
if [[ ! -x "${UVICORN_BIN}" ]]; then
  UVICORN_BIN="$(command -v uvicorn || true)"
fi

if [[ -z "${UVICORN_BIN}" ]]; then
  echo "uvicorn not found. Create ${AGENT_DIR}/.venv or install uvicorn first." >&2
  exit 1
fi

echo "Starting Kageyomi agent bridge on http://127.0.0.1:8001 ..."
(
  cd "${AGENT_DIR}"
  nohup "${UVICORN_BIN}" server:app --host 127.0.0.1 --port 8001 >"${LOG_DIR}/agent.log" 2>&1 &
  echo $! >"${PID_DIR}/agent.pid"
)

for _ in {1..30}; do
  if curl -sf http://127.0.0.1:8001/health >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

if ! curl -sf http://127.0.0.1:8001/health >/dev/null 2>&1; then
  echo "Kageyomi agent bridge did not become healthy. Check ${LOG_DIR}/agent.log" >&2
  exit 1
fi

export VITE_KAGEYOMI_AGENT_MODE=true
export BLINDFERENCE_NODE_AGENT_SERVICE_URL="http://127.0.0.1:8001"
export VITE_CHAIN_RPC_URL="${ARBITRUM_SEPOLIA_RPC:-https://sepolia-rollup.arbitrum.io/rpc}"
export VITE_COFHE_RPC_URL="${VITE_CHAIN_RPC_URL}"

echo "Starting Blindference quorum stack in Kageyomi mode ..."
bash "${BLINDFERENCE_ROOT}/scripts/demo/run-stack.sh"

echo
echo "Kageyomi live stack started."
echo "Frontend: http://127.0.0.1:3000"
echo "ICL:      http://127.0.0.1:8000"
echo "Agent:    http://127.0.0.1:8001"
echo "Logs:     ${LOG_DIR} and ${BLINDFERENCE_ROOT}/scripts/demo/logs"
