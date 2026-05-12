"use client";

type Receipt = {
  toolName: string;
  paramsHash: string;
  responseHash: string;
  canonicalData: string;
  signature?: string;
};

type ReceiptsModalProps = {
  open: boolean;
  receiptsCID: string;
  receiptRoot: string;
  receipts: Receipt[];
  onClose: () => void;
};

export default function ReceiptsModal({
  open,
  receiptsCID,
  receiptRoot,
  receipts,
  onClose,
}: ReceiptsModalProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/70 p-4 backdrop-blur-sm">
      <div className="mx-auto max-w-5xl rounded-3xl border border-white/10 bg-ink p-6 shadow-2xl">
        <div className="mb-4 flex items-start justify-between gap-6">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-sand/55">Frozen Context</p>
            <h3 className="text-2xl font-semibold text-sand">Canonical Receipts</h3>
            <p className="mt-2 text-sm text-sand/65">CID: {receiptsCID || "Unavailable"} · Root: {receiptRoot || "Unavailable"}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/10 px-3 py-2 text-xs uppercase tracking-[0.2em] text-sand/70 hover:bg-white/10"
          >
            Close
          </button>
        </div>

        <div className="overflow-hidden rounded-2xl border border-white/10">
          <div className="grid grid-cols-[1.2fr_1fr_1fr_2fr] gap-3 bg-white/5 px-4 py-3 text-[11px] uppercase tracking-[0.2em] text-sand/60">
            <span>Tool</span>
            <span>Params Hash</span>
            <span>Response Hash</span>
            <span>Canonical Data</span>
          </div>
          <div className="max-h-[420px] overflow-y-auto">
            {receipts.map((receipt, index) => (
              <div
                key={`${receipt.toolName}-${index}`}
                className="grid grid-cols-[1.2fr_1fr_1fr_2fr] gap-3 border-t border-white/10 px-4 py-4 text-xs text-sand/80"
              >
                <div>
                  <p className="font-semibold text-sand">{receipt.toolName}</p>
                  <p className="mt-1 text-[11px] text-sand/45">{receipt.signature ? "Signed by node" : "Unsigned mock receipt"}</p>
                </div>
                <code className="break-all text-[11px] text-sand/70">{receipt.paramsHash}</code>
                <code className="break-all text-[11px] text-sand/70">{receipt.responseHash}</code>
                <pre className="whitespace-pre-wrap break-words rounded-xl bg-black/25 p-3 font-mono text-[11px] text-sand/75">
                  {receipt.canonicalData}
                </pre>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
