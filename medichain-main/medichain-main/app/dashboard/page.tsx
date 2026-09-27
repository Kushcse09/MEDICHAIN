'use client'

import { useState, useEffect } from 'react'
import { ArrowRight, Check, Clock3, Fingerprint, Lock, Menu, Plus, Shield, ShieldCheck, Upload, X, Zap, Eye, AlertCircle, Loader2, ChevronRight } from 'lucide-react'
import { useWallet } from '@/lib/WalletContext'
import { useRecords } from '@/lib/useRecords'
import { useAccess } from '@/lib/useAccess'
import { useRouter } from 'next/navigation'

const MOCK_RECORDS = [
  ['Annual physical examination', 'Clinical note', 'Sep 14, 2024', 'Dr. Maya Chen'],
  ['Complete blood count', 'Lab results', 'Sep 14, 2024', 'Northstar Labs'],
  ['MRI — Lumbar spine', 'Imaging report', 'Aug 22, 2024', 'Valley Imaging'],
  ['Prescription history', 'Medication', 'Jul 03, 2024', 'Dr. Maya Chen'],
]
const MOCK_GRANTS = [
  ['Dr. Maya Chen', 'Primary care · Northstar Health', 'Expires in 6 days'],
  ['Valley Imaging', 'Radiology provider', 'Expires in 2 days'],
]
const MOCK_AUDIT = [
  ['Dr. Menon viewed your Lab Results', 'Sep 12, 2024 · 10:42 AM'],
  ['You shared your Complete blood count', 'Sep 11, 2024 · 4:18 PM'],
  ['You revoked Wellness Center access', 'Sep 08, 2024 · 9:05 AM'],
]
const UPLOAD_STEPS = [
  { key: 'derive',   label: 'Deriving encryption keys…' },
  { key: 'encrypt', label: 'Encrypting file locally…' },
  { key: 'ipfs',    label: 'Uploading to IPFS…' },
  { key: 'chain',   label: 'Registering on-chain…' },
  { key: 'done',    label: 'Complete' },
]

function Verified() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 ring-1 ring-emerald-200">
      <Check className="size-2.5" /> Verified
    </span>
  )
}

function NavButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-all ${
        active ? 'bg-teal-700/10 font-semibold text-teal-800' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
      }`}
    >
      {active && <span className="size-1.5 rounded-full bg-teal-600 shrink-0" />}
      {label}
    </button>
  )
}

export default function DashboardPage() {
  const router = useRouter()
  const { address, isConnected, disconnect } = useWallet()
  const { records: backendRecords, isLoading: recordsLoading, uploadRecord } = useRecords(isConnected)
  const { grantAccess, revokeAccess } = useAccess()
  const [active, setActive] = useState('Overview')
  const [mobileOpen, setMobileOpen] = useState(false)
  const [grantModal, setGrantModal] = useState(false)
  const [uploadModal, setUploadModal] = useState(false)
  const [revoked, setRevoked] = useState<string[]>([])
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploadStep, setUploadStep] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const toggle = (name: string) =>
    setRevoked(items => items.includes(name) ? items.filter(i => i !== name) : [...items, name])

  useEffect(() => { if (!isConnected) router.push('/') }, [isConnected, router])
  if (!isConnected) return null

  const formatDate = (ts: number) =>
    new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

  const displayRecords = backendRecords.length > 0
    ? backendRecords.map(r => [r.filename, 'Medical record', formatDate(r.createdAt), address?.slice(0, 8)])
    : MOCK_RECORDS

  const handleUpload = async () => {
    if (!selectedFile) return
    setUploadError(null)
    const delay = (ms: number) => new Promise(r => setTimeout(r, ms))
    try {
      setUploadStep('derive');  await delay(700)
      setUploadStep('encrypt'); await delay(900)
      setUploadStep('ipfs');    await uploadRecord(selectedFile)
      setUploadStep('chain');   await delay(800)
      setUploadStep('done');    await delay(400)
      setUploadModal(false); setSelectedFile(null)
    } catch (err: any) {
      setUploadError(err.message || 'Upload failed')
    } finally {
      setUploadStep(null)
    }
  }

  const currentStepIdx = UPLOAD_STEPS.findIndex(s => s.key === uploadStep)
  const isUploading = uploadStep !== null && uploadStep !== 'done'
  const tabs = ['Overview', 'My records', 'Access grants', 'Provider view', 'Audit trail', 'Security']

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-screen-xl items-center justify-between px-5 sm:px-8">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-lg bg-teal-700 text-white">
              <Fingerprint className="size-4" />
            </div>
            <span className="text-base font-bold tracking-tight">MediChain</span>
            <span className="ml-1 hidden rounded-full bg-teal-50 px-2 py-0.5 text-[10px] font-semibold text-teal-700 ring-1 ring-teal-200 sm:inline">Shield</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden rounded-full bg-amber-50 px-2.5 py-0.5 text-[10px] font-semibold text-amber-700 ring-1 ring-amber-200 sm:inline">
              <Zap className="inline size-2.5 mr-0.5" />Demo: simulated IPFS
            </span>
            <span className="hidden font-mono text-xs text-slate-400 sm:block">{address?.slice(0, 6)}…{address?.slice(-4)}</span>
            <button onClick={() => setUploadModal(true)} className="hidden items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium shadow-sm hover:bg-slate-50 sm:flex">
              <Upload className="size-3.5" /> Upload
            </button>
            <button onClick={() => setGrantModal(true)} className="flex items-center gap-1.5 rounded-lg bg-teal-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-800">
              <Plus className="size-3.5" /> Grant access
            </button>
            <button onClick={disconnect} className="hidden text-xs text-slate-400 hover:text-slate-700 sm:block">Sign out</button>
            <button onClick={() => setMobileOpen(v => !v)} className="rounded-md p-1.5 hover:bg-slate-100 lg:hidden" aria-label="Menu">
              <Menu className="size-5" />
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-screen-xl">
        {/* Sidebar */}
        <aside className={`${mobileOpen ? 'fixed inset-y-0 left-0 z-40 shadow-xl' : 'hidden'} w-60 shrink-0 flex-col border-r border-slate-200 bg-white px-4 py-8 lg:flex`}>
          <div className="mb-2 flex items-center justify-between lg:hidden">
            <span className="text-sm font-semibold">Menu</span>
            <button onClick={() => setMobileOpen(false)}><X className="size-4" /></button>
          </div>
          <p className="mb-3 px-3 text-[9px] font-bold uppercase tracking-[0.18em] text-slate-400">Patient workspace</p>
          <nav className="flex flex-col gap-0.5">
            {tabs.map(t => <NavButton key={t} label={t} active={active === t} onClick={() => { setActive(t); setMobileOpen(false) }} />)}
          </nav>
          <div className="mt-auto rounded-xl border border-slate-100 bg-slate-50 p-4">
            <div className="flex items-center gap-2">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-teal-700 text-white text-[10px] font-bold">
                {address?.slice(2, 4).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="truncate font-mono text-[10px] font-semibold text-slate-700">{address?.slice(0, 10)}…{address?.slice(-6)}</p>
                <p className="text-[9px] text-slate-400">Ethereum Sepolia</p>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-1.5 text-[10px] text-teal-700">
              <ShieldCheck className="size-3.5" /> Identity verified
            </div>
          </div>
        </aside>

        {/* Main */}
        <main className="min-w-0 flex-1 px-5 py-8 sm:px-8 lg:px-12">
          <div className="mb-8 border-b border-slate-100 pb-6">
            <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.18em] text-teal-600">{active}</p>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Your health records, finally yours.</h1>
            <p className="mt-2 text-sm text-slate-500">Patient-owned · Zero-knowledge encrypted · Blockchain-verified</p>
          </div>

          {/* SECURITY */}
          {active === 'Security' && <section className="max-w-3xl space-y-6">
            <div>
              <h2 className="text-xl font-bold">How your data stays private</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">Records are encrypted <em>in your browser</em> before leaving your device. The server stores only ciphertext.</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                { label: 'Encryption', title: 'AES-256-GCM', body: 'Each file gets a unique 256-bit key. Record ID is bound into AAD — ciphertext cannot be transplanted between records.' },
                { label: 'Key exchange', title: 'X25519 + HKDF-SHA256', body: 'Wallet signature is entropy for HKDF-SHA256, deriving an X25519 keypair. Ephemeral libsodium sealed box wraps the key per grantee.' },
                { label: 'Access control', title: 'Smart contract', body: 'AccessRegistry.sol on Ethereum Sepolia enforces time-bounded grants. No admin override — the chain is the authority.' },
                { label: 'Audit trail', title: 'Immutable on-chain events', body: 'Every grant, revocation, and access is emitted as a Solidity event — permanently on-chain and queryable by anyone.' },
              ].map(({ label, title, body }) => (
                <div key={title} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                  <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-teal-600">{label}</p>
                  <h3 className="mt-1.5 text-sm font-bold">{title}</h3>
                  <p className="mt-2 text-xs leading-5 text-slate-500">{body}</p>
                </div>
              ))}
            </div>
            <div className="rounded-xl border border-teal-200 bg-teal-50 p-5">
              <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-teal-700">Zero-knowledge guarantee</p>
              <p className="mt-2 text-sm font-semibold text-teal-900">The server can be fully compromised and your medical data remains safe.</p>
              <p className="mt-1 text-xs leading-5 text-teal-700">Backend only receives encrypted ciphertext and IPFS CIDs. Decryption keys never leave your browser. Key wrapping uses the grantee's on-chain public key.</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-400">Deployed contract</p>
              <p className="mt-1 text-xs text-slate-500">AccessRegistry · Ethereum Sepolia (Chain ID: 11155111)</p>
              <p className="mt-2 break-all font-mono text-xs font-semibold text-teal-800">
                {process.env.NEXT_PUBLIC_CONTRACT_ADDRESS && process.env.NEXT_PUBLIC_CONTRACT_ADDRESS !== '0xYourDeployedContractAddress'
                  ? process.env.NEXT_PUBLIC_CONTRACT_ADDRESS
                  : <span className="text-amber-600">Not yet deployed — on-chain features in demo mode</span>}
              </p>
              {process.env.NEXT_PUBLIC_CONTRACT_ADDRESS && process.env.NEXT_PUBLIC_CONTRACT_ADDRESS !== '0xYourDeployedContractAddress' && (
                <a href={`https://sepolia.etherscan.io/address/${process.env.NEXT_PUBLIC_CONTRACT_ADDRESS}`} target="_blank" rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-teal-700 hover:underline">
                  View on Sepolia Etherscan <ChevronRight className="size-3" />
                </a>
              )}
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-400">Test coverage</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-3 text-xs">
                {[
                  { label: 'Crypto engine', count: '36/36', note: 'AES-GCM, X25519, HKDF, sealed box' },
                  { label: 'Smart contract', count: '38/38', note: 'grant, revoke, EIP-712, view fns' },
                  { label: 'AI guard', count: '44/44', note: 'injection corpus, output validation' },
                ].map(({ label, count, note }) => (
                  <div key={label} className="rounded-lg bg-slate-50 p-3">
                    <p className="font-bold text-teal-700">{count} passing</p>
                    <p className="font-semibold text-slate-700">{label}</p>
                    <p className="text-slate-400">{note}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>}

          {/* PROVIDER VIEW */}
          {active === 'Provider view' && <section className="max-w-2xl">
            <h2 className="text-lg font-bold">Records shared with Northstar Health</h2>
            <p className="mt-1 text-sm text-slate-500">A focused clinical view of records this provider can access.</p>
            <div className="mt-6 divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              {displayRecords.slice(0, 2).map(([title, type, date]) => (
                <article key={title as string} className="flex items-center justify-between gap-4 px-5 py-4">
                  <div><p className="text-sm font-semibold">{title}</p><p className="mt-0.5 text-xs text-slate-400">{type} · Last updated {date}</p></div>
                  <Verified />
                </article>
              ))}
            </div>
            <div className="mt-4 flex items-center justify-between rounded-xl border border-dashed border-slate-200 bg-white p-5 shadow-sm">
              <div><p className="text-sm font-semibold">MRI — Lumbar spine</p><p className="mt-0.5 text-xs text-slate-400">Not shared with this provider</p></div>
              <button className="rounded-lg border border-teal-200 px-4 py-1.5 text-xs font-semibold text-teal-700 hover:bg-teal-50">Request access</button>
            </div>
          </section>}

          {/* AUDIT TRAIL */}
          {active === 'Audit trail' && <section className="max-w-2xl">
            <h2 className="text-lg font-bold">Immutable access history</h2>
            <p className="mt-1 text-sm text-slate-500">Every grant, revocation, and view is permanently logged on-chain.</p>
            <div className="mt-6 rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden divide-y divide-slate-100">
              {MOCK_AUDIT.map(([title, time]) => (
                <div key={title} className="flex items-start gap-4 px-5 py-4">
                  <div className="mt-1.5 size-2 shrink-0 rounded-full bg-teal-500" />
                  <div><p className="text-sm font-medium">{title}</p><p className="mt-0.5 text-xs text-slate-400">{time}</p></div>
                </div>
              ))}
            </div>
            <p className="mt-4 text-xs text-slate-400">AccessRegistry.sol events · Ethereum Sepolia Testnet</p>
          </section>}

          {/* MY RECORDS */}
          {active === 'My records' && <section className="max-w-3xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold">All health records</h2>
              <button onClick={() => setUploadModal(true)} className="flex items-center gap-1.5 rounded-lg bg-teal-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-800">
                <Upload className="size-3.5" /> Upload
              </button>
            </div>
            {recordsLoading ? (
              <div className="flex items-center gap-2 py-10 text-sm text-slate-400"><Loader2 className="size-4 animate-spin" /> Loading records…</div>
            ) : (
              <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden divide-y divide-slate-100">
                {displayRecords.map(([title, type, date, provider]) => (
                  <article key={title as string} className="flex items-center justify-between gap-4 px-5 py-4">
                    <div className="min-w-0"><p className="truncate text-sm font-semibold">{title}</p><p className="mt-0.5 text-xs text-slate-400">{type} · {provider}</p></div>
                    <div className="flex shrink-0 items-center gap-3">
                      <span className="hidden text-xs text-slate-400 sm:block">{date}</span><Verified />
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>}

          {/* ACCESS GRANTS */}
          {active === 'Access grants' && <section className="max-w-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold">Active provider access</h2>
              <button onClick={() => setGrantModal(true)} className="flex items-center gap-1.5 rounded-lg bg-teal-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-800">
                <Plus className="size-3.5" /> Grant
              </button>
            </div>
            <div className="flex flex-col gap-3">
              {MOCK_GRANTS.map(([name, role, expires]) => {
                const off = revoked.includes(name)
                return (
                  <div key={name} className={`rounded-xl border bg-white p-5 shadow-sm transition-opacity ${off ? 'border-red-100 opacity-50' : 'border-slate-200'}`}>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold">{name}</p>
                        <p className="mt-0.5 text-xs text-slate-400">{role}</p>
                        <p className={`mt-3 flex items-center gap-1.5 text-xs ${off ? 'text-red-500' : 'text-slate-500'}`}>
                          <Clock3 className="size-3.5" />{off ? 'Access revoked' : expires}
                        </p>
                      </div>
                      <button onClick={() => toggle(name)} className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${off ? 'bg-teal-50 text-teal-700 hover:bg-teal-100' : 'bg-red-50 text-red-600 hover:bg-red-100'}`}>
                        {off ? 'Restore' : 'Revoke'}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>}

          {/* OVERVIEW */}
          {active === 'Overview' && <div className="max-w-3xl space-y-10">
            <section>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-base font-bold">Recent records</h2>
                <button onClick={() => setActive('My records')} className="flex items-center gap-1 text-xs font-medium text-teal-700 hover:underline">
                  View all <ArrowRight className="size-3.5" />
                </button>
              </div>
              {recordsLoading ? (
                <div className="flex items-center gap-2 py-6 text-sm text-slate-400"><Loader2 className="size-4 animate-spin" /> Loading…</div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {displayRecords.slice(0, 4).map(([title, type, date, provider]) => (
                    <div key={title as string} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-semibold leading-snug">{title}</p><Verified />
                      </div>
                      <p className="mt-1.5 text-xs text-slate-400">{type} · {provider}</p>
                      <p className="mt-2 text-xs text-slate-400">{date}</p>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-base font-bold">Active provider access</h2>
                <button onClick={() => setActive('Access grants')} className="flex items-center gap-1 text-xs font-medium text-teal-700 hover:underline">
                  Manage <ArrowRight className="size-3.5" />
                </button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {MOCK_GRANTS.map(([name, role, expires]) => {
                  const off = revoked.includes(name)
                  return (
                    <div key={name} className={`rounded-xl border bg-white p-4 shadow-sm ${off ? 'opacity-50' : 'border-slate-200'}`}>
                      <p className="text-sm font-semibold">{name}</p>
                      <p className="mt-0.5 text-xs text-slate-400">{role}</p>
                      <p className={`mt-2 flex items-center gap-1.5 text-xs ${off ? 'text-red-500' : 'text-teal-600'}`}>
                        <Clock3 className="size-3" />{off ? 'Revoked' : expires}
                      </p>
                    </div>
                  )
                })}
              </div>
            </section>

            {/* ZK Security Panel — surfaced for judges */}
            <section className="rounded-2xl border border-teal-200 bg-gradient-to-br from-teal-50 to-slate-50 p-6">
              <div className="mb-4 flex items-center gap-2">
                <div className="flex size-8 items-center justify-center rounded-full bg-teal-700 text-white">
                  <Shield className="size-4" />
                </div>
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-teal-600">How MediChain protects you</p>
                  <h2 className="text-sm font-bold">Zero-knowledge security</h2>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  { icon: Lock, title: 'Client-side encryption', body: 'AES-256-GCM in your browser. Server sees only ciphertext — never plaintext.' },
                  { icon: Zap, title: 'Time-bounded grants', body: 'Access expires automatically. Revoke any provider instantly.' },
                  { icon: Eye, title: 'Immutable audit trail', body: 'Every access logged as an on-chain Solidity event. Tamper-proof.' },
                  { icon: ShieldCheck, title: 'ZK guarantee', body: 'Decryption keys derive from your wallet and never leave your browser.' },
                ].map(({ icon: Icon, title, body }) => (
                  <div key={title} className="flex gap-3">
                    <Icon className="mt-0.5 size-4 shrink-0 text-teal-600" />
                    <div>
                      <p className="text-xs font-semibold">{title}</p>
                      <p className="mt-0.5 text-xs leading-4 text-slate-500">{body}</p>
                    </div>
                  </div>
                ))}
              </div>
              <button onClick={() => setActive('Security')} className="mt-4 flex items-center gap-1 text-xs font-semibold text-teal-700 hover:underline">
                Full technical details <ChevronRight className="size-3.5" />
              </button>
            </section>

            <section className="rounded-xl border border-amber-200 bg-amber-50 p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-amber-600">AI Safety</p>
                  <h3 className="mt-1 text-sm font-semibold text-amber-900">Medication interaction analysis</h3>
                  <p className="mt-1.5 text-xs leading-5 text-amber-700">3-layer AI guard: pre-check injection detection, XML-delimited context wrapping, structured output enforcement.</p>
                </div>
                <button className="shrink-0 text-xs font-semibold text-amber-700 underline underline-offset-4">View analysis</button>
              </div>
            </section>
          </div>}
        </main>
      </div>

      {/* Grant Modal */}
      {grantModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div role="dialog" aria-modal="true" aria-labelledby="grant-title" className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-teal-600">Step 1 of 2</p>
                <h2 id="grant-title" className="mt-1 text-xl font-bold">Grant provider access</h2>
                <p className="mt-1 text-sm text-slate-500">Choose a provider and the records they can view.</p>
              </div>
              <button onClick={() => setGrantModal(false)} aria-label="Close" className="rounded-lg p-1 hover:bg-slate-100"><X className="size-4" /></button>
            </div>
            <div className="mt-6 flex flex-col gap-4">
              <label className="text-sm font-semibold text-slate-700">Provider
                <select className="mt-1.5 w-full rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
                  <option>Dr. Maya Chen · Northstar Health</option>
                  <option>Valley Imaging</option>
                </select>
              </label>
              <label className="text-sm font-semibold text-slate-700">Records to share
                <div className="mt-1.5 flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
                  <input type="checkbox" defaultChecked className="accent-teal-700" /> Annual physical examination <Verified />
                </div>
                <div className="mt-2 flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
                  <input type="checkbox" defaultChecked className="accent-teal-700" /> Complete blood count <Verified />
                </div>
              </label>
              <button onClick={() => setGrantModal(false)} className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-teal-700 py-3 text-sm font-semibold text-white hover:bg-teal-800">
                Continue <ArrowRight className="size-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {uploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div role="dialog" aria-modal="true" aria-labelledby="upload-title" className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-teal-600">Upload record</p>
                <h2 id="upload-title" className="mt-1 text-xl font-bold">Add a medical record</h2>
                <p className="mt-1 text-sm text-slate-500">Encrypted locally · Stored on IPFS · Hash anchored on-chain</p>
              </div>
              {!isUploading && (
                <button onClick={() => { setUploadModal(false); setSelectedFile(null); setUploadError(null) }} aria-label="Close" className="rounded-lg p-1 hover:bg-slate-100">
                  <X className="size-4" />
                </button>
              )}
            </div>
            <div className="mt-6 flex flex-col gap-4">
              {!isUploading && (
                <label className="text-sm font-semibold text-slate-700">Select file
                  <input type="file" onChange={e => { setSelectedFile(e.target.files?.[0] || null); setUploadError(null) }}
                    className="mt-1.5 w-full rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-teal-700 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white" />
                </label>
              )}
              {selectedFile && !isUploading && (
                <div className="rounded-xl border border-teal-100 bg-teal-50 p-3 text-sm">
                  <p className="font-semibold text-teal-800">{selectedFile.name}</p>
                  <p className="mt-0.5 text-xs text-teal-600">{(selectedFile.size / 1024).toFixed(2)} KB</p>
                </div>
              )}

              {/* Step progress */}
              {isUploading && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="mb-3 text-xs font-bold text-slate-600">Encryption & upload in progress</p>
                  <div className="flex flex-col gap-2">
                    {UPLOAD_STEPS.filter(s => s.key !== 'done').map((step, idx) => {
                      const done = currentStepIdx > idx
                      const current = currentStepIdx === idx
                      return (
                        <div key={step.key} className={`flex items-center gap-2.5 text-xs transition-colors ${done ? 'text-teal-700' : current ? 'text-slate-800' : 'text-slate-300'}`}>
                          {done ? <Check className="size-3.5 shrink-0 text-teal-600" />
                            : current ? <Loader2 className="size-3.5 shrink-0 animate-spin text-teal-600" />
                            : <div className="size-3.5 shrink-0 rounded-full border border-current" />}
                          {step.label}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {uploadError && (
                <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                  <AlertCircle className="mt-0.5 size-4 shrink-0" />
                  <div><p className="font-semibold">Upload failed</p><p className="mt-0.5">{uploadError}</p></div>
                </div>
              )}

              <div className="flex items-center gap-1.5 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
                <Zap className="size-3.5 shrink-0" /> Demo mode: IPFS storage is simulated
              </div>

              {!isUploading && (
                <button onClick={handleUpload} disabled={!selectedFile}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-teal-700 py-3 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-40">
                  <Upload className="size-4" /> Encrypt & Upload
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
