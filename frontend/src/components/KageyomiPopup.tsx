import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Shield, LockKeyhole, Network, HardDrive, Monitor } from 'lucide-react';

export function KageyomiPopup() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Show popup after a short delay on first load
    const timer = setTimeout(() => {
      const hasSeenPopup = localStorage.getItem('kageyomi_popup_seen');
      if (!hasSeenPopup) {
        setIsOpen(true);
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  const closePopup = () => {
    setIsOpen(false);
    localStorage.setItem('kageyomi_popup_seen', 'true');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
            onClick={closePopup}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", duration: 0.5 }}
            className="relative w-full max-w-4xl overflow-hidden rounded-2xl bg-[#0a0a0a] border border-white/10 shadow-[0_0_40px_rgba(255,255,255,0.05)] max-h-[90vh] overflow-y-auto"
          >
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-zinc-600 to-white" />
            
            <button
              onClick={closePopup}
              className="absolute right-4 top-4 rounded-full p-2 text-zinc-500 hover:bg-white/5 hover:text-white transition-colors z-10"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="p-8 sm:p-12">
              <div className="mb-6 inline-flex items-center gap-2 rounded border border-zinc-500/30 bg-zinc-500/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-zinc-300">
                <Sparkles className="h-3.5 w-3.5" />
                SoSoValue Buildathon
              </div>
              
              <h2 className="mb-4 text-3xl sm:text-4xl font-bold text-white tracking-tight">
                Welcome to Kageyomi
              </h2>
              
              <p className="mb-10 text-zinc-400 text-sm sm:text-base leading-relaxed max-w-2xl">
                Kageyomi pairs specialist crypto research agents with Fhenix confidential inferencing, giving you private execution, replayable market-data receipts, and a sharper research workflow.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
                <div className="flex items-start gap-4 p-4 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-colors">
                  <div className="rounded border border-zinc-500/20 bg-zinc-500/10 p-3 mt-1 text-white">
                    <LockKeyhole className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white mb-2 tracking-wide">1. Agentic Crypto Research</h4>
                    <p className="text-sm text-zinc-500 leading-relaxed">Run specialist market agents for flows, macro, treasury behavior, narratives, indices, and venture activity instead of a single generic chatbot pass.</p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-colors">
                  <div className="rounded border border-zinc-500/20 bg-zinc-500/10 p-3 mt-1 text-white">
                    <Network className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white mb-2 tracking-wide">2. Quorum-Verified Execution</h4>
                    <p className="text-sm text-zinc-500 leading-relaxed">A leader executes the research path while verifier nodes replay the frozen receipt trace, ensuring the final thesis matches the exact evidence used in the run.</p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-colors">
                  <div className="rounded border border-zinc-500/20 bg-zinc-500/10 p-3 mt-1 text-white">
                    <Shield className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white mb-2 tracking-wide">3. Fhenix Privacy Rail</h4>
                    <p className="text-sm text-zinc-500 leading-relaxed">Prompts and outputs stay private under Fhenix CoFHE permissions, so you can research sensitive market ideas without leaking the thesis you are exploring.</p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-colors">
                  <div className="rounded border border-zinc-500/20 bg-zinc-500/10 p-3 mt-1 text-white">
                    <HardDrive className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white mb-2 tracking-wide">4. UAVP Receipt Trail</h4>
                    <p className="text-sm text-zinc-500 leading-relaxed">Every live SoSoValue tool call is canonicalized, hashed, and stored as a receipt so the research run can be replayed from frozen evidence instead of drifting live APIs.</p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-colors md:col-span-2">
                  <div className="rounded border border-zinc-500/20 bg-zinc-500/10 p-3 mt-1 text-white">
                    <Monitor className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white mb-2 tracking-wide">5. Research Terminal UX</h4>
                    <p className="text-sm text-zinc-500 leading-relaxed max-w-3xl">The interface now centers on agent selection, research traces, and verifiable outputs, while keeping the privacy layer visible but secondary to the market workflow.</p>
                  </div>
                </div>
              </div>

              <div className="flex justify-center">
                <button
                  onClick={closePopup}
                  className="w-full sm:w-auto min-w-[300px] rounded-xl bg-white hover:bg-zinc-200 px-8 py-4 text-sm font-bold uppercase tracking-widest text-black transition-colors shadow-[0_0_20px_rgba(255,255,255,0.15)]"
                >
                  Enter Kageyomi
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
