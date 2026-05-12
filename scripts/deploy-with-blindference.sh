#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
KAGEYOMI_ROOT="${REPO_ROOT}/Kageyomi"
BLINDFERENCE_ROOT="${REPO_ROOT}/blindference/wave2_network"
BF_CONTRACTS_DIR="${BLINDFERENCE_ROOT}/packages/contracts"
KAGEYOMI_CONTRACTS_DIR="${KAGEYOMI_ROOT}/contracts/kageyomi"
BF_CONTRACTS_ENV="${BF_CONTRACTS_DIR}/.env"

if [[ ! -f "${BF_CONTRACTS_ENV}" ]]; then
  echo "Missing ${BF_CONTRACTS_ENV}" >&2
  exit 1
fi

set -a
source "${BF_CONTRACTS_ENV}"
set +a

RPC_URL="${ARBITRUM_SEPOLIA_RPC_URL:-${ARBITRUM_SEPOLIA_RPC:-}}"
if [[ -z "${RPC_URL}" ]]; then
  echo "Missing ARBITRUM_SEPOLIA_RPC_URL or ARBITRUM_SEPOLIA_RPC in ${BF_CONTRACTS_ENV}" >&2
  exit 1
fi

if [[ -z "${PRIVATE_KEY:-}" ]]; then
  echo "Missing PRIVATE_KEY in ${BF_CONTRACTS_ENV}" >&2
  exit 1
fi

tmp_dir="$(mktemp -d)"
trap 'rm -rf "${tmp_dir}"' EXIT
blindference_log="${tmp_dir}/blindference-deploy.log"
kageyomi_log="${tmp_dir}/kageyomi-deploy.log"

echo "Deploying Blindference core contracts from ${BF_CONTRACTS_DIR} ..."
(
  cd "${BF_CONTRACTS_DIR}"
  forge build >/dev/null
  forge script script/Deploy.s.sol:DeployScript --rpc-url "${RPC_URL}" --broadcast
) | tee "${blindference_log}"

export FHENIX_RPC_URL="${FHENIX_RPC_URL:-${RPC_URL}}"
export ARBITRUM_SEPOLIA_RPC="${ARBITRUM_SEPOLIA_RPC:-${RPC_URL}}"
export ICL_PRIVATE_KEY="${ICL_PRIVATE_KEY:-${PRIVATE_KEY}}"

echo
echo "Deploying Kageyomi UAVP extension contracts from ${KAGEYOMI_CONTRACTS_DIR} ..."
(
  cd "${KAGEYOMI_CONTRACTS_DIR}"
  forge build >/dev/null
  npm run deploy
) | tee "${kageyomi_log}"

python3 - "${blindference_log}" "${kageyomi_log}" "${REPO_ROOT}" <<'PY'
from pathlib import Path
import re
import sys

blindference_log = Path(sys.argv[1]).read_text()
kageyomi_log = Path(sys.argv[2]).read_text()
repo_root = Path(sys.argv[3])

patterns = {
    "NODE_ATTESTATION_REGISTRY_ADDRESS": r"NODE_ATTESTATION_REGISTRY_ADDRESS=\s*(0x[a-fA-F0-9]{40})",
    "EXECUTION_COMMITMENT_REGISTRY_ADDRESS": r"EXECUTION_COMMITMENT_REGISTRY_ADDRESS=\s*(0x[a-fA-F0-9]{40})",
    "PROMPT_KEY_STORE_ADDRESS": r"PROMPT_KEY_STORE_ADDRESS=\s*(0x[a-fA-F0-9]{40})",
    "AGENT_CONFIG_REGISTRY_ADDRESS": r"AGENT_CONFIG_REGISTRY_ADDRESS=\s*(0x[a-fA-F0-9]{40})",
    "REPUTATION_REGISTRY_ADDRESS": r"REPUTATION_REGISTRY_ADDRESS=\s*(0x[a-fA-F0-9]{40})",
    "REWARD_ACCUMULATOR_ADDRESS": r"REWARD_ACCUMULATOR_ADDRESS=\s*(0x[a-fA-F0-9]{40})",
    "KAGEYOMI_EXTENSION_CONTRACT_ADDRESS": r"KAGEYOMI_EXTENSION_CONTRACT_ADDRESS=(0x[a-fA-F0-9]{40})",
    "DISPUTE_REGISTRY_ADDRESS": r"DISPUTE_REGISTRY_ADDRESS=(0x[a-fA-F0-9]{40})",
    "ORACLE_ADAPTER_ADDRESS": r"ORACLE_ADAPTER_ADDRESS=(0x[a-fA-F0-9]{40})",
}

