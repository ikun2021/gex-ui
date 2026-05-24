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

/**
 * K 线周期（与后端 KlineType 枚举一致）
 * Unknown=0, Min1=1, Min5=2, Min10=3, Min15=4, Min30=5,
 * Hour1=6, Hour4=7, Day1=8, Week1=9, Month1=10
 */
export const KLINE_TYPE = {
  UNKNOWN: 0,
  MIN1: 1,
  MIN5: 2,
  MIN10: 3,
  MIN15: 4,
  MIN30: 5,
  HOUR1: 6,
  HOUR4: 7,
  DAY1: 8,
  WEEK1: 9,
  MONTH1: 10,
} as const

/** UI 周期标签 → kline_type */
export const TIMEFRAME_TO_KLINE_TYPE: Record<string, number> = {
  分时: KLINE_TYPE.MIN1,
  '1m': KLINE_TYPE.MIN1,
  '5m': KLINE_TYPE.MIN5,
  '10m': KLINE_TYPE.MIN10,
  '15m': KLINE_TYPE.MIN15,
  '30m': KLINE_TYPE.MIN30,
  '1H': KLINE_TYPE.HOUR1,
  '4H': KLINE_TYPE.HOUR4,
  '1D': KLINE_TYPE.DAY1,
  '1W': KLINE_TYPE.WEEK1,
  '1M': KLINE_TYPE.MONTH1,
}

export const KLINE_TIMEFRAMES = Object.keys(TIMEFRAME_TO_KLINE_TYPE)

export interface KlineItem {
  open: string
  high: string
  low: string
  close: string
  amount: string
  volume: string
  start_time: number
  end_time: number
  price_range: string
  symbol: string
}

export interface GetKlineListParams {
  symbol: string
  kline_type: number
  start_time: number
  end_time: number
}

export interface GetKlineListResult {
  kline_list: KlineItem[]
}

/** SVG 蜡烛图坐标（0–100，数值越大价格越高） */
export interface ChartCandle {
  o: number
  h: number
  l: number
  c: number
  up: boolean
}

/** 视口内单根 K 线绘制数据 */
export interface ChartCandleView extends ChartCandle {
  x: number
  w: number
}

export interface ChartPriceTick {
  label: string
  /** 0–100，用于纵轴定位 */
  y: number
}

export interface ChartLayout {
  candles: ChartCandleView[]
  labels: string[]
  priceTicks: ChartPriceTick[]
  startIndex: number
  total: number
}

export const CHART_VISIBLE_MIN = 24
export const CHART_VISIBLE_MAX = 160
export const CHART_VISIBLE_DEFAULT = 56

export function resolveKlineType(timeframe: string) {
  return TIMEFRAME_TO_KLINE_TYPE[timeframe] ?? KLINE_TYPE.MIN1
}

export function getKlineList(params: GetKlineListParams) {
  return post<GetKlineListResult>('/quotes/v1/get_kline_list', params)
}

function formatAxisPrice(value: number) {
  if (Number.isNaN(value))
    return '—'
  if (value >= 1000)
    return value.toLocaleString('en-US', { maximumFractionDigits: 2 })
  if (value >= 1)
    return value.toFixed(4).replace(/\.?0+$/, '')
  return value.toPrecision(4)
}

/** 按视口切片并计算坐标（仅对可见区间缩放，避免整段行情被压成一条线） */
export function buildChartLayout(
  items: KlineItem[],
  startIndex: number,
  visibleCount: number,
): ChartLayout {
  const total = items.length
  if (total === 0) {
    return { candles: [], labels: [], priceTicks: [], startIndex: 0, total: 0 }
  }

  const maxStart = Math.max(0, total - visibleCount)
  const start = Math.min(Math.max(0, startIndex), maxStart)
  const slice = items.slice(start, start + visibleCount)

  const prices = slice.flatMap(k => [
    Number(k.open),
    Number(k.high),
    Number(k.low),
    Number(k.close),
  ]).filter(n => !Number.isNaN(n))

  if (prices.length === 0) {
    return { candles: [], labels: [], priceTicks: [], startIndex: start, total }
  }

  let min = Math.min(...prices)
  let max = Math.max(...prices)
  if (max === min) {
    const mid = min || 1
    min = mid * 0.999
    max = mid * 1.001
  }

  const pad = (max - min) * 0.08
  const span = max - min + pad * 2
  const toY = (price: number) => ((price - min + pad) / span) * 100

  const slotW = 100 / slice.length
  const candles: ChartCandleView[] = slice.map((k, i) => {
    const o = Number(k.open)
    const h = Number(k.high)
    const l = Number(k.low)
    const c = Number(k.close)
    return {
      x: slotW * i + slotW / 2,
      w: Math.max(0.35, slotW * 0.68),
      o: toY(o),
      h: toY(h),
      l: toY(l),
      c: toY(c),
      up: c >= o,
    }
  })

  const labels: string[] = []
  const labelSlots = Math.min(7, slice.length)
  if (labelSlots === 1) {
    labels.push(formatChartTime(slice[0]!.start_time))
  }
  else {
    const step = Math.max(1, Math.floor((slice.length - 1) / (labelSlots - 1)))
    for (let i = 0; i < slice.length; i += step)
      labels.push(formatChartTime(slice[i]!.start_time))
    const last = slice[slice.length - 1]!
    const lastLab = formatChartTime(last.start_time)
    if (labels[labels.length - 1] !== lastLab)
      labels.push(lastLab)
  }

  const priceTicks: ChartPriceTick[] = []
  for (let i = 0; i <= 4; i++) {
    const price = max + pad - (span * i) / 4
    priceTicks.push({
      label: formatAxisPrice(price),
      y: (i / 4) * 100,
    })
  }

  return { candles, labels, priceTicks, startIndex: start, total }
}

