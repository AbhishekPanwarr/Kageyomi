"use client";

type QueryInputProps = {
  prompt: string;
  onPromptChange: (value: string) => void;
  selectedTools: string[];
  onToggleTool: (tool: string) => void;
  onSubmit: () => void;
  busy: boolean;
};

const TOOLS = ["ETF", "Macro", "News", "Indices", "BTC Treasuries"];

export default function QueryInput({
  prompt,
  onPromptChange,
  selectedTools,
  onToggleTool,
  onSubmit,
  busy,
}: QueryInputProps) {
  return (
    <section className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-sand/60">Panel 1</p>
          <h2 className="text-2xl font-semibold text-sand">Confidential Query</h2>
        </div>
        <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs uppercase tracking-[0.2em] text-emerald-200">
          AES + CoFHE
        </span>
      </div>

      <textarea
        value={prompt}
        onChange={(event) => onPromptChange(event.target.value)}
        placeholder="Correlation between BTC ETF inflows and CPI surprises over last 7 days"
        className="min-h-[180px] w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-4 text-sm text-sand outline-none transition focus:border-ember/60 focus:ring-2 focus:ring-ember/30"
      />

      <div className="mt-5 flex flex-wrap gap-2">
        {TOOLS.map((tool) => {
          const active = selectedTools.includes(tool);
          return (
            <button
              key={tool}
              type="button"
              onClick={() => onToggleTool(tool)}
              className={`rounded-full px-3 py-2 text-xs uppercase tracking-[0.2em] transition ${
                active
                  ? "border border-ember/40 bg-ember/20 text-sand"
                  : "border border-white/10 bg-white/5 text-sand/70 hover:bg-white/10"
              }`}
            >
              {tool}
            </button>
          );
        })}
      </div>

      <div className="mt-6 flex items-center justify-between gap-4">
        <p className="max-w-xl text-sm text-sand/65">
          Queries are encrypted before execution. Verifiers replay against frozen canonical receipts instead of live APIs.
        </p>
        <button
          type="button"
          onClick={onSubmit}
          disabled={busy || !prompt.trim()}
          className="rounded-full bg-ember px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#eb7850] disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-sand/40"
        >
          {busy ? "Running..." : "Run Confidential Analysis"}
        </button>
      </div>
    </section>
  );
}
