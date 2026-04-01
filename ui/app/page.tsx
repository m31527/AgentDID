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
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`
  return `${Math.floor(sec / 3600)}h ago`
}

// Parse gas / chain errors into user-friendly messages
function parseError(msg: string): { title: string; detail: string; isGas: boolean } {
  const m = msg.toLowerCase()
  if (m.includes('insufficient funds') || m.includes('insufficient_funds')) {
    return {
      isGas: true,
      title: 'Not enough Sepolia ETH for gas',
      detail: 'Your agent wallet needs Sepolia test ETH to pay transaction fees.',
    }
  }
  if (m.includes('already registered')) {
    return { isGas: false, title: 'Already registered', detail: 'This agent address is already on-chain.' }
  }
  if (m.includes('network') || m.includes('fetch') || m.includes('econnrefused') || m.includes('522') || m.includes('server_error')) {
    return { isGas: false, title: 'RPC connection error', detail: 'Could not reach the blockchain node. Check your RPC_URL in ui/.env.local.' }
  }
  return { isGas: false, title: 'Error', detail: msg }
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={e => { e.stopPropagation(); navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500) }}
      className="ml-1.5 text-gray-400 hover:text-gray-600 transition-colors"
      title="Copy"
    >
      <i className={`fa-solid ${copied ? 'fa-check text-green-500' : 'fa-copy'} text-xs`} />
    </button>
  )
}

function ErrorBox({ message }: { message: string }) {
  const { title, detail, isGas } = parseError(message)
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm">
      <div className="flex items-start gap-3">
        <i className="fa-solid fa-triangle-exclamation text-red-500 mt-0.5" />
        <div className="flex-1">
          <p className="font-semibold text-red-700">{title}</p>
          <p className="text-red-600 mt-0.5">{detail}</p>
          {isGas && (
            <div className="mt-3 p-3 bg-white rounded-lg border border-red-100">
              <p className="font-medium text-gray-700 mb-2">
                <i className="fa-solid fa-faucet-drip mr-1.5 text-blue-500" />
                Get free Sepolia ETH:
              </p>
              <ol className="text-gray-600 space-y-1 text-xs list-decimal list-inside">
                <li>
                  Go to{' '}
                  <a
                    href="https://cloud.google.com/application/web3/faucet/ethereum/sepolia"
                    target="_blank" rel="noopener noreferrer"
                    className="text-blue-600 underline hover:text-blue-800"
                  >
                    Google Web3 Faucet
                  </a>
                </li>
                <li>Paste your agent wallet address</li>
                <li>Wait ~30 seconds, then try again</li>
              </ol>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Hero / Register Section ────────────────────────────────────────────────
function HeroRegister({ agent, onRegister }: {
  agent: AgentState | null
  onRegister: (name: string, version: string) => Promise<void>
}) {
  const [step, setStep]           = useState<'idle' | 'form' | 'loading' | 'done'>('idle')
  const [name, setName]           = useState('')
  const [version, setVersion]     = useState('1.0.0')
  const [error, setError]         = useState('')

  async function handleRegister() {
    if (!name.trim()) return
    setStep('loading')
    setError('')
    try {
      await onRegister(name.trim(), version)
      setStep('done')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
      setStep('form')
    }
  }

  // Already registered — show compact identity card
  if (agent?.registered) {
    return (
      <div className="max-w-lg mx-auto card p-6 text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-50 mb-4">
          <i className="fa-solid fa-circle-check text-2xl text-green-500" />
        </div>
        <h2 className="text-xl font-bold mb-1">{agent.identity?.name}</h2>
        <p className="text-sm text-gray-500 font-mono mb-4">
          did:agent:{shortAddr(agent.address)}
          <CopyButton text={`did:agent:${agent.address}`} />
        </p>
        <div className="grid grid-cols-3 gap-4 text-center py-4 border-y border-gray-100">
          <div>
            <p className="text-2xl font-bold text-indigo-600">{agent.identity?.actionCount}</p>
            <p className="text-xs text-gray-500 mt-0.5">Actions logged</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-800">v{agent.identity?.version}</p>
            <p className="text-xs text-gray-500 mt-0.5">Version</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-green-500">
              <i className="fa-solid fa-circle text-xs" />
            </p>
            <p className="text-xs text-gray-500 mt-0.5">Active</p>
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-4">
          <i className="fa-solid fa-cube mr-1" />
          Registry{' '}
          <span className="font-mono">{shortAddr(agent.registryAddress)}</span>
          <CopyButton text={agent.registryAddress} />
          {' · '}
          <a
            href={`https://sepolia.etherscan.io/address/${agent.registryAddress}`}
            target="_blank" rel="noopener noreferrer"
            className="text-indigo-500 hover:underline"
          >
            Etherscan <i className="fa-solid fa-arrow-up-right-from-square text-xs" />
          </a>
        </p>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto">
      {step === 'idle' && (
        <div className="text-center">
          <button
            onClick={() => setStep('form')}
            className="btn-primary px-8 py-3.5 text-base inline-flex items-center gap-2.5"
          >
            <i className="fa-solid fa-id-card" />
            Register an Agent ID
          </button>
          <p className="text-sm text-gray-400 mt-3">Free on Sepolia testnet · Takes ~30 seconds</p>
        </div>
      )}

      {(step === 'form' || step === 'loading') && (
        <div className="card p-6 space-y-4">
          <h3 className="font-semibold text-gray-800 flex items-center gap-2">
            <i className="fa-solid fa-id-card text-indigo-500" />
            Register your Agent
          </h3>

          {error && <ErrorBox message={error} />}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Agent Name</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. ResearchBot, MyAssistant"
              disabled={step === 'loading'}
              onKeyDown={e => e.key === 'Enter' && handleRegister()}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Version</label>
            <input
              value={version}
              onChange={e => setVersion(e.target.value)}
              placeholder="1.0.0"
              disabled={step === 'loading'}
            />
          </div>
          <div className="flex gap-2 pt-1">
            <button
              onClick={handleRegister}
              disabled={step === 'loading' || !name.trim()}
              className="btn-primary flex-1 py-2.5 flex items-center justify-center gap-2"
            >
              {step === 'loading'
                ? <><i className="fa-solid fa-spinner fa-spin" /> Registering on-chain…</>
                : <><i className="fa-solid fa-check" /> Confirm & Register</>}
            </button>
            <button
              onClick={() => { setStep('idle'); setError('') }}
              disabled={step === 'loading'}
              className="btn-ghost px-4 py-2.5"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Query Panel ────────────────────────────────────────────────────────────
function QueryPanel({ disabled, onQuery, loading }: {
  disabled: boolean
  onQuery: (prompt: string) => Promise<void>
  loading: boolean
}) {
  const [prompt, setPrompt]       = useState('')
  const [lastResult, setLastResult] = useState<QueryResult | null>(null)
  const [error, setError]         = useState('')

  async function handleQuery() {
    if (!prompt.trim() || loading || disabled) return
    setError('')
    setLastResult(null)
    try {
      const res  = await fetch('/api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      })
      const data = await res.json()
      if (!data.ok) { setError(data.error); return }
      setLastResult(data)
      setPrompt('')
      await onQuery(prompt)
    } catch (e) { setError(String(e)) }
  }

  const suggestions = [
    'Why should AI agents have decentralized identities?',
    'What risks arise from unaccountable autonomous agents?',
    'How does keccak256 hashing protect action logs?',
  ]

  return (
    <div className="card p-6 space-y-4">
      <h3 className="font-semibold text-gray-800 flex items-center gap-2">
        <i className="fa-solid fa-paper-plane text-indigo-500" />
        Query Agent
        {loading && <span className="ml-auto text-xs text-indigo-400 flex items-center gap-1">
          <i className="fa-solid fa-spinner fa-spin" /> Processing…
        </span>}
      </h3>

      {disabled && (
        <p className="text-sm text-gray-400 italic flex items-center gap-2">
          <i className="fa-solid fa-lock text-gray-300" />
          Register your agent first to start querying.
        </p>
      )}

      {!disabled && (
        <>
          {!lastResult && (
            <div className="flex flex-wrap gap-2">
              {suggestions.map(s => (
                <button key={s} onClick={() => setPrompt(s)}
                  className="text-xs px-3 py-1.5 rounded-full border border-gray-200 text-gray-500 hover:border-indigo-300 hover:text-indigo-600 transition-colors">
                  {s.slice(0, 42)}…
                </button>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <textarea
              value={prompt} onChange={e => setPrompt(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleQuery() } }}
              placeholder="Ask the agent anything… (Enter to send)"
              rows={3}
              className="flex-1 resize-none"
              disabled={loading}
            />
            <button
              onClick={handleQuery} disabled={loading || !prompt.trim()}
              className="btn-primary px-5 self-stretch flex items-center justify-center"
            >
              <i className="fa-solid fa-paper-plane" />
            </button>
          </div>
          {error && <ErrorBox message={error} />}
          {lastResult && (
            <div className="space-y-3">
              <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
                <div className="flex justify-between items-center text-xs text-gray-400 mb-2">
                  <span><i className="fa-solid fa-robot mr-1" /> Agent Response</span>
                  <span className="text-green-600 font-medium">{lastResult.latencyMs}ms</span>
                </div>
                <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">{lastResult.response}</p>
              </div>
              <div className="p-3 rounded-xl bg-green-50 border border-green-100">
                <p className="text-xs font-semibold text-green-700 mb-2">
                  <i className="fa-solid fa-link mr-1" /> Logged on-chain
                </p>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-500">TX</span>
                    <span className="font-mono text-indigo-600">{shortHash(lastResult.txHash)}<CopyButton text={lastResult.txHash} /></span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Block</span>
                    <span className="text-gray-700">#{lastResult.blockNumber}</span>
                  </div>
                  <div className="pt-1 border-t border-green-100">
                    <p className="text-gray-400 mb-0.5">Input hash</p>
                    <p className="hash">{lastResult.inputHash}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 mb-0.5">Output hash</p>
                    <p className="hash">{lastResult.outputHash}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ── Audit Trail ────────────────────────────────────────────────────────────
function AuditTrail({ actions, loading }: { actions: ActionRecord[]; loading: boolean }) {
  const [expanded, setExpanded] = useState<string | null>(null)

  return (
    <div className="card p-6">
      <h3 className="font-semibold text-gray-800 flex items-center gap-2 mb-4">
        <i className="fa-solid fa-list-check text-indigo-500" />
        Audit Trail
        <span className="ml-auto text-xs text-gray-400 font-normal">{actions.length} on-chain</span>
      </h3>

      {loading && actions.length === 0 && (
        <div className="text-center py-10 text-gray-400 text-sm">
          <i className="fa-solid fa-spinner fa-spin mr-2" /> Loading chain events…
        </div>
      )}

      {!loading && actions.length === 0 && (
        <div className="text-center py-10 text-gray-400 text-sm">
          <i className="fa-solid fa-inbox text-3xl text-gray-200 mb-3 block" />
          No actions yet. Send a query to start logging.
        </div>
      )}

      <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
        {actions.map(a => {
          const key  = `${a.actionIndex}-${a.txHash}`
          const open = expanded === key
          return (
            <div key={key}
              className="rounded-xl border border-gray-100 hover:border-gray-200 card-hover cursor-pointer transition-all"
              onClick={() => setExpanded(open ? null : key)}
            >
              <div className="flex items-center gap-3 px-4 py-3">
                <i className={`fa-solid fa-circle text-xs ${a.success ? 'text-green-400' : 'text-red-400'}`} />
                <span className="text-xs text-gray-400 w-6">#{a.actionIndex}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 font-medium border border-indigo-100">
                  {a.actionType}
                </span>
                <span className="text-xs text-gray-400 ml-auto">{fmtRelTime(a.timestamp)}</span>
                <i className={`fa-solid fa-chevron-${open ? 'up' : 'down'} text-xs text-gray-300`} />
              </div>
              {open && (
                <div className="px-4 pb-4 space-y-2 border-t border-gray-100 pt-3 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Time</span>
                    <span className="text-gray-700">{fmtTime(a.timestamp)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Block</span>
                    <span className="text-gray-700">#{a.blockNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">TX</span>
                    <span className="font-mono text-indigo-600">{shortHash(a.txHash)}<CopyButton text={a.txHash} /></span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Status</span>
                    <span className={a.success ? 'text-green-600' : 'text-red-600'}>
                      <i className={`fa-solid ${a.success ? 'fa-check' : 'fa-xmark'} mr-1`} />
                      {a.success ? 'Success' : 'Failed'}
                    </span>
                  </div>
                  <div className="pt-1 border-t border-gray-100">
                    <p className="text-gray-400 mb-0.5">Input Hash</p>
                    <p className="hash">{a.inputHash}<CopyButton text={a.inputHash} /></p>
                  </div>
                  <div>
                    <p className="text-gray-400 mb-0.5">Output Hash</p>
                    <p className="hash">{a.outputHash}<CopyButton text={a.outputHash} /></p>
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

// ── Hash Verifier ──────────────────────────────────────────────────────────
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
    <div className="card p-6 space-y-3">
      <h3 className="font-semibold text-gray-800 flex items-center gap-2">
        <i className="fa-solid fa-magnifying-glass text-indigo-500" />
        Verify Integrity
      </h3>
      <p className="text-xs text-gray-500">
        Paste original text + recorded hash to prove an action was not tampered with.
      </p>
      <textarea
        value={input} onChange={e => setInput(e.target.value)}
        placeholder="Original text (prompt or response)"
        rows={3} className="resize-none font-mono text-xs"
      />
      <input
        value={hash} onChange={e => setHash(e.target.value)}
        placeholder="Recorded hash (0x…)"
        className="font-mono text-xs"
      />
      <button onClick={verify} disabled={!input || !hash}
        className="btn-primary w-full py-2.5 flex items-center justify-center gap-2">
        <i className="fa-solid fa-shield-halved" /> Verify
      </button>
      {result !== null && (
        <div className={`p-3 rounded-xl text-sm font-medium text-center flex items-center justify-center gap-2 ${
          result
            ? 'bg-green-50 border border-green-200 text-green-700'
            : 'bg-red-50 border border-red-200 text-red-700'
        }`}>
          <i className={`fa-solid ${result ? 'fa-check-circle' : 'fa-xmark-circle'}`} />
          {result ? 'Hash matches — data is authentic' : 'Hash mismatch — data may be altered'}
        </div>
      )}
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────
export default function Home() {
  const [agent,        setAgent]        = useState<AgentState | null>(null)
  const [actions,      setActions]      = useState<ActionRecord[]>([])
  const [queryLoading, setQueryLoading] = useState(false)
  const [agentLoading, setAgentLoading] = useState(true)
  const [connError,    setConnError]    = useState('')

  const fetchAgent = useCallback(async () => {
    try {
      const res  = await fetch('/api/agent')
      const data = await res.json()
      if (data.ok) { setAgent(data); setConnError('') }
      else setConnError(data.error)
    } catch (e) { setConnError(String(e)) }
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
      await new Promise(r => setTimeout(r, 500))
      await Promise.all([fetchAgent(), fetchHistory()])
    } finally { setQueryLoading(false) }
  }

  const registered = agent?.registered ?? false

  return (
    <div className="min-h-screen flex flex-col">
      {/* ── Nav ── */}
      <nav className="border-b border-gray-100 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
              <i className="fa-solid fa-robot text-white text-sm" />
            </div>
            <span className="font-bold text-gray-900 text-lg">AgentDID</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-100 font-medium">
              Testnet
            </span>
          </div>
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <a href="https://github.com/m31527/AgentDID" target="_blank" rel="noopener noreferrer"
              className="hover:text-gray-800 transition-colors flex items-center gap-1.5">
              <i className="fa-brands fa-github" /> GitHub
            </a>
            <a href="https://sepolia.etherscan.io/address/0x05623871958D6d648953e64B1cdb562Adc28019B"
              target="_blank" rel="noopener noreferrer"
              className="hover:text-gray-800 transition-colors flex items-center gap-1.5">
              <i className="fa-solid fa-cube" /> Contract
            </a>
          </div>
        </div>
      </nav>

      {/* ── Connection Error ── */}
      {connError && !agentLoading && (
        <div className="max-w-5xl mx-auto w-full px-6 mt-4">
          <ErrorBox message={connError} />
        </div>
      )}

      {/* ── Hero ── */}
      <section className="max-w-5xl mx-auto w-full px-6 pt-16 pb-12 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 text-xs font-medium mb-6">
          <i className="fa-solid fa-circle text-xs text-green-400" /> Live on Ethereum Sepolia
        </div>

        <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 leading-tight mb-4">
          Decentralized Identity<br />for Every AI Agent
        </h1>

        <p className="text-lg text-gray-500 max-w-2xl mx-auto mb-4">
          AgentDID gives every AI agent and robot a permanent, verifiable on-chain identity —
          with an immutable record of every action it takes.
        </p>
        <p className="text-sm text-gray-400 max-w-xl mx-auto mb-10">
          Non-commercial · Open source · Community governed · No tokens · No investors
        </p>

        {/* Register CTA */}
        {agentLoading
          ? <div className="text-gray-400 text-sm"><i className="fa-solid fa-spinner fa-spin mr-2" />Loading…</div>
          : <HeroRegister agent={agent} onRegister={handleRegister} />
        }
      </section>

      {/* ── How it works ── */}
      {!registered && (
        <section className="max-w-5xl mx-auto w-full px-6 pb-16">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              {
                icon: 'fa-fingerprint',
                color: 'text-indigo-500',
                bg: 'bg-indigo-50',
                title: 'Cryptographic Identity',
                desc: 'Each agent gets a unique Ethereum address as its DID — verifiable by anyone, owned by no single authority.',
              },
              {
                icon: 'fa-shield-halved',
                color: 'text-green-500',
                bg: 'bg-green-50',
                title: 'Immutable Action Log',
                desc: 'Every query, tool use, and decision is hashed and logged on-chain. The past cannot be rewritten.',
              },
              {
                icon: 'fa-globe',
                color: 'text-blue-500',
                bg: 'bg-blue-50',
                title: 'Community Oversight',
                desc: 'Anyone can audit any agent\'s history or flag anomalies. Accountability without a central authority.',
              },
            ].map(f => (
              <div key={f.title} className="card p-6 text-center card-hover">
                <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl ${f.bg} mb-4`}>
                  <i className={`fa-solid ${f.icon} text-xl ${f.color}`} />
                </div>
                <h3 className="font-semibold text-gray-800 mb-2">{f.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Dashboard (after registration) ── */}
      {registered && (
        <section className="max-w-5xl mx-auto w-full px-6 pb-16">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="space-y-6">
              <QueryPanel disabled={false} onQuery={handleQuery} loading={queryLoading} />
            </div>
            <div className="lg:col-span-1">
              <AuditTrail actions={actions} loading={agentLoading} />
            </div>
            <div>
              <HashVerifier />
            </div>
          </div>
        </section>
      )}

      {/* ── Footer ── */}
      <footer className="mt-auto border-t border-gray-100 px-6 py-5">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-gray-400">
          <span>
            AgentDID — Open Protocol ·{' '}
            <a href="https://github.com/m31527/AgentDID" className="hover:text-gray-600 transition-colors">
              github.com/m31527/AgentDID
            </a>{' '}
            · MIT License
          </span>
          <span className="font-mono">
            Contract: 0x0562…019B · Sepolia
          </span>
        </div>
      </footer>
    </div>
  )
}
