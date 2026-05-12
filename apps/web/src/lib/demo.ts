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

export async function runDemoJob(prompt: string, selectedTools: DemoTool[]): Promise<DemoJobResult> {
  await sleep(650);
  const receipts = selectedTools.length
    ? selectedTools.map((tool) => RECEIPT_LIBRARY[tool])
    : [RECEIPT_LIBRARY.ETF, RECEIPT_LIBRARY.News];

  const themes: string[] = [];
  if (selectedTools.includes("ETF")) {
    themes.push("ETF flows remain resilient after a brief net outflow dip.");
  }
  if (selectedTools.includes("Macro")) {
    themes.push("Macro surprise risk is still the cleanest short-term volatility trigger.");
  }
  if (selectedTools.includes("News")) {
    themes.push("News sentiment has stayed constructive because institutional demand keeps absorbing risk-off headlines.");
  }
  if (selectedTools.includes("Indices")) {
    themes.push("Sector breadth favors higher-beta crypto beta rather than purely defensive positioning.");
  }
  if (selectedTools.includes("BTC Treasuries")) {
    themes.push("Treasury accumulation supports the view that balance-sheet buyers still treat BTC as strategic inventory.");
  }

  return {
    jobId: `0x${Math.random().toString(16).slice(2).padEnd(64, "0").slice(0, 64)}`,
    statusTimeline: ["pending", "processing", "verifying", "verified"],
    statusDetails: [
      "Encrypting prompt, splitting the AES key, and pinning ciphertext to IPFS.",
      `Fetching ${receipts.length} SoSoValue tool response${receipts.length === 1 ? "" : "s"}, canonicalizing payloads, and running Groq with temperature 0 and seed 42.`,
      "Leader and verifiers replay against the exact same canonical receipts until 2/3 commitments match.",
      "Posting UAVP metadata on-chain and unlocking local-only output decryption.",
    ],
    encryptedOutput: "ciphertext://kageyomi-demo-output",
    decryptedOutput:
      `Kageyomi confidential analysis for "${prompt}"\n\n${themes.join(" ")}\n\nVerification note: the final insight was reproduced from frozen canonical receipts rather than live API re-fetches, so the output hash remains stable across honest verifier nodes.`,
    receiptRoot: "0x95470eb51b8f38cbf9fef22c1e45223a17f51824d3dcf3166d055e693d141ddb",
    receiptsCID: "QmXDemoReceiptsCID1234567890",
    traceHash: "0xfe974950b68b293a9bc6f1cb858efada5d95f57d3a3a45a52b5aeb27a6659995",
    receipts,
  };
}

export async function decryptDemoOutput(output: string): Promise<string> {
  await sleep(1200);
  return output;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
