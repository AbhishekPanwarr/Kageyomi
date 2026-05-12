export type JobStatus = "pending" | "processing" | "verifying" | "verified" | "failed";
export type DemoTool = "ETF" | "Macro" | "News" | "Indices" | "BTC Treasuries";

export type DemoReceipt = {
  toolName: string;
  paramsHash: string;
  responseHash: string;
  canonicalData: string;
  signature?: string;
};

export type DemoJobResult = {
  jobId: string;
  statusTimeline: JobStatus[];
  statusDetails: string[];
  encryptedOutput: string;
  decryptedOutput: string;
  receiptRoot: string;
  receiptsCID: string;
  traceHash: string;
  receipts: DemoReceipt[];
  activeAgents: string[];
  reasoningSteps: string[];
};

const RECEIPT_LIBRARY: Record<DemoTool, DemoReceipt> = {
  ETF: {
    toolName: "fetch_ETF_summary_history",
    paramsHash: "0x243b6258543c5c8ee1db021f91e30d24ee2219feb885b5c0c271fd3b5fe166dd",
    responseHash: "0x4a076ce907c0b9d7ce1b38f12e2f218940b6659e4301642db8375f29ee8c89fc",
    canonicalData:
      '[{"date":"2026-05-10","total_net_inflow":12345678.123457,"total_value_traded":2200000000},{"date":"2026-05-09","total_net_inflow":-4567890.222222,"total_value_traded":1980000000.444444}]',
    signature: "0xnode-signature-etf",
  },
  Macro: {
    toolName: "fetch_macro_history",
    paramsHash: "0x792ca29d049960ba5ba10c6f5dbde1dbbad74000d2fcf88a356a32a2ca09c6c3",
    responseHash: "0x64163faf6f3019290ff0a11e5f24f2f8f9a750b135390596817429c278ee7f71",
    canonicalData: '[{"actual":3.456789,"date":"2026-04-10","forecast":3.4,"previous":3.2}]',
    signature: "0xnode-signature-macro",
  },
  News: {
    toolName: "fetch_news_search",
    paramsHash: "0x3a88cd22acdda5a05a884dec5008e066e9fa3bd592a8ac1b1b9518077d37a5de",
    responseHash: "0x16871a46b114cffbe636eb53cdfd5122c89fb95e4afc528dffd9a6d2276fbd97",
    canonicalData: "btc etf demand remains strong institutional inflows accelerated this week. news-1",
    signature: "0xnode-signature-news",
  },
  Indices: {
    toolName: "fetch_index_snapshot",
    paramsHash: "0x53b6cb6e4a475bfc59e62ea6ab8e3c153d654fce8b8a308a2ce10abf64d4ec64",
    responseHash: "0x8787a8daea4d2dc3f5f33e4dd6f040218a68d754b410d377f3b1f5dc8c41c7f7",
    canonicalData:
      '{"ticker":"ssimag7","change_24h":2.184321,"volume":183000000.112233,"leaders":["BTC","SOL","ETH"]}',
    signature: "0xnode-signature-index",
  },
  "BTC Treasuries": {
    toolName: "fetch_btc_treasury_history",
    paramsHash: "0x22fe1fc1faaad932a251ab52664ad954eecc8ad809aafd63b422337b324f9882",
    responseHash: "0xa799f0b0fc4c12fc90f8358bc84e9f5ca996fe936bf866ee3cdbd8ff0f7768d5",
    canonicalData:
      '[{"ticker":"MSTR","date":"2026-05-03","btc_added":1895,"cash_cost":179000000.0},{"ticker":"COIN","date":"2026-05-01","btc_added":250,"cash_cost":23750000.0}]',
    signature: "0xnode-signature-treasury",
  },
};

export async function runDemoJob(prompt: string, agent: string): Promise<DemoJobResult> {
  const statusDetails = [
    "Encrypting prompt, splitting the AES key, and pinning ciphertext to IPFS.",
    `Executing Kageyomi LangGraph pipeline with Groq (temperature=0, seed=42) and fetching SoSoValue data.`,
    "Leader and verifiers replay against the exact same canonical receipts until 2/3 commitments match.",
    "Posting UAVP metadata on-chain and unlocking local-only output decryption.",
  ];

  try {
    const response = await fetch("http://127.0.0.1:8001/uavp/execute", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, agent, max_tools: 5 }),
    });

    if (!response.ok) {
      throw new Error(`Agent execution failed: ${response.statusText}`);
    }

    const data = await response.json();

    return {
      jobId: data.jobId || `0x${Math.random().toString(16).slice(2).padEnd(64, "0").slice(0, 64)}`,
      statusTimeline: ["pending", "processing", "verifying", "verified"],
      statusDetails,
      encryptedOutput: "ciphertext://kageyomi-demo-output",
      decryptedOutput: `Kageyomi confidential analysis for "${prompt}"\n\n${data.output}\n\nVerification note: the final insight was reproduced from frozen canonical receipts rather than live API re-fetches, so the output hash remains stable across honest verifier nodes.`,
      receiptRoot: data.receiptRoot || "0x95470eb51b8f38cbf9fef22c1e45223a17f51824d3dcf3166d055e693d141ddb",
      receiptsCID: data.receiptsCID || "QmXDemoReceiptsCID1234567890",
      traceHash: data.traceHash || "0xfe974950b68b293a9bc6f1cb858efada5d95f57d3a3a45a52b5aeb27a6659995",
      receipts: data.receipts || [],
      activeAgents: data.activeAgents || data.active_agents || [agent],
      reasoningSteps: data.reasoningSteps || data.reasoning_steps || [],
    };
  } catch (error) {
    console.error(error);
    return {
      jobId: `0x${Math.random().toString(16).slice(2).padEnd(64, "0").slice(0, 64)}`,
      statusTimeline: ["pending", "processing", "failed"],
      statusDetails: [
        "Encrypting prompt, splitting the AES key, and pinning ciphertext to IPFS.",
        `Executing Kageyomi LangGraph pipeline with Groq (temperature=0, seed=42) and fetching SoSoValue data.`,
        "Failed to execute agent. Check backend logs.",
      ],
      encryptedOutput: "ciphertext://error",
      decryptedOutput: "Execution failed: " + (error as Error).message,
      receiptRoot: "0x",
      receiptsCID: "",
      traceHash: "0x",
      receipts: [],
      activeAgents: [agent],
      reasoningSteps: [],
    };
  }
}

export async function decryptDemoOutput(output: string): Promise<string> {
  await sleep(1200);
  return output;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