/** @deprecated 使用 buildChartLayout */
export function mapKlineListToCandles(items: KlineItem[]): ChartCandle[] {
  return buildChartLayout(items, Math.max(0, items.length - CHART_VISIBLE_DEFAULT), CHART_VISIBLE_DEFAULT).candles
}

function formatChartTime(ts: number) {
  const sec = ts > 1e12 ? Math.floor(ts / 1000) : ts
  const d = new Date(sec * 1000)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function buildChartLabels(items: KlineItem[], slots = 7): string[] {
  if (items.length === 0)
    return []
  if (items.length === 1)
    return [formatChartTime(items[0]!.start_time)]

  const labels: string[] = []
  const step = Math.max(1, Math.floor((items.length - 1) / (slots - 1)))
  for (let i = 0; i < items.length; i += step) {
    labels.push(formatChartTime(items[i]!.start_time))
  }
  const last = items[items.length - 1]!
  if (labels[labels.length - 1] !== formatChartTime(last.start_time))
    labels.push(formatChartTime(last.start_time))
  return labels
}

export function calcKlineChangePct(items: KlineItem[]): string {
  if (items.length < 2)
    return '0.00%'
  const first = Number(items[0]!.open)
  const last = Number(items[items.length - 1]!.close)
  if (!first || Number.isNaN(first) || Number.isNaN(last))
    return '0.00%'
  const pct = ((last - first) / first) * 100
  const sign = pct >= 0 ? '+' : ''
  return `${sign}${pct.toFixed(2)}%`
}

export interface TickerItem {
  last_price: string
  high: string
  low: string
  amount: string
  volume: string
  price_range: string
  last24_price: string
  symbol: string
}

export interface GetTickerListParams {
  symbol: string
}

export interface GetTickerListResult {
  ticker_list: TickerItem[]
}

export function getTickerList(symbol: string) {
  return post<GetTickerListResult>('/quotes/v1/get_ticker_list', {
    symbol,
  } satisfies GetTickerListParams)
}

export function formatTickerPrice(value: string) {
  const n = Number(value)
  if (Number.isNaN(n))
    return value
  return n.toLocaleString('en-US', { maximumFractionDigits: 8 })
}

export function formatTickerChangePct(ticker: TickerItem) {
  const range = ticker.price_range?.trim()
  if (range && range !== '0' && range !== '0.000') {
    if (range.includes('%'))
      return range.startsWith('+') || range.startsWith('-') ? range : `+${range}`
    const n = Number(range)
    if (!Number.isNaN(n))
      return `${n >= 0 ? '+' : ''}${n}%`
  }
  const last = Number(ticker.last_price)
  const prev = Number(ticker.last24_price)
  if (!prev || Number.isNaN(last) || Number.isNaN(prev))
    return '0.00%'
  const pct = ((last - prev) / prev) * 100
  return `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%`
}

export function isTickerChangeUp(ticker: TickerItem) {
  const chg = formatTickerChangePct(ticker)
  return !chg.startsWith('-')
}

export const DEFAULT_TICK_LIMIT = 20

export interface TickItem {
  price: string
  qty: string
  amount: string
  timestamp: number
  symbol: string
  taker_is_buyer: boolean
}

export interface GetTickListParams {
  symbol: string
  limit: number
}

export interface GetTickListResult {
  tick_list: TickItem[]
}

/** 最新成交展示行 */
export interface TradeRow {
  price: string
  amount: string
  time: string
  side: 'buy' | 'sell'
}

export function getTickList(symbol: string, limit = DEFAULT_TICK_LIMIT) {
  return post<GetTickListResult>('/quotes/v1/get_tick_list', {
    symbol,
    limit,
  } satisfies GetTickListParams)
}

export function formatTickTime(timestamp: number) {
  const sec = timestamp > 1e12 ? Math.floor(timestamp / 1000) : timestamp
  const d = new Date(sec * 1000)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

export function mapTickListToTradeRows(ticks: TickItem[]): TradeRow[] {
  return ticks.map(tick => ({
    price: tick.price,
    amount: formatDepthAmount(tick.qty),
    time: formatTickTime(tick.timestamp),
    side: tick.taker_is_buyer ? 'buy' : 'sell',
  }))
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
