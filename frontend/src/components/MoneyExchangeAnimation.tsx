import { CheckCircle2, Lock, Zap } from 'lucide-react'

export function MoneyExchangeAnimation({ className = '' }: { className?: string }) {
  return (
    <div
      className={`relative w-full max-w-lg mx-auto text-center select-none ${className}`}
      aria-label="Animated fintech lending demonstration depicting loan disbursement, repayment, and final settlement"
    >
      {/* Ambient background glow behind the demonstration */}
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-4 rounded-3xl bg-gradient-to-r from-blue-500/10 via-cyan-500/5 to-emerald-500/10 blur-2xl"
      />

      {/* 3-Stage Progress Indicators */}
      <div className="relative z-10 flex items-center justify-center gap-3 sm:gap-4 mb-5">
        {/* Stage 1: LEND */}
        <div className="flex flex-col items-center gap-1.5 w-24 sm:w-28">
          <div className="h-1 w-full overflow-hidden rounded-full bg-white/10">
            <div className="demo-progress-1 h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-400" />
          </div>
          <span className="text-[10px] sm:text-[11px] font-mono font-semibold tracking-wider text-slate-300 uppercase">
            01 · LEND
          </span>
        </div>

        {/* Stage 2: REPAY */}
        <div className="flex flex-col items-center gap-1.5 w-24 sm:w-28">
          <div className="h-1 w-full overflow-hidden rounded-full bg-white/10">
            <div className="demo-progress-2 h-full rounded-full bg-gradient-to-r from-amber-500 to-yellow-400" />
          </div>
          <span className="text-[10px] sm:text-[11px] font-mono font-semibold tracking-wider text-slate-300 uppercase">
            02 · REPAY
          </span>
        </div>

        {/* Stage 3: SETTLE */}
        <div className="flex flex-col items-center gap-1.5 w-24 sm:w-28">
          <div className="h-1 w-full overflow-hidden rounded-full bg-white/10">
            <div className="demo-progress-3 h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400" />
          </div>
          <span className="text-[10px] sm:text-[11px] font-mono font-semibold tracking-wider text-slate-300 uppercase">
            03 · SETTLE
          </span>
        </div>
      </div>

      {/* Demonstration Card Container (Centered, Frosted Glass with Refined Glow) */}
      <div className="relative z-10 min-h-[220px] sm:min-h-[210px] w-full rounded-2xl border border-white/[0.08] bg-white/[0.025] p-5 sm:p-6 shadow-[0_8px_32px_rgba(0,0,0,0.36)] backdrop-blur-xl">
        {/* ────────── STAGE 1: LEND ────────── */}
        <div className="demo-stage-slide demo-stage-1 absolute inset-0 flex flex-col justify-between p-5 sm:p-6">
          {/* Header Row: Stage pill & Live Balance */}
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/15 px-3 py-1 text-[11px] font-semibold tracking-wider text-blue-300 uppercase">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse" />
              Stage 1 · Disbursement
            </span>
            <div className="text-right">
              <span className="text-[10px] uppercase tracking-wider text-slate-400 block font-mono">
                Outstanding Balance
              </span>
              <span className="font-mono text-sm sm:text-base font-bold text-blue-400 tabular">
                ৳ 25,000
              </span>
            </div>
          </div>

          {/* Interactive Transfer Flow Demonstration */}
          <div className="my-auto py-3">
            <div className="flex items-center justify-between gap-3">
              {/* Lender Node */}
              <div className="flex flex-col items-center gap-1">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600/20 border border-blue-500/30 text-blue-400 font-bold text-xs shadow-[0_0_12px_rgba(37,99,235,0.25)]">
                  YOU
                </div>
                <span className="text-[11px] font-medium text-slate-300">Lender</span>
              </div>

              {/* Animated Money Transfer Beam (Left to Right) */}
              <div className="relative flex-1 flex flex-col items-center px-2">
                <span className="mb-1 font-mono text-xs sm:text-sm font-bold text-white bg-blue-500/20 border border-blue-400/30 px-3 py-0.5 rounded-full shadow-sm animate-pulse">
                  ৳ 25,000
                </span>
                <div className="relative w-full h-1 bg-white/10 rounded-full overflow-hidden">
                  <div className="transfer-beam-forward absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-blue-400 to-transparent" />
                </div>
                <span className="mt-1 text-[10px] text-blue-300 font-mono tracking-tight">
                  Transferring cash →
                </span>
              </div>

              {/* Borrower Node */}
              <div className="flex flex-col items-center gap-1">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 border border-white/10 text-slate-300 font-bold text-xs">
                  TH
                </div>
                <span className="text-[11px] font-medium text-slate-300">Tanvir H.</span>
              </div>
            </div>
          </div>

          {/* Footer Metadata */}
          <div className="flex items-center justify-between border-t border-white/[0.06] pt-3 text-xs">
            <span className="text-slate-400">Disbursed to Tanvir Hasan</span>
            <span className="rounded-md bg-blue-500/20 px-2 py-0.5 text-[10px] font-mono font-bold text-blue-300">
              LENT
            </span>
          </div>
        </div>

        {/* ────────── STAGE 2: REPAY ────────── */}
        <div className="demo-stage-slide demo-stage-2 absolute inset-0 flex flex-col justify-between p-5 sm:p-6">
          {/* Header Row: Stage pill & Live Balance */}
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 px-3 py-1 text-[11px] font-semibold tracking-wider text-amber-300 uppercase">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
              Stage 2 · Partial Repay
            </span>
            <div className="text-right">
              <span className="text-[10px] uppercase tracking-wider text-slate-400 block font-mono">
                Remaining Balance
              </span>
              <span className="font-mono text-sm sm:text-base font-bold text-amber-400 tabular">
                ৳ 15,000
              </span>
            </div>
          </div>

          {/* Interactive Transfer Flow Demonstration */}
          <div className="my-auto py-3">
            <div className="flex items-center justify-between gap-3">
              {/* Lender Node */}
              <div className="flex flex-col items-center gap-1">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-400 font-bold text-xs shadow-[0_0_12px_rgba(245,158,11,0.25)]">
                  YOU
                </div>
                <span className="text-[11px] font-medium text-slate-300">Lender</span>
              </div>

              {/* Animated Money Transfer Beam (Right to Left) */}
              <div className="relative flex-1 flex flex-col items-center px-2">
                <span className="mb-1 font-mono text-xs sm:text-sm font-bold text-white bg-amber-500/20 border border-amber-400/30 px-3 py-0.5 rounded-full shadow-sm animate-pulse">
                  ৳ 10,000
                </span>
                <div className="relative w-full h-1 bg-white/10 rounded-full overflow-hidden">
                  <div className="transfer-beam-reverse absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-amber-400 to-transparent" />
                </div>
                <span className="mt-1 text-[10px] text-amber-300 font-mono tracking-tight">
                  ← Repayment received
                </span>
              </div>

              {/* Borrower Node */}
              <div className="flex flex-col items-center gap-1">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 border border-white/10 text-slate-300 font-bold text-xs">
                  TH
                </div>
                <span className="text-[11px] font-medium text-slate-300">Tanvir H.</span>
              </div>
            </div>
          </div>

          {/* Footer Metadata */}
          <div className="flex items-center justify-between border-t border-white/[0.06] pt-3 text-xs">
            <span className="text-slate-400">Installment repaid by Tanvir</span>
            <span className="rounded-md bg-amber-500/20 px-2 py-0.5 text-[10px] font-mono font-bold text-amber-300">
              REPAID
            </span>
          </div>
        </div>

        {/* ────────── STAGE 3: SETTLE ────────── */}
        <div className="demo-stage-slide demo-stage-3 absolute inset-0 flex flex-col justify-between p-5 sm:p-6">
          {/* Header Row: Stage pill & Live Balance */}
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1 text-[11px] font-semibold tracking-wider text-emerald-300 uppercase">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Stage 3 · Final Settle
            </span>
            <div className="text-right">
              <span className="text-[10px] uppercase tracking-wider text-slate-400 block font-mono">
                Outstanding Balance
              </span>
              <span className="font-mono text-sm sm:text-base font-bold text-emerald-400 tabular">
                ৳ 0.00
              </span>
            </div>
          </div>

          {/* Interactive Transfer Flow Demonstration */}
          <div className="my-auto py-3">
            <div className="flex items-center justify-between gap-3">
              {/* Lender Node */}
              <div className="flex flex-col items-center gap-1">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-bold text-xs shadow-[0_0_14px_rgba(16,185,129,0.3)]">
                  YOU
                </div>
                <span className="text-[11px] font-medium text-slate-300">Lender</span>
              </div>

              {/* Animated Money Transfer Beam (Right to Left - Final Settlement) */}
              <div className="relative flex-1 flex flex-col items-center px-2">
                <span className="mb-1 font-mono text-xs sm:text-sm font-bold text-white bg-emerald-500/20 border border-emerald-400/30 px-3 py-0.5 rounded-full shadow-sm animate-pulse">
                  ৳ 15,000
                </span>
                <div className="relative w-full h-1 bg-white/10 rounded-full overflow-hidden">
                  <div className="transfer-beam-reverse absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-emerald-400 to-transparent" />
                </div>
                <span className="mt-1 text-[10px] text-emerald-300 font-mono tracking-tight font-semibold">
                  ← 100% Reconciled
                </span>
              </div>

              {/* Borrower Node */}
              <div className="flex flex-col items-center gap-1">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 font-bold text-xs">
                  TH
                </div>
                <span className="text-[11px] font-medium text-slate-300">Tanvir H.</span>
              </div>
            </div>
          </div>

          {/* Footer Metadata */}
          <div className="flex items-center justify-between border-t border-white/[0.06] pt-3 text-xs">
            <span className="text-slate-400">Final installment complete · Debt cleared</span>
            <span className="rounded-md bg-emerald-500/20 px-2 py-0.5 text-[10px] font-mono font-bold text-emerald-300">
              SETTLED
            </span>
          </div>
        </div>
      </div>

      {/* Trust Indicators (Centered Beneath the Demonstration) */}
      <div className="relative z-10 mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-slate-300">
        <div className="inline-flex items-center gap-1.5 transition-transform hover:scale-105 duration-200">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          <span className="font-medium">Double-Entry Integrity</span>
        </div>
        <div className="inline-flex items-center gap-1.5 transition-transform hover:scale-105 duration-200">
          <Lock className="h-4 w-4 text-blue-400 shrink-0" />
          <span className="font-medium">Isolated Multi-Tenant</span>
        </div>
        <div className="inline-flex items-center gap-1.5 transition-transform hover:scale-105 duration-200">
          <Zap className="h-4 w-4 text-amber-400 shrink-0" />
          <span className="font-medium">0.00 Float Drift</span>
        </div>
      </div>

      {/* Synchronized Keyframe Animations (10.8s 3-Stage Loop) */}
      <style>{`
        /* Progress Indicators */
        .demo-progress-1 { animation: demoProg1 10.8s linear infinite; }
        .demo-progress-2 { animation: demoProg2 10.8s linear infinite; }
        .demo-progress-3 { animation: demoProg3 10.8s linear infinite; }

        @keyframes demoProg1 {
          0% { width: 0%; opacity: 0.9; }
          30% { width: 100%; opacity: 1; }
          33.3% { width: 100%; opacity: 0.25; }
          99.9% { width: 0%; opacity: 0.25; }
          100% { width: 0%; opacity: 0.9; }
        }

        @keyframes demoProg2 {
          0%, 33.3% { width: 0%; opacity: 0.25; }
          36.6% { width: 0%; opacity: 0.9; }
          63.3% { width: 100%; opacity: 1; }
          66.6% { width: 100%; opacity: 0.25; }
          100% { width: 0%; opacity: 0.25; }
        }

        @keyframes demoProg3 {
          0%, 66.6% { width: 0%; opacity: 0.25; }
          70% { width: 0%; opacity: 0.9; }
          96.6% { width: 100%; opacity: 1; }
          99.9% { width: 100%; opacity: 0.25; }
          100% { width: 0%; opacity: 0.25; }
        }

        /* Stage Slide Transitions */
        .demo-stage-1 { animation: demoSlide1 10.8s cubic-bezier(0.4, 0, 0.2, 1) infinite; }
        .demo-stage-2 { animation: demoSlide2 10.8s cubic-bezier(0.4, 0, 0.2, 1) infinite; }
        .demo-stage-3 { animation: demoSlide3 10.8s cubic-bezier(0.4, 0, 0.2, 1) infinite; }

        @keyframes demoSlide1 {
          0% { opacity: 0; transform: translateY(8px) scale(0.98); pointer-events: none; }
          2.5% { opacity: 1; transform: translateY(0) scale(1); pointer-events: auto; }
          30% { opacity: 1; transform: translateY(0) scale(1); pointer-events: auto; }
          33.3% { opacity: 0; transform: translateY(-8px) scale(0.98); pointer-events: none; }
          100% { opacity: 0; transform: translateY(8px); pointer-events: none; }
        }

        @keyframes demoSlide2 {
          0%, 33.3% { opacity: 0; transform: translateY(8px) scale(0.98); pointer-events: none; }
          36% { opacity: 1; transform: translateY(0) scale(1); pointer-events: auto; }
          63.3% { opacity: 1; transform: translateY(0) scale(1); pointer-events: auto; }
          66.6% { opacity: 0; transform: translateY(-8px) scale(0.98); pointer-events: none; }
          100% { opacity: 0; transform: translateY(8px); pointer-events: none; }
        }

        @keyframes demoSlide3 {
          0%, 66.6% { opacity: 0; transform: translateY(8px) scale(0.98); pointer-events: none; }
          69.5% { opacity: 1; transform: translateY(0) scale(1); pointer-events: auto; }
          96.6% { opacity: 1; transform: translateY(0) scale(1); pointer-events: auto; }
          99.9% { opacity: 0; transform: translateY(-8px) scale(0.98); pointer-events: none; }
          100% { opacity: 0; transform: translateY(8px); pointer-events: none; }
        }

        /* Transfer Beams */
        .transfer-beam-forward {
          animation: beamForward 1.4s ease-in-out infinite;
        }
        @keyframes beamForward {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(300%); }
        }

        .transfer-beam-reverse {
          animation: beamReverse 1.4s ease-in-out infinite;
        }
        @keyframes beamReverse {
          0% { transform: translateX(300%); }
          100% { transform: translateX(-100%); }
        }

        @media (prefers-reduced-motion: reduce) {
          .demo-progress-1, .demo-progress-2, .demo-progress-3,
          .demo-stage-1, .demo-stage-2, .demo-stage-3,
          .transfer-beam-forward, .transfer-beam-reverse {
            animation: none !important;
          }
          .demo-stage-1 { opacity: 1 !important; transform: none !important; }
          .demo-stage-2, .demo-stage-3 { display: none !important; }
        }
      `}</style>
    </div>
  )
}
