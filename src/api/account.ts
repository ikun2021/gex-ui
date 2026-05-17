import { post } from './request'

export interface UserAssetItem {
  id: number
  coin_name: string
  coin_id: number
  available_qty: string
  frozen_qty: string
}

export interface GetUserAssetListResult {
  asset_list: UserAssetItem[]
}

export function formatAssetQty(value: string) {
  const n = Number(value)
  if (Number.isNaN(n))
    return value
  return n.toLocaleString('en-US', { maximumFractionDigits: 8 })
}

/** 冻结数量是否有展示意义（非空且不为 "0"） */
export function hasFrozenQty(frozenQty: string) {
  const v = frozenQty.trim()
  return v !== '' && v !== '0'
}

export function getUserAssetList() {
  return post<GetUserAssetListResult>('/account/v1/get_user_asset_list', {})
}
