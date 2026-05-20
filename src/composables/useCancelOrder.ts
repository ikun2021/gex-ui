import { ref } from 'vue'
import { ApiError, cancelOrder, symbolToApi } from '@/api'

export function useCancelOrder() {
  const cancellingId = ref<string | null>(null)
  const feedback = ref('')
  const feedbackOk = ref(false)

  function clearFeedback() {
    feedback.value = ''
    feedbackOk.value = false
  }

  /** @param orderId 订单 order_id */
  async function cancel(orderId: string, symbolDisplay: string) {
    if (cancellingId.value)
      return false

    cancellingId.value = orderId
    clearFeedback()

    try {
      await cancelOrder({
        id: orderId,
        symbol_name: symbolToApi(symbolDisplay),
      })
      feedback.value = '撤单成功'
      feedbackOk.value = true
      return true
    }
    catch (e) {
      feedback.value = e instanceof ApiError ? e.message : '撤单失败'
      feedbackOk.value = false
      return false
    }
    finally {
      cancellingId.value = null
    }
  }

  return {
    cancellingId,
    feedback,
    feedbackOk,
    clearFeedback,
    cancel,
  }
}
