<script setup>
import { getTickerList } from '@/api/system/sys_user';
import { useTickerStore } from "@/store/modules/ticker";
import { userWebSocket } from "@/store/modules/ws.js"
import {getUserAssets} from "@/api/system/sys_user.js"
import {useUserStore} from "@/store/modules/user.js";
const userStore =useUserStore()
const wsStore = userWebSocket()
const tickerStore = useTickerStore()
let tableData = $ref([]);

const getTableData = async(symbol) => {
  return await getTickerList({symbol:'BTC_USDT'})
}
onMounted(async() => {
  const td = await getTableData()
  tableData = td.data.ticker_list
  tickerStore.ticker = tableData[0]
  await getAssets()
  subTicker()
})
const getAssets=async ()=>{
  const assets = await getUserAssets()
  console.log(assets)
  userStore.userInfo.assets = assets.data.asset_list
}
//{"t":"ticker@BTC_USDT","p":{"lp":"111.000","h":"1111.000","l":"1111.000","a":"16.0000","v":"8220.000","r":"-90.009","s":"BTC_USDT","l24p":"1111.000"}}
/* {
                "last_price": "111.000",
                "high": "1111.000",
                "low": "1111.000",
                "amount": ".0000",
                "volume": "111.000",
                "price_range": "-90.009",
                "last24_price": "1111.000",
                "symbol": "BTC_USDT"
            }*/
const tickerHandler=(data)=>{
  tableData.forEach(el=>{
    if (el.symbol === data.p.s) {
      el.last_price=data.p.lp
      el.price_range=data.p.r+"%"
    }
  })
  if (data.p.s === tickerStore.ticker.symbol) {
    tickerStore.ticker={
      last_price: data.p.lp,
      high:  data.p.h,
      low: data.p.l,
      amount: data.p.a,
      volume: data.p.v,
      price_range: data.p.r+"%",
      last24_price: data.p.l24p,
      symbol: data.p.s
    }

  }
}
wsStore.setTickerDataHandler(tickerHandler)

const subTicker=()=>{
  const d = {'code': 1, 'topic': 'ticker@BTC_USDT'}
  wsStore.conn.send(JSON.stringify(d))
}

</script>

<template>
  <div>
    <el-table

      header-row-class-name="asideTableClassName"
      :data="tableData"
      :cell-style="{'border': 'none','padding': '2px 0','font-size':'12px ','height':'1.5rem'}"
      class="min-w-full min-h-screen-sm "
    >
      <el-table-column fixed prop="symbol" label="币对" />
      <el-table-column prop="last_price" label="价格" />
      <el-table-column prop="price_range" label="涨跌幅" />
      <template v-slot:empty>
        <div class="noData" >无数据</div>
      </template>
    </el-table>
    <el-table
        header-row-class-name="assetsClassName"
        :cell-style="{'border': 'none','padding': '2px 0','font-size':'12px ','height':'1.5rem'}"

        :data="userStore.userInfo.assets"
    >
      <el-table-column fixed prop="coin_name" label="币种" />
      <el-table-column prop="available_qty" label="可用数量" />
      <el-table-column prop="frozen_qty" label="冻结数量" />
    </el-table>
  </div>
</template>

<style scoped>
:deep(.el-table) .asideTableClassName th{
  font-size: 12px;
  font-weight:normal;
  padding:0;
}
:deep(.el-table) .assetsClassName th{
  font-size: 12px;
  font-weight:normal;
  padding:0;
}
.noData{
  font-size: 12px;
  font-weight:normal;
  padding:0;
}
.el-table{
  --el-table-border-color:none;
  --el-table-border : none;
}
</style>