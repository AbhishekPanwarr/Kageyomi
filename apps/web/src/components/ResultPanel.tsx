import { useState } from 'react';

interface ResultPanelProps {
  output: string;
  status: "pending" | "processing" | "verifying" | "verified" | "failed";
  traceHash?: string;
  onDecrypt: () => Promise<string>;
}

export default function ResultPanel({ output, status, traceHash, onDecrypt }: ResultPanelProps) {
  const [decrypted, setDecrypted] = useState<string | null>(null);
  const [decrypting, setDecrypting] = useState(false);
  const decryptLocked = status !== "verified" || !output;

  const handleDecrypt = async () => {
    if (decryptLocked) {
      return;
    }
    setDecrypting(true);
    try {
      const text = await onDecrypt();
      setDecrypted(text);
    } finally {
      setDecrypting(false);
    }
  };

  return (
    <section className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur">
      <div className="mb-4">
        <p className="text-xs uppercase tracking-[0.3em] text-sand/60">Panel 3</p>
        <h2 className="text-2xl font-semibold text-sand">Encrypted Output</h2>
      </div>

      <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
        <p className="text-[11px] uppercase tracking-[0.2em] text-sand/45">Ciphertext Handle</p>
        <p className="mt-2 break-all font-mono text-xs text-sand/75">
          {output || "Awaiting verified encrypted output blob..."}
        </p>
      </div>
      
      {!decrypted ? (
        <button 
          onClick={handleDecrypt} 
          disabled={decrypting || decryptLocked}
          className="mt-4 flex items-center gap-2 rounded-full bg-moss px-4 py-3 font-medium text-sand transition hover:bg-[#628360] disabled:bg-white/10 disabled:text-sand/35"
        >
          {decrypting ? (
            <>
              <span className="animate-spin">⏳</span> Decrypting...
            </>
          ) : (
            <>{decryptLocked ? "Awaiting Verification" : "Decrypt Locally"}</>
          )}
        </button>
      ) : (
        <div className="mt-4 max-h-64 overflow-y-auto rounded-2xl border border-white/10 bg-black/25 p-4 text-sm font-mono whitespace-pre-wrap text-sand/90">
          {decrypted}
        </div>
      )}
      
      <p className="mt-4 text-sm text-sand/60">
        Plaintext is only revealed in-browser after verifier quorum confirms the same output hash from frozen receipts.
      </p>

      {traceHash && (
        <div className="mt-4 text-xs text-sand/55">
          <span className="block">Trace Hash:</span>
          <a 
            href={`https://explorer.helium.fhenix.zone/tx/${traceHash}`} 
            target="_blank" 
            rel="noopener noreferrer"
            className="break-all text-ember hover:underline"
          >
            {traceHash}
          </a>
        </div>
      )}
    </section>
  );
}
