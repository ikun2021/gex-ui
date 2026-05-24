import { onUnmounted, ref, watch } from 'vue'
import { ApiError } from '@/api'
import {
  buildTickerWsTopic,
  parseWsTickerMessage,
  wsTickerPayloadToItem,
} from '@/api/tickerWs'
import { getGexWs } from '@/api/ws'
import {
  formatTickerChangePct,
  formatTickerPrice,
  getDepthSymbol,
  getTickerList,
  isTickerChangeUp,
  type TickerItem,
} from '@/api/quotes'

export function useTicker(getSymbol: () => string) {
  const ticker = ref<TickerItem | null>(null)
  const loading = ref(false)
  const error = ref('')

  const ws = getGexWs()
  let subscribedTopic = ''

  function onWsMessage(raw: unknown) {
    const msg = parseWsTickerMessage(raw)
    if (!msg || msg.t !== subscribedTopic)
      return
    ticker.value = wsTickerPayloadToItem(msg.p)
  }

  async function subscribeTickerWs() {
    const topic = buildTickerWsTopic(getDepthSymbol(getSymbol()))
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
      /* WS 失败时仍可用 HTTP ticker */
    }
  }

  function unsubscribeTickerWs() {
    if (subscribedTopic) {
      ws.unsubscribe(subscribedTopic)
      subscribedTopic = ''
    }
  }

  async function load() {
    loading.value = true
    error.value = ''

    try {
      const { ticker_list } = await getTickerList(getDepthSymbol(getSymbol()))
      ticker.value = ticker_list?.[0] ?? null
      await subscribeTickerWs()
    }
    catch (e) {
      ticker.value = null
      error.value = e instanceof ApiError ? e.message : 'Ticker 加载失败'
      unsubscribeTickerWs()
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
    unsubscribeTickerWs()
  })

  return {
    ticker,
    loading,
    error,
    load,
    formatTickerPrice,
    formatTickerChangePct,
    isTickerChangeUp,
  }
}
