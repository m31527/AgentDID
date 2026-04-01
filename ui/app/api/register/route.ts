import { NextRequest, NextResponse } from 'next/server'
import { ethers } from 'ethers'
import { getRegistry, getAgentWallet, getOperatorWallet } from '@/lib/chain'

export async function POST(req: NextRequest) {
  try {
    const { name, version, metadataURI } = await req.json() as {
      name: string; version: string; metadataURI?: string
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

    // Register: agent's own wallet calls registerAgent (with self as agentAddress)
    const registry = getRegistry(agentWallet)
    const tx       = await registry.registerAgent(
      agentWallet.address,
      name.trim(),
      version ?? '1.0.0',
      metadataURI ?? '',
    )
    const receipt = await tx.wait() as ethers.TransactionReceipt

    return NextResponse.json({
      ok:          true,
      address:     agentWallet.address,
      txHash:      receipt.hash,
      blockNumber: receipt.blockNumber,
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}
