import { ref } from 'vue'
import { ApiError } from '@/api'
import {
  formatAssetQty,
  getUserAssetList,
  hasFrozenQty,
  type UserAssetItem,
} from '@/api/account'

export function useUserAssets() {
  const list = ref<UserAssetItem[]>([])
  const loading = ref(false)
  const error = ref('')

  async function load() {
    loading.value = true
    error.value = ''

    try {
      const { asset_list } = await getUserAssetList()
      list.value = asset_list ?? []
    }
    catch (e) {
      list.value = []
      error.value = e instanceof ApiError ? e.message : '资产加载失败'
    }
    finally {
      loading.value = false
    }
  }

  function findCoin(coinName: string) {
    const key = coinName.toUpperCase()
    return list.value.find(a => a.coin_name.toUpperCase() === key)
  }

  function availableOf(coinName: string) {
    return findCoin(coinName)?.available_qty ?? '0'
  }

  function frozenOf(coinName: string) {
    return findCoin(coinName)?.frozen_qty ?? '0'
  }

  function showFrozen(coinName: string) {
    return hasFrozenQty(frozenOf(coinName))
  }

  return {
    list,
    loading,
    error,
    load,
    findCoin,
    availableOf,
    frozenOf,
    showFrozen,
    formatAssetQty,
    hasFrozenQty,
  }
}
