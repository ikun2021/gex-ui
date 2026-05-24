import type { TickerItem } from './quotes'

/** WebSocket 推送的 24h Ticker（与后端 common/proto/ws.Ticker 一致） */
export interface WsTickerPayload {
  lp: string
  h: string
  l: string
  a: string
  v: string
  r: string
  s: string
  l24p: string
}

export interface WsTickerMessage {
  t: string
  p: WsTickerPayload
}

export function buildTickerWsTopic(symbolApi: string) {
  return `ticker@${symbolApi}`
}

export function wsTickerPayloadToItem(p: WsTickerPayload): TickerItem {
  return {
    last_price: p.lp,
    high: p.h,
    low: p.l,
    amount: p.a,
    volume: p.v,
    price_range: p.r,
    last24_price: p.l24p,
    symbol: p.s,
  }
}

export function parseWsTickerMessage(raw: unknown): WsTickerMessage | null {
  let data = raw
  if (typeof data === 'string') {
    const lower = data.toLowerCase()
    if (lower === 'pong' || lower === 'ping')
      return null
    try {
      data = JSON.parse(data) as unknown
    }
    catch {
      return null
    }
  }
  if (typeof data !== 'object' || data === null)
    return null
  const msg = data as Record<string, unknown>
  if (typeof msg.t !== 'string' || !msg.t.startsWith('ticker@'))
    return null
  if (typeof msg.p !== 'object' || msg.p === null)
    return null
  return msg as unknown as WsTickerMessage
}
