#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
KAGEYOMI_ROOT="${REPO_ROOT}/Kageyomi"
BLINDFERENCE_ROOT="${REPO_ROOT}/blindference/wave2_network"
AGENT_DIR="${KAGEYOMI_ROOT}"
FRONTEND_DIR="${KAGEYOMI_ROOT}/frontend"
ICL_ENV="${BLINDFERENCE_ROOT}/packages/icl/.env"
KAGEYOMI_ENV="${KAGEYOMI_ROOT}/.env"
AGENT_ENV="${AGENT_DIR}/.env"
FRONTEND_ENV="${FRONTEND_DIR}/.env"
LOG_DIR="${SCRIPT_DIR}/logs"
PID_DIR="${SCRIPT_DIR}/pids"

mkdir -p "${LOG_DIR}" "${PID_DIR}"

sync_frontend_env() {
  local env_file="$1"
  cat >"${env_file}" <<EOF
VITE_ICL_API_URL=${VITE_ICL_API_URL:-http://127.0.0.1:8000}
VITE_ICL_BASE_URL=${VITE_ICL_BASE_URL:-http://127.0.0.1:8000}
VITE_CHAIN_RPC_URL=${VITE_CHAIN_RPC_URL:-${ARBITRUM_SEPOLIA_RPC:-https://sepolia-rollup.arbitrum.io/rpc}}
VITE_COFHE_RPC_URL=${VITE_COFHE_RPC_URL:-${VITE_CHAIN_RPC_URL:-${ARBITRUM_SEPOLIA_RPC:-https://sepolia-rollup.arbitrum.io/rpc}}}
VITE_COFHE_URL=${VITE_COFHE_URL:-https://testnet-cofhe.fhenix.zone}
VITE_COFHE_VERIFIER_URL=${VITE_COFHE_VERIFIER_URL:-https://testnet-cofhe-vrf.fhenix.zone}
VITE_COFHE_THRESHOLD_URL=${VITE_COFHE_THRESHOLD_URL:-https://testnet-cofhe-tn.fhenix.zone}
VITE_COFHE_DISABLE_PERSISTED_KEYS=${VITE_COFHE_DISABLE_PERSISTED_KEYS:-true}
VITE_CHAIN_ID=${VITE_CHAIN_ID:-421614}
VITE_WALLET_CONNECT_PROJECT_ID=${VITE_WALLET_CONNECT_PROJECT_ID:-}
VITE_BLINDFERENCE_AGENT_ADDRESS=${VITE_BLINDFERENCE_AGENT_ADDRESS:-${EXECUTION_COMMITMENT_REGISTRY_ADDRESS:-}}
VITE_BLINDFERENCE_INPUT_VAULT_ADDRESS=${VITE_BLINDFERENCE_INPUT_VAULT_ADDRESS:-${BLINDFERENCE_INPUT_VAULT_ADDRESS:-${INPUT_VAULT_ADDRESS:-0x8dD7B2A9B69C76A69d33B2DF46426Cbe657a902b}}}
VITE_PROMPT_KEY_STORE_ADDRESS=${VITE_PROMPT_KEY_STORE_ADDRESS:-${PROMPT_KEY_STORE_ADDRESS:-}}
VITE_KAGEYOMI_EXTENSION_CONTRACT_ADDRESS=${VITE_KAGEYOMI_EXTENSION_CONTRACT_ADDRESS:-${KAGEYOMI_EXTENSION_CONTRACT_ADDRESS:-}}
VITE_TEXT_MODEL_DEFAULT=${VITE_TEXT_MODEL_DEFAULT:-groq:llama-3.3-70b-versatile}
VITE_PROMPT_UPLOAD_TIMEOUT_MS=${VITE_PROMPT_UPLOAD_TIMEOUT_MS:-60000}
VITE_IPFS_GATEWAY_URL=${VITE_IPFS_GATEWAY_URL:-${PINATA_GATEWAY_URL:-https://gateway.pinata.cloud/ipfs}}
VITE_KAGEYOMI_AGENT_MODE=true
EOF
}

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
stop_if_running "${PID_DIR}/frontend.pid"

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
if [[ -f "${FRONTEND_DIR}/.env" ]]; then
  source "${FRONTEND_DIR}/.env"
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
  nohup "${UVICORN_BIN}" main:app --host 127.0.0.1 --port 8001 >"${LOG_DIR}/agent.log" 2>&1 &
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

sync_frontend_env "${FRONTEND_ENV}"

# Run the Blindference quorum stack but tell its frontend to use port 3002
# so that the Kageyomi frontend can own port 3000 without a race.
echo "Starting Blindference quorum stack in Kageyomi mode ..."
VITE_PORT=3002 bash "${BLINDFERENCE_ROOT}/scripts/demo/run-stack.sh"

echo "Stopping shared Blindference frontend ..."
bash "${BLINDFERENCE_ROOT}/scripts/demo/stop.sh" frontend > /dev/null 2>&1 || true

# Belt-and-suspenders: kill anything still on port 3000 before Kageyomi binds.
for _try in {1..20}; do
  PORT_PID=$(ss -tlnp 2>/dev/null | awk '/:3000 /{match($0,"pid=([0-9]+)",a); print a[1]}')
  [[ -z "${PORT_PID}" ]] && break
  echo "Port 3000 held by PID ${PORT_PID}, killing..."
  kill "${PORT_PID}" > /dev/null 2>&1 || true
  sleep 0.4
done

# Force-free port 3000 — the Blindference frontend may not exit via PID file
# alone. Kill anything still holding the port before Kageyomi claims it.
for _try in {1..30}; do
  PORT_PID=$(ss -tlnp 2>/dev/null | awk '/:3000 /{match($0,"pid=([0-9]+)",a); print a[1]}')
  if [[ -z "${PORT_PID}" ]]; then
    break
  fi
  echo "Port 3000 held by PID ${PORT_PID}, killing..."
  kill "${PORT_PID}" > /dev/null 2>&1 || true
  sleep 0.5
done

echo "Starting Kageyomi frontend on http://127.0.0.1:3000 ..."
(
  cd "${FRONTEND_DIR}"
  nohup npm run dev -- --force > "${LOG_DIR}/frontend.log" 2>&1 &
  echo $! > "${PID_DIR}/frontend.pid"
)

for _ in {1..40}; do
  if curl -sf http://127.0.0.1:3000 > /dev/null 2>&1; then
    break
  fi
  sleep 1
done

if ! curl -sf http://127.0.0.1:3000 > /dev/null 2>&1; then
  echo "Kageyomi frontend did not become healthy. Check ${LOG_DIR}/frontend.log" >&2
  exit 1
fi

echo
echo "Kageyomi live stack started."
echo "Frontend: http://127.0.0.1:3000"
echo "ICL:      http://127.0.0.1:8000"
echo "Agent:    http://127.0.0.1:8001"
echo "Logs:     ${LOG_DIR} and ${BLINDFERENCE_ROOT}/scripts/demo/logs"
