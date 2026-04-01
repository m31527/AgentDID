import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { ethers } from 'ethers'
import { getRegistry, getAgentWallet } from '@/lib/chain'

const anthropic = new Anthropic()

export async function POST(req: NextRequest) {
  try {
    const { prompt } = await req.json() as { prompt: string }
    if (!prompt?.trim()) {
      return NextResponse.json({ ok: false, error: 'prompt is required' }, { status: 400 })
    }

    const wallet   = getAgentWallet()
    const registry = getRegistry(wallet)
    const address  = wallet.address

    // ── Call Claude ──────────────────────────────────────────────────────
    const startMs = Date.now()
    const apiResponse = await anthropic.messages.create({
      model:      'claude-opus-4-6',
      max_tokens: 1024,
      thinking:   { type: 'adaptive' },
      system: [
        `You are an AI agent with a verified blockchain identity.`,
        `Your Ethereum address: ${address}`,
        `All your actions are permanently recorded on the blockchain.`,
        `Be concise and clear — responses will be shown in a UI dashboard.`,
      ].join('\n'),
      messages: [{ role: 'user', content: prompt }],
    })

    const response = apiResponse.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('\n')

    const latencyMs = Date.now() - startMs

    // ── Log on-chain ─────────────────────────────────────────────────────
    const inputHash  = ethers.keccak256(ethers.toUtf8Bytes(prompt))
    const outputHash = ethers.keccak256(ethers.toUtf8Bytes(response))

    const tx     = await registry.logAction('llm_query', inputHash, outputHash, true)
    const receipt = await tx.wait() as ethers.TransactionReceipt

    return NextResponse.json({
      ok:          true,
      prompt,
      response,
      latencyMs,
      inputHash,
      outputHash,
      txHash:      receipt.hash,
      blockNumber: receipt.blockNumber,
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}
