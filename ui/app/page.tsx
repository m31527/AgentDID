'use client'
import { useState, useEffect, useCallback } from 'react'

// ── Types ──────────────────────────────────────────────────────────────────
interface AgentIdentity {
  name: string; version: string; owner: string
  registeredAt: string; active: boolean
  metadataURI: string; actionCount: string
}
interface AgentState {
  address: string; registryAddress: string
  registered: boolean; identity: AgentIdentity | null
}
interface ActionRecord {
  agentAddress: string; actionIndex: string; actionType: string
  inputHash: string; outputHash: string; success: boolean
  timestamp: string; blockNumber: number; txHash: string
}
interface QueryResult {
  prompt: string; response: string; latencyMs: number
  inputHash: string; outputHash: string; txHash: string; blockNumber: number
}

// ── Helpers ────────────────────────────────────────────────────────────────
const shortAddr  = (a: string) => `${a.slice(0, 8)}…${a.slice(-6)}`
const shortHash  = (h: string) => `${h.slice(0, 10)}…${h.slice(-8)}`
const fmtTime    = (ts: string) => new Date(Number(ts) * 1000).toLocaleString()
const fmtRelTime = (ts: string) => {
  const sec = Math.floor(Date.now() / 1000) - Number(ts)
  if (sec < 60) return `${sec}s ago`
  if (sec < 3600) return `${Math.floor(sec/60)}m ago`
  return `${Math.floor(sec/3600)}h ago`
}

// ── Subcomponents ──────────────────────────────────────────────────────────

function StatusDot({ active }: { active?: boolean }) {
  return (
    <span className={`inline-block w-2 h-2 rounded-full mr-2 ${
      active ? 'bg-green-400 animate-pulse' : 'bg-gray-500'
    }`} />
  )
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500) }}
      className="ml-1 text-xs text-gray-500 hover:text-gray-300 transition-colors"
      title="Copy"
    >
      {copied ? '✓' : '⎘'}
    </button>
  )
}