values: dict[str, str] = {}
for key, pattern in patterns.items():
    text = kageyomi_log if key.startswith(("KAGEYOMI_", "DISPUTE_", "ORACLE_")) else blindference_log
    match = re.search(pattern, text)
    if match:
        values[key] = match.group(1)

if not values:
    raise SystemExit("Failed to parse any deployment addresses from deploy logs")

targets = [
    repo_root / "blindference/wave2_network/packages/icl/.env",
    repo_root / "blindference/wave2_network/packages/frontend/.env",
    repo_root / "Kageyomi/.env",
    repo_root / "Kageyomi/frontend/.env.local",
]

frontend_key_map = {
    "PROMPT_KEY_STORE_ADDRESS": "VITE_PROMPT_KEY_STORE_ADDRESS",
    "KAGEYOMI_EXTENSION_CONTRACT_ADDRESS": "VITE_KAGEYOMI_EXTENSION_CONTRACT_ADDRESS",
}
web_key_map = {
    "KAGEYOMI_EXTENSION_CONTRACT_ADDRESS": "NEXT_PUBLIC_KAGEYOMI_EXTENSION_CONTRACT_ADDRESS",
    "DISPUTE_REGISTRY_ADDRESS": "NEXT_PUBLIC_DISPUTE_REGISTRY_ADDRESS",
    "ORACLE_ADAPTER_ADDRESS": "NEXT_PUBLIC_ORACLE_ADAPTER_ADDRESS",
}

def upsert_env(path: Path, assignments: dict[str, str]) -> None:
    existing = []
    if path.exists():
        existing = path.read_text().splitlines()
    keys = set(assignments)
    new_lines = []
    seen = set()
    for line in existing:
        if "=" not in line or line.lstrip().startswith("#"):
            new_lines.append(line)
            continue
        key = line.split("=", 1)[0]
        if key in assignments:
            new_lines.append(f"{key}={assignments[key]}")
            seen.add(key)
        else:
            new_lines.append(line)
    for key, value in assignments.items():
        if key not in seen:
            new_lines.append(f"{key}={value}")
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text("\n".join(new_lines).rstrip() + "\n")

for target in targets:
    assignments = dict(values)
    if target.name == ".env":
        if "frontend" in target.parts:
            assignments = {frontend_key_map[k]: v for k, v in values.items() if k in frontend_key_map}
            assignments["VITE_KAGEYOMI_AGENT_MODE"] = "true"
            if "PROMPT_KEY_STORE_ADDRESS" in values:
                assignments["VITE_PROMPT_KEY_STORE_ADDRESS"] = values["PROMPT_KEY_STORE_ADDRESS"]
        elif "icl" in target.parts:
            pass
    if target.name == ".env.local":
        assignments = {web_key_map[k]: v for k, v in values.items() if k in web_key_map}
        assignments["NEXT_PUBLIC_ICL_API_URL"] = "http://127.0.0.1:8000"
    upsert_env(target, assignments)

print("Synced deployment addresses into runtime env files:")
for target in targets:
    print(f"- {target}")
for key, value in values.items():
    print(f"{key}={value}")
PY

echo
echo "Deployment complete."
echo "Blindference core contracts were deployed from: ${BF_CONTRACTS_DIR}"
echo "Kageyomi UAVP contracts were deployed from:    ${KAGEYOMI_CONTRACTS_DIR}"
