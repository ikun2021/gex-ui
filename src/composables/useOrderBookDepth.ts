import { onUnmounted, ref, watch } from 'vue'
import { ApiError } from '@/api'
import {
  applyDepthSideDelta,
  buildDepthWsTopic,
  depthLevelsFromMap,
  levelsToDepthMap,
  parseWsDepthMessage,
  trimDepthLevels,
} from '@/api/depthWs'
import { getGexWs } from '@/api/ws'
import {
  calcBookMidPrice,
  DEFAULT_DEPTH_LEVEL,
  getDepth,
  getDepthSymbol,
  mapDepthToOrderBook,
  type DepthLevel,
  type OrderBookRow,
} from '@/api/quotes'

export function useOrderBookDepth(
  getSymbol: () => string,
  level = DEFAULT_DEPTH_LEVEL,
) {
  const asks = ref<OrderBookRow[]>([])
  const bids = ref<OrderBookRow[]>([])
  const midPrice = ref('')
  const loading = ref(false)
  const error = ref('')

  const ws = getGexWs()
  let subscribedTopic = ''
  let currentVersion = ''
  const askBook = new Map<string, DepthLevel>()
  const bidBook = new Map<string, DepthLevel>()

  function publishBook() {
    const askLevels = trimDepthLevels(depthLevelsFromMap(askBook), level)
    const bidLevels = trimDepthLevels(depthLevelsFromMap(bidBook), level)
    const mapped = mapDepthToOrderBook(askLevels, bidLevels)
    asks.value = mapped.asks
    bids.value = mapped.bids
    midPrice.value = calcBookMidPrice(askLevels, bidLevels)
  }

  function resetBook(
    askLevels: DepthLevel[],
    bidLevels: DepthLevel[],
    version: number | string,
  ) {
    askBook.clear()
    bidBook.clear()
    for (const [price, item] of levelsToDepthMap(askLevels))
      askBook.set(price, item)
    for (const [price, item] of levelsToDepthMap(bidLevels))
      bidBook.set(price, item)
    currentVersion = String(version)
    publishBook()
  }

  function onWsMessage(raw: unknown) {
    const msg = parseWsDepthMessage(raw)
    if (!msg || msg.t !== subscribedTopic)
      return

    const payload = msg.p
    if (currentVersion && payload.lv !== currentVersion) {
      void load()
      return
    }

    applyDepthSideDelta(askBook, payload.a ?? [])
    applyDepthSideDelta(bidBook, payload.b ?? [])
    currentVersion = payload.cv
    publishBook()
  }

  async function subscribeDepthWs() {
    const topic = buildDepthWsTopic(getDepthSymbol(getSymbol()))
    if (topic === subscribedTopic)
      return

    try {
      await ws.connect()
      if (subscribedTopic)
        ws.unsubscribe(subscribedTopic)
      subscribedTopic = topic
      ws.subscribe(topic)
    }
    catch {
      /* WS 失败时仍可用 HTTP 盘口 */
    }
  }

  function unsubscribeDepthWs() {
    if (subscribedTopic) {
      ws.unsubscribe(subscribedTopic)
      subscribedTopic = ''
    }
    currentVersion = ''
  }

  async function load() {
    loading.value = true
    error.value = ''

    try {
      const data = await getDepth(getDepthSymbol(getSymbol()), level)
      resetBook(data.asks ?? [], data.bids ?? [], data.version ?? 0)
      await subscribeDepthWs()
    }
    catch (e) {
      askBook.clear()
      bidBook.clear()
      asks.value = []
      bids.value = []
      midPrice.value = ''
      error.value = e instanceof ApiError ? e.message : '盘口加载失败'
      unsubscribeDepthWs()
    }
    finally {
      loading.value = false
    }
  }

  ws.addListener(onWsMessage)

  watch(
    () => getSymbol(),
    () => {
      void load()
    },
    { immediate: true },
  )

  onUnmounted(() => {
    ws.removeListener(onWsMessage)
    unsubscribeDepthWs()
  })

  return {
    asks,
    bids,
    midPrice,
    loading,
    error,
    load,
  }
}
