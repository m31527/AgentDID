import { NextResponse } from 'next/server'
import { ethers } from 'ethers'
import { getRegistry } from '@/lib/chain'

const RISK_LABELS   = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']
const CATEGORY_LABELS = ['GENERAL', 'RESEARCH', 'FINANCE', 'MEDICAL', 'LEGAL', 'INFRASTRUCTURE', 'SOCIAL']

export async function GET() {
  try {
    const registry = getRegistry()

    // Fetch all AgentRegistered events
    const events = await registry.queryFilter(registry.filters['AgentRegistered']())

    // For each agent, fetch full on-chain identity
    const agents = await Promise.all(
      events.map(async (evt) => {
        const e = evt as ethers.EventLog
        const agentAddress = e.args['agentAddress'] as string

        try {
          const [id, reputation] = await Promise.all([
            registry.getAgent(agentAddress),
            registry.getReputation(agentAddress).catch(() => 0n),
          ])

          return {
            address:        agentAddress,
            name:           id.name,
            version:        id.version,
            owner:          id.owner,
            registeredAt:   id.registeredAt.toString(),
            active:         id.active,
            metadataURI:    id.metadataURI,
            actionCount:    id.actionCount.toString(),
            successCount:   id.successCount.toString(),
            anomalyCount:   id.anomalyCount.toString(),
            riskLevel:      RISK_LABELS[Number(id.riskLevel)]    ?? 'LOW',
            category:       CATEGORY_LABELS[Number(id.category)] ?? 'GENERAL',
            capabilityHash: id.capabilityHash,
            reputation:     Number(reputation),
            txHash:         e.transactionHash,
            blockNumber:    e.blockNumber,
          }
        } catch {
          return null
        }
      })
    )

    return NextResponse.json({
      ok: true,
      agents: agents.filter(Boolean).sort(
        (a, b) => Number(b!.registeredAt) - Number(a!.registeredAt)
      ),
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}
