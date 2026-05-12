import { config as loadEnv } from 'dotenv'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  createPublicClient,
  createWalletClient,
  defineChain,
  http,
  type Address,
} from 'viem'
import { privateKeyToAccount } from 'viem/accounts'

loadEnv({ path: path.resolve(process.cwd(), '..', '..', '.env') })
loadEnv({ path: path.resolve(process.cwd(), '.env') })

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const contractRoot = path.resolve(__dirname, '..')

async function main() {
  const rpcUrl = process.env.FHENIX_RPC_URL || process.env.ARBITRUM_SEPOLIA_RPC || process.env.ARB_SEPOLIA_RPC
  const privateKey = process.env.PRIVATE_KEY || process.env.ICL_PRIVATE_KEY

  if (!rpcUrl) {
    throw new Error('Missing FHENIX_RPC_URL or compatible RPC env var')
  }
  if (!privateKey) {
    throw new Error('Missing PRIVATE_KEY or ICL_PRIVATE_KEY')
  }

  const account = privateKeyToAccount(normalizeHex(privateKey))
  const bootstrapClient = createPublicClient({ transport: http(rpcUrl) })
  const chainId = await bootstrapClient.getChainId()
  const chain = defineChain({
    id: chainId,
    name: `rpc-${chainId}`,
    nativeCurrency: {
      name: "Ether",
      symbol: "ETH",
      decimals: 18,
    },
    rpcUrls: {
      default: {
        http: [rpcUrl],
      },
    },
  })
  const publicClient = createPublicClient({ chain, transport: http(rpcUrl) })
  const walletClient = createWalletClient({ account, chain, transport: http(rpcUrl) })
  const extensionAddress = await deployContract(
    "PrivateInferenceExtension",
    [account.address],
    walletClient,
    publicClient,
  )
  const disputeRegistryAddress = await deployContract(
    "DisputeRegistry",
    [account.address],
    walletClient,
    publicClient,
  )
  const oracleAdapterAddress = await deployContract(
    "OracleAdapter",
    [account.address],
    walletClient,
    publicClient,
  )

  process.stdout.write(`✅ PrivateInferenceExtension deployed to: ${extensionAddress}\n`)
  process.stdout.write(`✅ DisputeRegistry (mock) deployed to: ${disputeRegistryAddress}\n`)
  process.stdout.write(`✅ OracleAdapter (mock) deployed to: ${oracleAdapterAddress}\n`)
  process.stdout.write(`\n=== ADD TO .env ===\n`)
  process.stdout.write(`KAGEYOMI_EXTENSION_CONTRACT_ADDRESS=${extensionAddress}\n`)
  process.stdout.write(`DISPUTE_REGISTRY_ADDRESS=${disputeRegistryAddress}\n`)
  process.stdout.write(`ORACLE_ADAPTER_ADDRESS=${oracleAdapterAddress}\n`)
  process.stdout.write(`====================\n`)
}

async function deployContract(
  contractName: string,
  args: readonly unknown[],
  walletClient: ReturnType<typeof createWalletClient>,
  publicClient: ReturnType<typeof createPublicClient>,
): Promise<Address> {
  const artifactPath = path.join(contractRoot, "out", `${contractName}.sol`, `${contractName}.json`)
  const artifact = JSON.parse(await readFile(artifactPath, "utf8")) as {
    abi: unknown
    bytecode?: { object?: string }
  }
  const bytecode = artifact.bytecode?.object
  if (!bytecode) {
    throw new Error(`Missing bytecode in artifact: ${artifactPath}`)
  }

  const hash = await walletClient.deployContract({
    abi: artifact.abi,
    bytecode: normalizeHex(bytecode),
    args,
    account: walletClient.account!,
    chain: walletClient.chain,
  })

  const receipt = await publicClient.waitForTransactionReceipt({ hash })
  const deployedAddress = receipt.contractAddress as Address | null
  if (!deployedAddress) {
    throw new Error(`${contractName} deployment receipt did not include a contractAddress`)
  }

  return deployedAddress
}

function normalizeHex(value: string): `0x${string}` {
  return (value.startsWith('0x') ? value : `0x${value}`) as `0x${string}`
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack || error.message : String(error)}\n`)
  process.exitCode = 1
})
