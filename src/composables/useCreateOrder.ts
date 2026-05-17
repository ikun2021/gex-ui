import { ref } from 'vue'
import {
  ApiError,
  buildCreateOrderPayload,
  createOrder,
  ORDER_SIDE,
  ORDER_TYPE,
} from '@/api'

export function useCreateOrder() {
  const submitting = ref(false)
  const feedback = ref('')
  const feedbackOk = ref(false)

  function clearFeedback() {
    feedback.value = ''
    feedbackOk.value = false
  }

  async function submitLimit(input: {
    symbolDisplay: string
    side: typeof ORDER_SIDE.BUY | typeof ORDER_SIDE.SELL
    price: string
    baseAmount: string
  }) {
    const price = input.price.trim()
    const baseAmount = input.baseAmount.trim()

    if (!price || Number(price) <= 0) {
      feedback.value = '请输入有效价格'
      feedbackOk.value = false
      return false
    }
    if (!baseAmount || Number(baseAmount) <= 0) {
      feedback.value = '请输入有效数量'
      feedbackOk.value = false
      return false
    }

    return submit(
      buildCreateOrderPayload({
        symbolDisplay: input.symbolDisplay,
        side: input.side,
        orderType: ORDER_TYPE.LO,
        price,
        baseAmount,
      }),
    )
  }

  async function submitMarket(input: {
    symbolDisplay: string
    side: typeof ORDER_SIDE.BUY | typeof ORDER_SIDE.SELL
    baseAmount: string
  }) {
    const baseAmount = input.baseAmount.trim()

    if (!baseAmount || Number(baseAmount) <= 0) {
      feedback.value = '请输入有效数量'
      feedbackOk.value = false
      return false
    }

    return submit(
      buildCreateOrderPayload({
        symbolDisplay: input.symbolDisplay,
        side: input.side,
        orderType: ORDER_TYPE.MO,
        price: '0',
        baseAmount,
      }),
    )
  }

  async function submit(body: Parameters<typeof createOrder>[0]) {
    submitting.value = true
    clearFeedback()

    try {
      await createOrder(body)
      feedback.value = '下单成功'
      feedbackOk.value = true
      return true
    }
    catch (e) {
      feedback.value = e instanceof ApiError ? e.message : '下单失败'
      feedbackOk.value = false
      return false
    }
    finally {
      submitting.value = false
    }
  }

  return {
    submitting,
    feedback,
    feedbackOk,
    clearFeedback,
    submitLimit,
    submitMarket,
  }
}
