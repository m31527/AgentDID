import { NextRequest, NextResponse } from 'next/server'
import { ethers } from 'ethers'
import { getRegistry, getAgentWallet, getOperatorWallet } from '@/lib/chain'

// RiskLevel enum values (must match AgentRegistry.sol)
const RISK_LEVEL: Record<string, number> = {
  LOW: 0, MEDIUM: 1, HIGH: 2, CRITICAL: 3,
}

// AgentCategory enum values (must match AgentRegistry.sol)
const AGENT_CATEGORY: Record<string, number> = {
  GENERAL: 0, RESEARCH: 1, FINANCE: 2, MEDICAL: 3,
  LEGAL: 4, INFRASTRUCTURE: 5, SOCIAL: 6,
}

export async function POST(req: NextRequest) {
  try {
    const { name, version, metadataURI, purpose, riskLevel, category, allowedActionTypes } =
      await req.json() as {
        name: string
        version?: string
        metadataURI?: string
        purpose?: string
        riskLevel?: string
        category?: string
        allowedActionTypes?: string[]
      }

    if (!name?.trim()) {
      return NextResponse.json({ ok: false, error: 'name is required' }, { status: 400 })
    }

    const agentWallet = getAgentWallet()
    const provider    = agentWallet.provider!

    // Check if already registered
    const readRegistry = getRegistry()
    const alreadyReg   = await readRegistry.isRegistered(agentWallet.address)
    if (alreadyReg) {
      return NextResponse.json({ ok: false, error: 'Agent already registered' }, { status: 400 })
    }

    // Fund the agent if it has no ETH (Hardhat local node only)
    const balance = await provider.getBalance(agentWallet.address)
    if (balance === 0n) {
      try {
        const operator = await getOperatorWallet()
        const fundTx = await operator.sendTransaction({
          to: agentWallet.address,
          value: ethers.parseEther('1.0'),
        })
        await fundTx.wait()
      } catch {
        // ignore — operator wallet might not be available on testnet
      }
    }

    // Build capability declaration and compute its hash
    const capabilityDoc = {
      schema: 'agentdid-capability/v1',
      identity: {
        name: name.trim(),
        version: version ?? '1.0.0',
        purpose: purpose ?? `AI agent — ${name.trim()}`,
        category: AGENT_CATEGORY[category ?? 'GENERAL'] ?? 0,
      },
      capabilities: {
        allowedActionTypes: allowedActionTypes ?? ['llm_query'],
        forbiddenActionTypes: ['financial_transaction'],
        canAccessPII: false,
        canWriteFiles: false,
        canSpawnSubAgents: false,
      },
      riskProfile: {
        level: RISK_LEVEL[riskLevel ?? 'LOW'] ?? 0,
        dataClassification: 'PUBLIC',
        financialLimit: 0,
      },
    }
    const capabilityHash = ethers.keccak256(
      ethers.toUtf8Bytes(JSON.stringify(capabilityDoc, null, 2))
    )

    const riskLevelNum = RISK_LEVEL[riskLevel ?? 'LOW'] ?? 0
    const categoryNum  = AGENT_CATEGORY[category ?? 'GENERAL'] ?? 0

    // Register on-chain with all 7 params
    const registry = getRegistry(agentWallet)
    const tx = await registry.registerAgent(
      agentWallet.address,
      name.trim(),
      version ?? '1.0.0',
      metadataURI ?? '',
      capabilityHash,
      riskLevelNum,
      categoryNum,
    )
    const receipt = await tx.wait() as ethers.TransactionReceipt

    return NextResponse.json({
      ok:             true,
      address:        agentWallet.address,
      txHash:         receipt.hash,
      blockNumber:    receipt.blockNumber,
      capabilityHash,
      riskLevel:      riskLevelNum,
      category:       categoryNum,
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}
