import { fetchSosoValue } from './sosovalue-client.js'

export type GroqToolDefinition = {
  type: 'function'
  function: {
    name: string
    description: string
    parameters: {
      type: 'object'
      properties: Record<string, unknown>
      required?: string[]
    }
  }
}

export const SOSO_TOOLS: GroqToolDefinition[] = [
  {
    type: 'function',
    function: {
      name: 'fetch_ETF_summary_history',
      description: 'Get historical net inflow or outflow data for crypto ETFs',
      parameters: {
        type: 'object',
        properties: {
          symbol: { type: 'string', enum: ['BTC', 'ETH', 'SOL', 'XRP', 'DOGE'] },
          country_code: { type: 'string', enum: ['US', 'HK'] },
          limit: { type: 'integer', default: 7, maximum: 30 },
        },
        required: ['symbol', 'country_code'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'fetch_macro_history',
      description: 'Get historical macroeconomic event data such as CPI, NFP, and FOMC',
      parameters: {
        type: 'object',
        properties: {
          event: { type: 'string', enum: ['CPI', 'Nonfarm Payrolls', 'FOMC'] },
          limit: { type: 'integer', default: 5, maximum: 10 },
        },
        required: ['event'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'fetch_news_search',
      description: 'Search crypto news by keyword across the latest seven days',
      parameters: {
        type: 'object',
        properties: {
          keyword: { type: 'string' },
          category: { type: 'integer', enum: [1, 2, 3, 4, 7, 13], default: 1 },
          page_size: { type: 'integer', default: 10, maximum: 20 },
        },
        required: ['keyword'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'fetch_btc_treasury_history',
      description: 'Get publicly listed company BTC purchase history',
      parameters: {
        type: 'object',
        properties: {
          ticker: { type: 'string', enum: ['MSTR', 'TSLA', 'COIN', 'HOOD'] },
          limit: { type: 'integer', default: 5, maximum: 10 },
        },
        required: ['ticker'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'fetch_index_snapshot',
      description: 'Get the current SoSoValue index performance snapshot',
      parameters: {
        type: 'object',
        properties: {
          ticker: { type: 'string', enum: ['ssimag7', 'ssilayer1'] },
        },
        required: ['ticker'],
      },
    },
  },
]

type EtfArgs = {
  symbol: 'BTC' | 'ETH' | 'SOL' | 'XRP' | 'DOGE'
  country_code: 'US' | 'HK'
  limit?: number
}

type MacroArgs = {
  event: 'CPI' | 'Nonfarm Payrolls' | 'FOMC'
  limit?: number
}

type NewsArgs = {
  keyword: string
  category?: 1 | 2 | 3 | 4 | 7 | 13
  page_size?: number
}

type BtcTreasuryArgs = {
  ticker: 'MSTR' | 'TSLA' | 'COIN' | 'HOOD'
  limit?: number
}

type IndexArgs = {
  ticker: 'ssimag7' | 'ssilayer1'
}

export async function executeSosoTool(name: string, args: unknown): Promise<unknown> {
  switch (name) {
    case 'fetch_ETF_summary_history': {
      const input = args as EtfArgs
      return fetchSosoValue('/etfs/summary-history', {
        symbol: input.symbol,
        country_code: input.country_code,
        limit: clamp(input.limit ?? 7, 1, 30),
      })
    }
    case 'fetch_macro_history': {
      const input = args as MacroArgs
      return fetchSosoValue(`/macro/events/${encodeURIComponent(input.event)}/history`, {
        limit: clamp(input.limit ?? 5, 1, 10),
      })
    }
    case 'fetch_news_search': {
      const input = args as NewsArgs
      return fetchSosoValue('/news/search', {
        keyword: input.keyword,
        category: input.category ?? 1,
        page_size: clamp(input.page_size ?? 10, 1, 20),
      })
    }
    case 'fetch_btc_treasury_history': {
      const input = args as BtcTreasuryArgs
      return fetchSosoValue(`/btc-treasuries/${encodeURIComponent(input.ticker)}/purchase-history`, {
        limit: clamp(input.limit ?? 5, 1, 10),
      })
    }
    case 'fetch_index_snapshot': {
      const input = args as IndexArgs
      return fetchSosoValue(`/indices/${encodeURIComponent(input.ticker)}/market-snapshot`)
    }
    default:
      throw new Error(`Unsupported tool: ${name}`)
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}
