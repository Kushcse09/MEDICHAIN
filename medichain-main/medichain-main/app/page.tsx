'use client'

import { useState, useEffect } from 'react'
import { ArrowRight, Check, Shield, Lock, FileText, Fingerprint, Wallet, Zap } from 'lucide-react'
import { useWallet } from '@/lib/WalletContext'
import { useRouter } from 'next/navigation'

export default function Page() {
  const { isConnected, isLoading: walletLoading, connect, error: walletError } = useWallet()
  const router = useRouter()
  const [showConnectModal, setShowConnectModal] = useState(false)

  // Redirect to dashboard if already connected (useEffect avoids render-time setState violation)
  useEffect(() => {
    if (isConnected) {
      router.push('/dashboard')
    }
  }, [isConnected, router])

  if (isConnected) return null

  const handleGetStarted = () => {
    setShowConnectModal(true)
  }

  const handleConnect = async () => {
    try {
      await connect()
      router.push('/dashboard')
    } catch (error: any) {
      console.error('Failed to connect:', error)
    }
  }

  return (
    <div className="min-h-screen bg-[#faf8f5] text-[#1a1d1a]">
      {/* Header */}
      <header className="border-b border-[#dfe5df] bg-[#faf8f5]/95">
        <div className="mx-auto flex h-[72px] max-w-[1360px] items-center justify-between px-5 sm:px-8">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-full bg-[#1f3d2e] text-[#faf8f5]">
              <Fingerprint className="size-[18px]" />
            </div>
            <span className="text-lg font-semibold tracking-[-0.04em]">MediChain</span>
          </div>
          <nav className="hidden items-center gap-7 text-sm text-[#607067] lg:flex">
            <a href="#features">Features</a>
            <a href="#how">How it works</a>
            <a href="#security">Security</a>
          </nav>
          <button
            onClick={handleGetStarted}
            className="flex items-center gap-2 rounded-sm bg-[#1f3d2e] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#2c4a3a]"
          >
            Get Started <ArrowRight className="size-4" />
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="mx-auto max-w-[1360px] px-5 py-20 sm:px-8 sm:py-32">
        <div className="mx-auto max-w-[900px] text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#cbd8cd] bg-white px-4 py-2 text-xs font-medium text-[#52645a]">
            <Zap className="size-3 text-[#3f7b58]" />
            Decentralized Healthcare Identity Platform
          </div>
          <h1 className="text-5xl font-semibold leading-[1.05] tracking-[-0.05em] sm:text-7xl">
            Your health records, <span className="text-[#3f7b58]">finally yours</span>.
          </h1>
          <p className="mx-auto mt-6 max-w-[680px] text-lg leading-8 text-[#66746b]">
            A patient-owned, blockchain-verified medical identity for care that moves with you. Store, share, and control your health data securely.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <button
              onClick={handleGetStarted}
              className="flex items-center gap-2 rounded-sm bg-[#1f3d2e] px-6 py-3 text-base font-medium text-white hover:bg-[#2c4a3a]"
            >
              <Wallet className="size-5" />
              Connect Wallet
            </button>
            <a
              href="#features"
              className="flex items-center gap-2 rounded-sm border border-[#cbd8cd] bg-white px-6 py-3 text-base font-medium text-[#1f3d2e] hover:bg-[#f0f2ed]"
            >
              Learn More <ArrowRight className="size-4" />
            </a>
          </div>
          <p className="mt-6 text-xs text-[#8a968e]">
            Powered by Ethereum • Secured by IPFS • AI-Enhanced
          </p>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="border-t border-[#dfe5df] bg-white py-20">
        <div className="mx-auto max-w-[1360px] px-5 sm:px-8">
          <div className="mb-16 text-center">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#789181]">
              Platform Features
            </p>
            <h2 className="mt-3 text-4xl font-semibold tracking-[-0.03em]">
              Healthcare data, redefined
            </h2>
          </div>
          <div className="grid gap-8 md:grid-cols-3">
            <div className="rounded-lg border border-[#dfe5df] bg-[#faf8f5] p-8">
              <div className="flex size-12 items-center justify-center rounded-full bg-[#e5eee8]">
                <Lock className="size-6 text-[#2c6045]" />
              </div>
              <h3 className="mt-6 text-xl font-semibold">Encrypted Storage</h3>
              <p className="mt-3 text-sm leading-6 text-[#66746b]">
                Your records are encrypted before upload and stored on decentralized IPFS, ensuring privacy and security.
              </p>
            </div>
            <div className="rounded-lg border border-[#dfe5df] bg-[#faf8f5] p-8">
              <div className="flex size-12 items-center justify-center rounded-full bg-[#e5eee8]">
                <Shield className="size-6 text-[#2c6045]" />
              </div>
              <h3 className="mt-6 text-xl font-semibold">Blockchain Verified</h3>
              <p className="mt-3 text-sm leading-6 text-[#66746b]">
                Record hashes anchored on Ethereum Sepolia blockchain provide tamper-proof verification and complete audit trails.
              </p>
            </div>
            <div className="rounded-lg border border-[#dfe5df] bg-[#faf8f5] p-8">
              <div className="flex size-12 items-center justify-center rounded-full bg-[#e5eee8]">
                <FileText className="size-6 text-[#2c6045]" />
              </div>
              <h3 className="mt-6 text-xl font-semibold">Smart Access Control</h3>
              <p className="mt-3 text-sm leading-6 text-[#66746b]">
                Grant and revoke provider access with time-boxed permissions. You decide who sees what, and for how long.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how" className="border-t border-[#dfe5df] py-20">
        <div className="mx-auto max-w-[1360px] px-5 sm:px-8">
          <div className="mb-16 text-center">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#789181]">
              How it works
            </p>
            <h2 className="mt-3 text-4xl font-semibold tracking-[-0.03em]">
              Three steps to secure healthcare
            </h2>
          </div>
          <div className="grid gap-12 md:grid-cols-3">
            <div className="text-center">
              <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-[#1f3d2e] text-2xl font-semibold text-white">
                1
              </div>
              <h3 className="mt-6 text-lg font-semibold">Connect Your Wallet</h3>
              <p className="mt-3 text-sm leading-6 text-[#66746b]">
                Use MetaMask or any Web3 wallet to authenticate. No passwords, just cryptographic signatures.
              </p>
            </div>
            <div className="text-center">
              <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-[#1f3d2e] text-2xl font-semibold text-white">
                2
              </div>
              <h3 className="mt-6 text-lg font-semibold">Upload Records</h3>
              <p className="mt-3 text-sm leading-6 text-[#66746b]">
                Add your medical documents. They're encrypted locally before being stored on IPFS with blockchain verification.
              </p>
            </div>
            <div className="text-center">
              <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-[#1f3d2e] text-2xl font-semibold text-white">
                3
              </div>
              <h3 className="mt-6 text-lg font-semibold">Share Securely</h3>
              <p className="mt-3 text-sm leading-6 text-[#66746b]">
                Grant time-limited access to providers. Revoke anytime. Track every access in the audit trail.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Security Section */}
      <section id="security" className="border-t border-[#dfe5df] bg-[#eaf0eb] py-20">
        <div className="mx-auto max-w-[1360px] px-5 sm:px-8">
          <div className="grid gap-12 md:grid-cols-2 md:items-center">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#789181]">
                Security & Privacy
              </p>
              <h2 className="mt-3 text-4xl font-semibold tracking-[-0.03em]">
                Trust built into every record
              </h2>
              <p className="mt-6 text-base leading-7 text-[#66746b]">
                MediChain uses military-grade encryption, decentralized storage, and blockchain verification to ensure your medical data remains private and tamper-proof.
              </p>
              <ul className="mt-8 space-y-4">
                <li className="flex items-start gap-3">
                  <Check className="mt-0.5 size-5 shrink-0 text-[#3f7b58]" />
                  <span className="text-sm text-[#66746b]">
                    <strong className="text-[#1f3d2e]">End-to-end encryption</strong> — Files encrypted before leaving your device
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="mt-0.5 size-5 shrink-0 text-[#3f7b58]" />
                  <span className="text-sm text-[#66746b]">
                    <strong className="text-[#1f3d2e]">Decentralized storage</strong> — No single point of failure with IPFS
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="mt-0.5 size-5 shrink-0 text-[#3f7b58]" />
                  <span className="text-sm text-[#66746b]">
                    <strong className="text-[#1f3d2e]">Blockchain audit trail</strong> — Immutable access logs on Ethereum Sepolia
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="mt-0.5 size-5 shrink-0 text-[#3f7b58]" />
                  <span className="text-sm text-[#66746b]">
                    <strong className="text-[#1f3d2e]">Smart contract access</strong> — Automated, time-boxed permissions
                  </span>
                </li>
              </ul>
            </div>
            <div className="rounded-lg border border-[#cbd8cd] bg-white p-8">
              <div className="flex size-20 items-center justify-center rounded-full border-2 border-[#9db5a3] text-center text-xs font-semibold uppercase tracking-[0.1em] text-[#2c6045]">
                SOC 2<br />Ready
              </div>
              <h3 className="mt-6 text-xl font-semibold">Enterprise-grade security</h3>
              <p className="mt-3 text-sm leading-6 text-[#66746b]">
                Built with healthcare compliance in mind, MediChain follows industry best practices for data security and privacy protection.
              </p>
              <div className="mt-6 space-y-2 text-sm text-[#66746b]">
                <p className="flex items-center gap-2">
                  <Check className="size-4 shrink-0 text-[#3f7b58]" />
                  <span>HIPAA-ready architecture</span>
                </p>
                <p className="flex items-center gap-2">
                  <Check className="size-4 shrink-0 text-[#3f7b58]" />
                  <span>Zero-knowledge proofs</span>
                </p>
                <p className="flex items-center gap-2">
                  <Check className="size-4 shrink-0 text-[#3f7b58]" />
                  <span>Regular security audits</span>
                </p>
                <p className="flex items-center gap-2">
                  <Check className="size-4 shrink-0 text-[#3f7b58]" />
                  <span>Cryptographic verification</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="border-t border-[#dfe5df] py-20">
        <div className="mx-auto max-w-[900px] px-5 text-center sm:px-8">
          <h2 className="text-4xl font-semibold tracking-[-0.03em] sm:text-5xl">
            Ready to take control of your health data?
          </h2>
          <p className="mx-auto mt-6 max-w-[600px] text-lg leading-8 text-[#66746b]">
            Join the decentralized healthcare revolution. Connect your wallet and start managing your medical records securely.
          </p>
          <button
            onClick={handleGetStarted}
            className="mt-10 flex items-center gap-2 rounded-sm bg-[#1f3d2e] px-8 py-4 text-lg font-medium text-white hover:bg-[#2c4a3a] mx-auto"
          >
            <Wallet className="size-6" />
            Get Started Now
          </button>
          <p className="mt-6 text-xs text-[#8a968e]">
            Free to use • Ethereum Sepolia Testnet • Demo Version
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#dfe5df] bg-[#1f3d2e] py-12 text-white">
        <div className="mx-auto max-w-[1360px] px-5 sm:px-8">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="flex items-center gap-3">
              <div className="flex size-8 items-center justify-center rounded-full bg-white text-[#1f3d2e]">
                <Fingerprint className="size-4" />
              </div>
              <span className="font-semibold">MediChain</span>
            </div>
            <div className="text-sm text-white/70">
              Powered by Ethereum Sepolia, IPFS & AI
            </div>
          </div>
        </div>
      </footer>

      {/* Connect Modal */}
      {showConnectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1a1d1a]/60 p-4">
          <div className="w-full max-w-md rounded-lg bg-[#faf8f5] p-8 shadow-2xl">
            <div className="mb-6 flex size-16 items-center justify-center rounded-full bg-[#1f3d2e] text-[#faf8f5] mx-auto">
              <Fingerprint className="size-8" />
            </div>
            <h2 className="text-center text-2xl font-semibold">Connect Your Wallet</h2>
            <p className="mt-3 text-center text-sm text-[#66746b]">
              Sign in securely using your Web3 wallet. No passwords required.
            </p>
            <button
              onClick={handleConnect}
              disabled={walletLoading}
              className="mt-8 flex w-full items-center justify-center gap-2 rounded-sm bg-[#1f3d2e] px-6 py-3 text-base font-medium text-white hover:bg-[#2c4a3a] disabled:opacity-50"
            >
              <Wallet className="size-5" />
              {walletLoading ? 'Connecting...' : 'Connect with MetaMask'}
            </button>
            {walletError && (
              <div className="mt-4 rounded border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                <p className="font-medium">Connection Failed</p>
                <p className="mt-1">{walletError}</p>
              </div>
            )}
            <div className="mt-6 rounded border border-[#cbd8cd] bg-white p-4 text-sm">
              <p className="font-medium text-[#1f3d2e]">What happens next:</p>
              <ol className="mt-2 space-y-2 text-[#66746b]">
                <li>1. MetaMask will open</li>
                <li>2. Approve the connection</li>
                <li>3. Sign the authentication message</li>
                <li>4. Access your dashboard</li>
              </ol>
            </div>
            <button
              onClick={() => setShowConnectModal(false)}
              className="mt-4 w-full text-sm text-[#52645a] hover:text-[#1f3d2e]"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
