/**
 * Shared server-side helpers for connecting to the AgentRegistry contract.
 * Used by all API routes — runs only on the server (Node.js).
 */
import { ethers } from 'ethers'
import path from 'path'
import fs from 'fs'

// ── ABI (canonical JSON format, no duplicates) ────────────────────────────
const FULL_ABI = [
  {
    name: 'registerAgent', type: 'function', stateMutability: 'nonpayable',
    inputs: [
      { name: 'agentAddress',   type: 'address' },
      { name: 'name',           type: 'string'  },
      { name: 'version',        type: 'string'  },
      { name: 'metadataURI',    type: 'string'  },
      { name: 'capabilityHash', type: 'bytes32' },
      { name: 'riskLevel',      type: 'uint8'   },
      { name: 'category',       type: 'uint8'   },
    ],
    outputs: [],
  },
  {
    name: 'logAction', type: 'function', stateMutability: 'nonpayable',
    inputs: [
      { name: 'actionType',  type: 'string'  },
      { name: 'inputHash',   type: 'bytes32' },
      { name: 'outputHash',  type: 'bytes32' },
      { name: 'success',     type: 'bool'    },
    ],
    outputs: [],
  },
  {
    name: 'flagAnomaly', type: 'function', stateMutability: 'nonpayable',
    inputs: [
      { name: 'agentAddress', type: 'address' },
      { name: 'reason',       type: 'string'  },
      { name: 'severity',     type: 'uint8'   },
    ],
    outputs: [],
  },
  {
    name: 'getAgent', type: 'function', stateMutability: 'view',
    inputs: [{ name: 'agentAddress', type: 'address' }],
    outputs: [{
      type: 'tuple',
      components: [
        { name: 'name',           type: 'string'  },
        { name: 'version',        type: 'string'  },
        { name: 'owner',          type: 'address' },
        { name: 'registeredAt',   type: 'uint256' },
        { name: 'active',         type: 'bool'    },
        { name: 'metadataURI',    type: 'string'  },
        { name: 'actionCount',    type: 'uint256' },
        { name: 'capabilityHash', type: 'bytes32' },
        { name: 'riskLevel',      type: 'uint8'   },
        { name: 'category',       type: 'uint8'   },
        { name: 'anomalyCount',   type: 'uint256' },
      ],
    }],
  },
  {
    name: 'isRegistered', type: 'function', stateMutability: 'view',
    inputs: [{ name: '', type: 'address' }],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'deactivateAgent', type: 'function', stateMutability: 'nonpayable',
    inputs: [{ name: 'agentAddress', type: 'address' }],
    outputs: [],
  },
  {
    name: 'ActionLogged', type: 'event',
    inputs: [
      { name: 'agentAddress', type: 'address', indexed: true  },
      { name: 'actionIndex',  type: 'uint256', indexed: true  },
      { name: 'actionType',   type: 'string',  indexed: false },
      { name: 'inputHash',    type: 'bytes32', indexed: false },
      { name: 'outputHash',   type: 'bytes32', indexed: false },
      { name: 'success',      type: 'bool',    indexed: false },
      { name: 'timestamp',    type: 'uint256', indexed: false },
    ],
  },
  {
    name: 'AgentRegistered', type: 'event',
    inputs: [
      { name: 'agentAddress',   type: 'address', indexed: true  },
      { name: 'name',           type: 'string',  indexed: false },
      { name: 'version',        type: 'string',  indexed: false },
      { name: 'owner',          type: 'address', indexed: true  },
      { name: 'timestamp',      type: 'uint256', indexed: false },
      { name: 'metadataURI',    type: 'string',  indexed: false },
      { name: 'capabilityHash', type: 'bytes32', indexed: false },
      { name: 'riskLevel',      type: 'uint8',   indexed: false },
      { name: 'category',       type: 'uint8',   indexed: false },
    ],
  },
  {
    name: 'AnomalyFlagged', type: 'event',
    inputs: [
      { name: 'agentAddress', type: 'address', indexed: true  },
      { name: 'reporter',     type: 'address', indexed: true  },
      { name: 'reason',       type: 'string',  indexed: false },
      { name: 'severity',     type: 'uint8',   indexed: false },
      { name: 'timestamp',    type: 'uint256', indexed: false },
    ],
  },
  {
    name: 'AgentDeactivated', type: 'event',
    inputs: [
      { name: 'agentAddress', type: 'address', indexed: true  },
      { name: 'timestamp',    type: 'uint256', indexed: false },
    ],
  },
]

// ── Deployment config ──────────────────────────────────────────────────────
function loadDeployment(): { address: string } | null {
  const candidates = [
    path.join(process.cwd(), '..', 'deployment.json'),
    path.join(process.cwd(), 'deployment.json'),
  ]
  for (const p of candidates) {
    if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, 'utf-8'))
  }
  return null
}

// ── Provider / Wallet helpers ─────────────────────────────────────────────
const RPC_URL = process.env.RPC_URL ?? 'http://127.0.0.1:8545'

export function getProvider() {
  return new ethers.JsonRpcProvider(RPC_URL)
}

export function getRegistryAddress(): string {
  // 1. env var (Firebase / production)
  if (process.env.CONTRACT_ADDRESS) return process.env.CONTRACT_ADDRESS
  // 2. deployment.json (local dev)
  const dep = loadDeployment()
  if (dep) return dep.address
  throw new Error('CONTRACT_ADDRESS not set and deployment.json not found')
}

export function getRegistry(signerOrProvider?: ethers.Signer | ethers.Provider) {
  const address = getRegistryAddress()
  return new ethers.Contract(address, FULL_ABI, signerOrProvider ?? getProvider())
}

export function getAgentWallet(): ethers.Wallet {
  const pk = process.env.AGENT_PRIVATE_KEY
  if (!pk) throw new Error('AGENT_PRIVATE_KEY not set in .env')
  return new ethers.Wallet(pk, getProvider())
}

export async function getOperatorWallet(): Promise<ethers.Signer> {
  const provider = getProvider()
  try {
    const accounts = await provider.send('eth_accounts', [])
    if (accounts.length > 0) {
      return await provider.getSigner(accounts[0])
    }
  } catch {}
  const pk = process.env.DEPLOYER_PRIVATE_KEY
  if (pk) return new ethers.Wallet(pk, provider)
  throw new Error('No operator wallet available')
}
