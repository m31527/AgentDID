import { NextResponse } from 'next/server'
import { getRegistry, getAgentWallet } from '@/lib/chain'
import { ethers } from 'ethers'

export async function GET() {
  try {
    const wallet   = getAgentWallet()
    const registry = getRegistry()

    const filter = registry.filters['ActionLogged'](wallet.address)
    const events  = await registry.queryFilter(filter)

    const actions = events.map((evt) => {
      const e = evt as ethers.EventLog
      return {
        agentAddress: e.args['agentAddress'] as string,
        actionIndex:  (e.args['actionIndex'] as bigint).toString(),
        actionType:   e.args['actionType']   as string,
        inputHash:    e.args['inputHash']    as string,
        outputHash:   e.args['outputHash']   as string,
        success:      e.args['success']      as boolean,
        timestamp:    (e.args['timestamp']   as bigint).toString(),
        blockNumber:  e.blockNumber,
        txHash:       e.transactionHash,
      }
    })

    // newest first
    actions.reverse()

    return NextResponse.json({ ok: true, actions })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}
