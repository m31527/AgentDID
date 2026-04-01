import { NextResponse } from 'next/server'
import { getRegistry, getProvider } from '@/lib/chain'

export async function GET() {
  try {
    const registry = getRegistry()
    const provider = getProvider()

    const [registeredEvents, actionEvents, anomalyEvents, blockNumber] = await Promise.all([
      registry.queryFilter(registry.filters['AgentRegistered']()),
      registry.queryFilter(registry.filters['ActionLogged']()),
      registry.queryFilter(registry.filters['AnomalyFlagged']()),
      provider.getBlockNumber(),
    ])

    return NextResponse.json({
      ok: true,
      totalAgents:    registeredEvents.length,
      totalActions:   actionEvents.length,
      totalAnomalies: anomalyEvents.length,
      blockNumber,
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}