function PassportCard({ agent, onRegister }: {
  agent: AgentState | null
  onRegister: (name: string, version: string) => Promise<void>
}) {
  const [registering, setRegistering] = useState(false)
  const [name, setName]       = useState('ResearchBot')
  const [version, setVersion] = useState('1.0.0')
  const [showForm, setShowForm] = useState(false)

  async function handleRegister() {
    setRegistering(true)
    try { await onRegister(name, version) }
    finally { setRegistering(false); setShowForm(false) }
  }

  return (
    <div className="glass rounded-2xl p-6 glow-green">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🤖</span>
          <h2 className="text-lg font-bold text-white">AgentDID Passport</h2>
        </div>
        {agent?.registered && (
          <span className="px-2 py-1 text-xs rounded-full bg-green-900/50 text-green-400 border border-green-800">
            <StatusDot active={agent.identity?.active} />
            {agent.identity?.active ? 'Active' : 'Inactive'}
          </span>
        )}
      </div>

      {!agent ? (
        <div className="flex items-center gap-2 text-gray-400 text-sm">
          <span className="animate-spin">⟳</span> Loading…
        </div>
      ) : !agent.registered ? (
        /* ── Not registered ── */
        <div>
          <p className="text-sm text-gray-400 mb-4">
            This agent has no on-chain identity yet.
          </p>
          <div className="text-xs text-gray-500 mb-3 font-mono">
            <div className="text-gray-600 mb-1">DID</div>
            <span className="text-purple-400">did:agent:{agent.address.slice(0,10)}…</span>
          </div>
          {!showForm ? (
            <button
              onClick={() => setShowForm(true)}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-sm font-medium transition-colors"
            >
              ＋ Register on chain
            </button>
          ) : (
            <div className="space-y-3 animate-slide-in">
              <input
                value={name} onChange={e => setName(e.target.value)}
                placeholder="Agent name"
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-purple-500"
              />
              <input
                value={version} onChange={e => setVersion(e.target.value)}
                placeholder="Version (e.g. 1.0.0)"
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-purple-500"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleRegister} disabled={registering}
                  className="flex-1 px-4 py-2 bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  {registering ? '⟳ Registering…' : '✓ Confirm & Register'}
                </button>
                <button onClick={() => setShowForm(false)}
                  className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm transition-colors">
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* ── Registered ── */
        <div className="space-y-3 text-sm animate-fade-in">
          <Row label="Name"    value={agent.identity?.name ?? '—'} highlight />
          <Row label="Version" value={`v${agent.identity?.version}`} />
          <Row label="DID"
            value={<span className="text-purple-300 font-mono text-xs">did:agent:{shortAddr(agent.address)}<CopyButton text={`did:agent:${agent.address}`} /></span>}
          />
          <Row label="Owner"
            value={<span className="text-blue-300 font-mono">{shortAddr(agent.identity?.owner ?? '')}<CopyButton text={agent.identity?.owner ?? ''} /></span>}
          />
          <Row label="Registry"
            value={<span className="text-gray-400 font-mono text-xs">{shortAddr(agent.registryAddress)}<CopyButton text={agent.registryAddress} /></span>}
          />
          <Row label="Registered" value={fmtTime(agent.identity?.registeredAt ?? '0')} />
          <div className="pt-2 border-t border-gray-800">
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Total Actions</span>
              <span className="text-2xl font-bold text-green-400">{agent.identity?.actionCount}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Row({ label, value, highlight }: { label: string; value: React.ReactNode; highlight?: boolean }) {
  return (
    <div className="flex justify-between items-center gap-4">
      <span className="text-gray-500 shrink-0">{label}</span>
      <span className={highlight ? 'text-white font-semibold' : 'text-gray-300'}>{value}</span>
    </div>
  )
}

function QueryPanel({ onQuery, loading }: {
  onQuery: (prompt: string) => Promise<void>
  loading: boolean
}) {
  const [prompt, setPrompt] = useState('')
  const [lastResult, setLastResult] = useState<QueryResult | null>(null)
  const [error, setError] = useState('')

  async function handleQuery() {
    if (!prompt.trim() || loading) return
    setError('')
    setLastResult(null)
    try {
      const res = await fetch('/api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      })
      const data = await res.json()
      if (!data.ok) { setError(data.error); return }
      setLastResult(data)
      setPrompt('')
      await onQuery(prompt)
    } catch (e) {
      setError(String(e))
    }
  }

  const suggestions = [
    'Why should AI agents have decentralized identities?',
    'What risks arise from unaccountable autonomous agents?',
    'How can AgentDID prevent AI agent impersonation?',
  ]

  return (
    <div className="glass rounded-2xl p-6 glow-purple">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xl">💬</span>
        <h2 className="text-lg font-bold text-white">Query Agent</h2>
        {loading && <span className="text-xs text-purple-400 animate-pulse ml-auto">⟳ Processing…</span>}
      </div>

      {/* Suggestions */}
      {!loading && !lastResult && (
        <div className="flex flex-wrap gap-2 mb-3">
          {suggestions.map(s => (
            <button key={s} onClick={() => setPrompt(s)}
              className="text-xs px-2 py-1 rounded-full border border-gray-700 text-gray-400 hover:border-purple-600 hover:text-purple-300 transition-colors">
              {s.slice(0, 40)}…
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="flex gap-2">
        <textarea
          value={prompt} onChange={e => setPrompt(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleQuery() } }}
          placeholder="Ask the agent anything… (Enter to send)"
          rows={3}
          className="flex-1 bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 resize-none"
        />
        <button
          onClick={handleQuery} disabled={loading || !prompt.trim()}
          className="px-5 py-3 bg-purple-700 hover:bg-purple-600 disabled:opacity-40 text-white rounded-xl text-sm font-bold transition-colors self-stretch"
        >
          ⚡ Send
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="mt-3 p-3 bg-red-900/30 border border-red-800 rounded-lg text-red-400 text-sm">
          ⚠ {error}
        </div>
      )}

      {/* Last result */}
      {lastResult && (
        <div className="mt-4 space-y-3 animate-slide-in">
          {/* Response */}
          <div className="p-4 bg-gray-900/60 rounded-xl border border-gray-700">
            <div className="text-xs text-gray-500 mb-2 flex justify-between">
              <span>🤖 Agent Response</span>
              <span className="text-green-400">{lastResult.latencyMs}ms</span>
            </div>
            <p className="text-sm text-gray-200 leading-relaxed whitespace-pre-wrap">{lastResult.response}</p>
          </div>

          {/* On-chain receipt */}
          <div className="p-3 bg-green-950/40 rounded-xl border border-green-900">
            <div className="text-xs text-green-500 font-bold mb-2">⛓ Logged on-chain</div>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-500">TX Hash</span>
                <span className="text-blue-400 font-mono">{shortHash(lastResult.txHash)}<CopyButton text={lastResult.txHash} /></span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Block</span>
                <span className="text-gray-300">#{lastResult.blockNumber}</span>
              </div>
              <div className="mt-1 pt-1 border-t border-green-900">
                <div className="text-gray-500 mb-1">Input hash (keccak256 of prompt)</div>
                <div className="hash text-green-600">{lastResult.inputHash}</div>
              </div>
              <div>
                <div className="text-gray-500 mb-1">Output hash (keccak256 of response)</div>
                <div className="hash text-green-600">{lastResult.outputHash}</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ActionFeed({ actions, loading }: { actions: ActionRecord[]; loading: boolean }) {
  const [expanded, setExpanded] = useState<string | null>(null)

  return (
    <div className="glass rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-xl">📜</span>
          <h2 className="text-lg font-bold text-white">Audit Trail</h2>
        </div>
        <span className="text-xs text-gray-500">{actions.length} actions on-chain</span>
      </div>

      {loading && actions.length === 0 && (
        <div className="text-center py-8 text-gray-500 text-sm">
          <span className="animate-spin inline-block mr-2">⟳</span> Loading chain events…
        </div>
      )}

      {!loading && actions.length === 0 && (
        <div className="text-center py-8 text-gray-600 text-sm">
          <div className="text-4xl mb-2">🔗</div>
          No actions yet. Send a query above!
        </div>
      )}

      <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
        {actions.map((a) => {
          const key = `${a.actionIndex}-${a.txHash}`
          const open = expanded === key
          return (
            <div key={key}
              className="rounded-xl border border-gray-800 hover:border-gray-700 transition-colors cursor-pointer animate-fade-in"
              onClick={() => setExpanded(open ? null : key)}
            >
              {/* Collapsed row */}
              <div className="flex items-center gap-3 px-4 py-3">
                <span className={`w-2 h-2 rounded-full shrink-0 ${a.success ? 'bg-green-400' : 'bg-red-400'}`} />
                <span className="text-xs text-gray-500 w-6 shrink-0">#{a.actionIndex}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-gray-800 text-purple-300 border border-gray-700">
                  {a.actionType}
                </span>
                <span className="text-xs text-gray-500 ml-auto shrink-0">{fmtRelTime(a.timestamp)}</span>
                <span className="text-gray-600 text-xs">{open ? '▲' : '▼'}</span>
              </div>

              {/* Expanded detail */}
              {open && (
                <div className="px-4 pb-4 space-y-2 border-t border-gray-800 pt-3 animate-slide-in">
                  <DetailRow label="Time"    value={fmtTime(a.timestamp)} />
                  <DetailRow label="Block"   value={`#${a.blockNumber}`} />
                  <DetailRow label="TX"      value={
                    <span className="text-blue-400 font-mono text-xs">{shortHash(a.txHash)}<CopyButton text={a.txHash} /></span>
                  } />
                  <DetailRow label="Status"  value={
                    <span className={a.success ? 'text-green-400' : 'text-red-400'}>{a.success ? '✓ Success' : '✗ Failed'}</span>
                  } />
                  <div className="pt-1">
                    <div className="text-xs text-gray-500 mb-1">Input Hash</div>
                    <div className="hash text-green-700">{a.inputHash}<CopyButton text={a.inputHash} /></div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Output Hash</div>
                    <div className="hash text-green-700">{a.outputHash}<CopyButton text={a.outputHash} /></div>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between items-start gap-4">
      <span className="text-xs text-gray-500 shrink-0">{label}</span>
      <span className="text-xs text-gray-300 text-right">{value}</span>
    </div>
  )
}

function HashVerifier() {
  const [input, setInput]   = useState('')
  const [hash, setHash]     = useState('')
  const [result, setResult] = useState<boolean | null>(null)

  async function verify() {
    const { ethers } = await import('ethers')
    const computed = ethers.keccak256(ethers.toUtf8Bytes(input))
    setResult(computed.toLowerCase() === hash.toLowerCase())
  }

  return (
    <div className="glass rounded-2xl p-6">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xl">🔍</span>
        <h2 className="text-lg font-bold text-white">Hash Verifier</h2>
      </div>
      <p className="text-xs text-gray-500 mb-4">
        Paste the original text and a recorded hash to prove an action wasn't tampered with.
      </p>
      <div className="space-y-3">
        <textarea
          value={input} onChange={e => setInput(e.target.value)}
          placeholder="Original text (prompt or response)"
          rows={3}
          className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 resize-none font-mono"
        />
        <input
          value={hash} onChange={e => setHash(e.target.value)}
          placeholder="Recorded hash (0x…)"
          className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 font-mono"
        />
        <button
          onClick={verify} disabled={!input || !hash}
          className="w-full py-2 bg-blue-800 hover:bg-blue-700 disabled:opacity-40 text-white rounded-xl text-sm font-medium transition-colors"
        >
          Verify Integrity
        </button>
        {result !== null && (
          <div className={`p-3 rounded-xl border text-sm font-medium text-center animate-slide-in ${
            result
              ? 'bg-green-950/40 border-green-800 text-green-400'
              : 'bg-red-950/40 border-red-800 text-red-400'
          }`}>
            {result ? '✓ Hash matches — data is authentic' : '✗ Hash mismatch — data may have been altered'}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────
export default function Dashboard() {
  const [agent,       setAgent]       = useState<AgentState | null>(null)
  const [actions,     setActions]     = useState<ActionRecord[]>([])
  const [queryLoading, setQueryLoading] = useState(false)
  const [agentLoading, setAgentLoading] = useState(true)
  const [error,       setError]       = useState('')

  const fetchAgent = useCallback(async () => {
    try {
      const res  = await fetch('/api/agent')
      const data = await res.json()
      if (data.ok) setAgent(data)
      else setError(data.error)
    } catch (e) { setError(String(e)) }
    finally { setAgentLoading(false) }
  }, [])

  const fetchHistory = useCallback(async () => {
    try {
      const res  = await fetch('/api/history')
      const data = await res.json()
      if (data.ok) setActions(data.actions)
    } catch {}
  }, [])

  useEffect(() => {
    fetchAgent()
    fetchHistory()
    const id = setInterval(() => { fetchAgent(); fetchHistory() }, 5000)
    return () => clearInterval(id)
  }, [fetchAgent, fetchHistory])

  async function handleRegister(name: string, version: string) {
    const res  = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, version }),
    })
    const data = await res.json()
    if (!data.ok) throw new Error(data.error)
    await fetchAgent()
  }

  async function handleQuery(_prompt: string) {
    setQueryLoading(true)
    try {
      await new Promise(r => setTimeout(r, 500)) // brief pause for chain
      await Promise.all([fetchAgent(), fetchHistory()])
    } finally {
      setQueryLoading(false)
    }
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      {/* ── Header ── */}
      <header className="border-b border-gray-800 px-8 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🤖</span>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">AgentDID</h1>
              <p className="text-xs text-gray-500">Open Protocol · Decentralized Identity for AI Agents & Robots</p>
            </div>
          </div>
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse-slow" />
              Hardhat localhost:8545
            </span>
            <span className="px-2 py-1 bg-gray-800 rounded-lg font-mono">
              claude-opus-4-6
            </span>
          </div>
        </div>
      </header>

      {/* ── Error banner ── */}
      {error && (
        <div className="mx-8 mt-4 p-4 bg-red-950/40 border border-red-800 rounded-xl text-red-400 text-sm max-w-7xl mx-auto">
          ⚠ <strong>Connection error:</strong> {error}
          <div className="mt-1 text-xs text-red-600">
            Make sure: (1) Hardhat node is running <code className="bg-red-950 px-1 rounded">npx hardhat node</code> and
            (2) Contract is deployed <code className="bg-red-950 px-1 rounded">npm run deploy</code> and
            (3) <code className="bg-red-950 px-1 rounded">AGENT_PRIVATE_KEY</code> is in ui/.env
          </div>
        </div>
      )}

      {/* ── Main grid ── */}
      <main className="max-w-7xl mx-auto px-8 py-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column */}
        <div className="space-y-6">
          <PassportCard
            agent={agentLoading ? null : agent}
            onRegister={handleRegister}
          />
          <HashVerifier />
        </div>

        {/* Center column */}
        <div>
          <QueryPanel onQuery={handleQuery} loading={queryLoading} />
        </div>

        {/* Right column */}
        <div>
          <ActionFeed actions={actions} loading={agentLoading} />
        </div>
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-gray-800 px-8 py-4 mt-8">
        <div className="max-w-7xl mx-auto text-xs text-gray-600 flex justify-between">
          <span>AgentDID — Open Protocol · <a href="https://github.com/agentdid" className="hover:text-gray-400 transition-colors">github.com/agentdid</a> · Non-commercial · Community governed</span>
          <span>keccak256(input) + keccak256(output) anchored per action · <span className="font-mono">did:agent</span></span>
        </div>
      </footer>
    </div>
  )
}
