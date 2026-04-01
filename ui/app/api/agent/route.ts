import { NextResponse } from 'next/server'
import { getRegistry, getAgentWallet, getRegistryAddress } from '@/lib/chain'

export async function GET() {
  try {
    const wallet   = getAgentWallet()
    const registry = getRegistry()
    const address  = wallet.address

    const [identity, isReg] = await Promise.all([
      registry.getAgent(address),
      registry.isRegistered(address),
    ])

    return NextResponse.json({
      ok: true,
      address,
      registryAddress: getRegistryAddress(),
      registered: isReg,
      identity: isReg ? {
        name:         identity.name,
        version:      identity.version,
        owner:        identity.owner,
        registeredAt: identity.registeredAt.toString(),
        active:       identity.active,
        metadataURI:  identity.metadataURI,
        actionCount:  identity.actionCount.toString(),
      } : null,
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}
