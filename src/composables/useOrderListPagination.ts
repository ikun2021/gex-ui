import { reactive, toRefs } from 'vue'
import {
  ApiError,
  fetchOrderPage,
  ORDER_PAGE_SIZE,
  type OrderTableRow,
} from '@/api'

export function useOrderListPagination(
  getSymbol: () => string,
  getStatusList: () => readonly number[],
) {
  const state = reactive({
    items: [] as OrderTableRow[],
    total: 0,
    loading: false,
    loadingMore: false,
    error: '',
    hasMore: false,
  })

  /** 下一页请求使用的游标 id（首页为 "0"） */
  let nextCursorId = '0'

  function appendRows(rows: OrderTableRow[]) {
    if (rows.length === 0)
      return

    const seen = new Set(state.items.map(r => r.id))
    for (const row of rows) {
      if (!seen.has(row.id)) {
        state.items.push(row)
        seen.add(row.id)
      }
    }
    nextCursorId = rows[rows.length - 1]!.id
  }

  async function loadFirst() {
    state.loading = true
    state.error = ''
    nextCursorId = '0'
    state.items = []

    try {
      const result = await fetchOrderPage(
        getSymbol(),
        getStatusList(),
        '0',
        0,
      )
      state.items = result.rows
      state.total = result.total
      state.hasMore = result.hasMore
      if (result.rows.length > 0)
        nextCursorId = result.rows[result.rows.length - 1]!.id
    }
    catch (e) {
      state.items = []
      state.total = 0
      state.hasMore = false
      state.error = e instanceof ApiError ? e.message : '加载失败'
    }
    finally {
      state.loading = false
    }
  }

  async function loadMore() {
    if (!state.hasMore || state.loadingMore || state.loading)
      return

    state.loadingMore = true
    state.error = ''

    try {
      const alreadyLoaded = state.items.length
      const result = await fetchOrderPage(
        getSymbol(),
        getStatusList(),
        nextCursorId,
        alreadyLoaded,
      )
      appendRows(result.rows)
      state.total = result.total
      state.hasMore = result.hasMore
    }
    catch (e) {
      state.error = e instanceof ApiError ? e.message : '加载更多失败'
    }
    finally {
      state.loadingMore = false
    }
  }

  return {
    ...toRefs(state),
    pageSize: ORDER_PAGE_SIZE,
    loadFirst,
    loadMore,
  }
}
