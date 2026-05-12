"use client";

import { useState } from "react";

import ProcessingPanel from "../components/ProcessingPanel";
import QueryInput from "../components/QueryInput";
import ReceiptsModal from "../components/ReceiptsModal";
import ResultPanel from "../components/ResultPanel";
import {
  decryptDemoOutput,
  runDemoJob,
  type DemoReceipt,
  type DemoTool,
  type JobStatus,
} from "../lib/demo";

export default function Home() {
  const [prompt, setPrompt] = useState("BTC ETF inflow vs CPI surprises + institutional news sentiment");
  const [selectedTools, setSelectedTools] = useState<DemoTool[]>(["ETF", "Macro", "News"]);
  const [jobId, setJobId] = useState("");
  const [status, setStatus] = useState<JobStatus>("pending");
  const [statusDetail, setStatusDetail] = useState("Submit a confidential prompt to watch the full UAVP verification flow.");
  const [encryptedOutput, setEncryptedOutput] = useState("");
  const [decryptedOutput, setDecryptedOutput] = useState("");
  const [receiptRoot, setReceiptRoot] = useState("");
  const [receiptsCID, setReceiptsCID] = useState("");
  const [traceHash, setTraceHash] = useState("");
  const [receipts, setReceipts] = useState<DemoReceipt[]>([]);
  const [showReceipts, setShowReceipts] = useState(false);
  const [busy, setBusy] = useState(false);

  async function handleSubmit() {
    setBusy(true);
    setStatus("pending");
    setStatusDetail("Encrypting prompt, splitting output keys, and preparing the job for confidential execution.");
    setJobId("");
    setEncryptedOutput("");
    setReceiptRoot("");
    setReceiptsCID("");
    setTraceHash("");
    setReceipts([]);
    setShowReceipts(false);
    setDecryptedOutput("");
    const result = await runDemoJob(prompt, selectedTools);
    setJobId(result.jobId);
    setEncryptedOutput(result.encryptedOutput);
    setReceiptRoot(result.receiptRoot);
    setReceiptsCID(result.receiptsCID);
    setTraceHash(result.traceHash);
    setReceipts(result.receipts);

    for (const [index, nextStatus] of result.statusTimeline.entries()) {
      setStatus(nextStatus);
      setStatusDetail(result.statusDetails[index] ?? "");
      await sleep(nextStatus === "verified" ? 300 : 1100);
    }

    setDecryptedOutput(result.decryptedOutput);
    setBusy(false);
  }

  async function handleDecrypt() {
    return decryptDemoOutput(decryptedOutput || "No decrypted output available.");
  }

  function toggleTool(tool: string) {
    setSelectedTools((current) =>
      current.includes(tool as DemoTool)
        ? current.filter((entry) => entry !== tool)
        : [...current, tool as DemoTool],
    );
  }

  return (
    <main className="min-h-screen px-4 py-10 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 grid gap-4 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-sand/60">Wave 1 Submission</p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight text-sand sm:text-5xl">
              Kageyomi
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-sand/72">
              Confidential SoSoValue research with frozen-context verifier replay, on-chain trace anchoring, and local-only output reveal.
            </p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-black/20 p-5 text-sm text-sand/70 shadow-2xl backdrop-blur">
            <p className="font-semibold text-sand">Judge Flow</p>
            <p className="mt-2">Encrypt prompt → fetch SoSoValue → canonicalize → verifier replay → anchor trace hash → decrypt locally.</p>
          </div>
        </div>

        <div className="mb-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-sand/50">Privacy Rail</p>
            <p className="mt-2 text-sm leading-6 text-sand/70">
              AES-256-GCM in the browser, CoFHE-gated key release, and no plaintext research prompt in transit.
            </p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-sand/50">Verification Rail</p>
            <p className="mt-2 text-sm leading-6 text-sand/70">
              Tool receipts are canonicalized once, frozen on IPFS, and replayed by verifiers without live API drift.
            </p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-sand/50">Decision Rail</p>
            <p className="mt-2 text-sm leading-6 text-sand/70">
              Groq generates the final insight from deterministic receipts, then the output hash is posted for quorum agreement.
            </p>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-6">
            <QueryInput
              prompt={prompt}
              onPromptChange={setPrompt}
              selectedTools={selectedTools}
              onToggleTool={toggleTool}
              onSubmit={handleSubmit}
              busy={busy}
            />
            <ProcessingPanel
              jobId={jobId}
              status={status}
              statusDetail={statusDetail}
              receiptRoot={receiptRoot}
              receiptsCID={receiptsCID}
              traceHash={traceHash}
              onShowReceipts={() => setShowReceipts(true)}
            />
          </div>

          <ResultPanel
            output={encryptedOutput}
            status={status}
            traceHash={traceHash}
            onDecrypt={handleDecrypt}
          />
        </div>

        <ReceiptsModal
          open={showReceipts}
          receiptsCID={receiptsCID}
          receiptRoot={receiptRoot}
          receipts={receipts}
          onClose={() => setShowReceipts(false)}
        />
      </div>
    </main>
  );
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
