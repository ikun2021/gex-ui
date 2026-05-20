import { post } from './request'
import { symbolToApi } from './order'

export interface DepthLevel {
  base_amount: string
  price: string
  quote_amount: string
}

export interface GetDepthResult {
  version: number
  asks: DepthLevel[]
  bids: DepthLevel[]
}

/** 订单簿展示行 */
export interface OrderBookRow {
  price: string
  amount: string
  total: string
  depth: number
}

export const DEFAULT_DEPTH_LEVEL = 20

export interface GetDepthParams {
  symbol: string
  level: number
}

export function getDepth(symbol: string, level = DEFAULT_DEPTH_LEVEL) {
  return post<GetDepthResult>('/quotes/v1/get_depth', {
    symbol,
    level,
  } satisfies GetDepthParams)
}

function formatDepthAmount(value: string) {
  const n = Number(value)
  if (Number.isNaN(n))
    return value
  if (n >= 1_000_000)
    return `${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000)
    return `${(n / 1_000).toFixed(2)}K`
  return n.toLocaleString('en-US', { maximumFractionDigits: 4 })
}

function mapDepthSide(levels: DepthLevel[]): OrderBookRow[] {
  const sorted = [...levels].sort((a, b) => Number(b.price) - Number(a.price))
  let cum = 0
  const amounts = sorted.map(l => Number(l.base_amount) || 0)
  const maxCum = amounts.reduce((sum, n) => sum + n, 0) || 1

  return sorted.map((level, i) => {
    cum += amounts[i] ?? 0
    return {
      price: level.price,
      amount: formatDepthAmount(level.base_amount),
      total: formatDepthAmount(String(cum)),
      depth: Math.max(8, Math.round((cum / maxCum) * 100)),
    }
  })
}

export function mapDepthToOrderBook(asks: DepthLevel[], bids: DepthLevel[]) {
  return {
    asks: mapDepthSide(asks),
    bids: mapDepthSide(bids),
  }
}

export function getDepthSymbol(displayPair: string) {
  return symbolToApi(displayPair)
}

export function calcBookMidPrice(asks: DepthLevel[], bids: DepthLevel[]) {
  const bestAsk = [...asks].sort((a, b) => Number(a.price) - Number(b.price))[0]
  const bestBid = [...bids].sort((a, b) => Number(b.price) - Number(a.price))[0]
  if (!bestAsk || !bestBid)
    return ''
  const mid = (Number(bestAsk.price) + Number(bestBid.price)) / 2
  if (Number.isNaN(mid))
    return ''
  return mid.toLocaleString('en-US', { maximumFractionDigits: 4 })
}
