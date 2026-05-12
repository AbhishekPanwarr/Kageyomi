interface ProcessingPanelProps {
  jobId: string;
  status: 'pending' | 'processing' | 'verifying' | 'verified' | 'failed';
  statusDetail?: string;
  receiptRoot?: string;
  receiptsCID?: string;
  traceHash?: string;
  onShowReceipts: () => void;
}

export default function ProcessingPanel({ 
  jobId, status, statusDetail, receiptRoot, receiptsCID, traceHash, onShowReceipts 
}: ProcessingPanelProps) {
  const statusMap = {
    pending: "Encrypting & Uploading...",
    processing: "Fetching SoSoValue → Canonicalizing → Groq Reasoning...",
    verifying: "Quorum Verifying (2/3 required)...",
    verified: "Trace Hash Posted → VERIFIED",
    failed: "Verification Failed"
  };
  const steps = [
    { key: "pending", label: "Prompt encrypted + pinned", done: status !== "failed" && status !== "pending" ? true : status === "pending" },
    { key: "processing", label: "Canonical receipts generated", done: status === "verifying" || status === "verified" },
    { key: "verifying", label: "Verifier replay hash match", done: status === "verified" },
    { key: "verified", label: "Trace anchored on-chain", done: status === "verified" },
  ];

  return (
    <section className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur">
      <div className="mb-4">
        <p className="text-xs uppercase tracking-[0.3em] text-sand/60">Panel 2</p>
        <h2 className="text-2xl font-semibold text-sand">Processing Status</h2>
      </div>
      <h3 className="text-lg font-semibold text-sand">{statusMap[status] || "Waiting..."}</h3>
      {jobId ? <p className="mt-2 text-xs font-mono text-sand/50">Job ID: {jobId}</p> : null}
      {statusDetail ? <p className="mt-3 max-w-2xl text-sm leading-6 text-sand/65">{statusDetail}</p> : null}

      <div className="mt-5 grid gap-3 rounded-2xl border border-white/10 bg-black/20 p-4">
        {steps.map((step) => (
          <div key={step.key} className="flex items-center justify-between gap-4 text-sm">
            <span className="text-sand/75">{step.label}</span>
            <span
              className={`rounded-full px-2.5 py-1 text-[10px] uppercase tracking-[0.2em] ${
                step.done ? "bg-emerald-400/15 text-emerald-200" : "bg-white/8 text-sand/45"
              }`}
            >
              {step.done ? "done" : "waiting"}
            </span>
          </div>
        ))}
      </div>
      
      {status === "verified" && (
        <div className="mt-4 space-y-2 rounded-2xl border border-white/10 bg-black/20 p-4 text-xs font-mono">
          <p><span className="text-sand/40">Receipt Root:</span> {receiptRoot?.slice(0, 24)}...</p>
          <p><span className="text-sand/40">CID:</span> {receiptsCID?.slice(0, 28)}...</p>
          <button 
            onClick={onShowReceipts} 
            className="mt-2 text-ember underline underline-offset-4 transition hover:text-[#ef8c67]"
          >
            View Canonical Receipts
          </button>
        </div>
      )}
      
      <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/10">
        <div 
          className="h-full animate-pulse bg-gradient-to-r from-ember via-[#f1b26b] to-moss transition-all" 
          style={{ 
            width: status === 'verified' ? '100%' : 
                   status === 'verifying' ? '70%' : 
                   status === 'processing' ? '40%' : '10%' 
          }}
        />
      </div>
      
      {traceHash && (
        <div className="mt-4 text-xs text-sand/55">
          <a 
            href={`https://explorer.helium.fhenix.zone/tx/${traceHash}`} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-ember hover:underline"
          >
            View on Fhenix Explorer
          </a>
        </div>
      )}
    </section>
  );
}
