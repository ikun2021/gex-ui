import { ref } from 'vue'
import { ApiError } from '@/api'
import {
  calcBookMidPrice,
  DEFAULT_DEPTH_LEVEL,
  getDepth,
  getDepthSymbol,
  mapDepthToOrderBook,
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

  async function load() {
    loading.value = true
    error.value = ''

    try {
      const data = await getDepth(getDepthSymbol(getSymbol()), level)
      const mapped = mapDepthToOrderBook(data.asks ?? [], data.bids ?? [])
      asks.value = mapped.asks
      bids.value = mapped.bids
      midPrice.value = calcBookMidPrice(data.asks ?? [], data.bids ?? [])
    }
    catch (e) {
      asks.value = []
      bids.value = []
      midPrice.value = ''
      error.value = e instanceof ApiError ? e.message : '盘口加载失败'
    }
    finally {
      loading.value = false
    }
  }

  return {
    asks,
    bids,
    midPrice,
    loading,
    error,
    load,
  }
}
