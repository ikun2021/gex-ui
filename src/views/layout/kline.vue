<script setup>
import {getKlineList} from "@/api/system/sys_user.js"
import {userWebSocket} from "@/store/modules/ws.js"
import {onMounted, onUnmounted} from 'vue'
import {init, dispose, } from 'klinecharts'

const wsStore = userWebSocket()

let c = [
  {cycleName: '1分钟', cycleType: 1, cycleWs: 'Min1'},
  {cycleName: '5分钟', cycleType: 2, cycleWs: 'Min5'},
  {cycleName: '10分钟', cycleType: 3, cycleWs: 'Min10'},
  {cycleName: '15分钟', cycleType: 4, cycleWs: 'Min15'},
  {cycleName: '30分钟', cycleType: 5, cycleWs: 'Min30'},
  {cycleName: '1小时', cycleType: 6, cycleWs: 'Hour1'},
  {cycleName: '4小时', cycleType: 7, cycleWs: 'Hour4'},
  {cycleName: '1天', cycleType: 8, cycleWs: 'Day1'},
  {cycleName: '1周', cycleType: 9, cycleWs: 'Week1'},
  {cycleName: '1月', cycleType: 10, cycleWs: 'Month1'},
]
let cycleList = $ref(c)
let activeIndex = ref(7)
let klineData = []

onUnmounted(() => {
  dispose('chart')
})

onMounted(async () => {
  const d = await getTableData()
  klineData = d.data.kline_list
  initKline()
  subKline()
})

const initKline = () => {
  dispose('chart')
  const chart = init('chart')
  chart.applyNewData(klineData)



}
const changeBtnStatus = async (index) => {
  activeIndex.value = index
  const d = await getTableData()
  klineData = d.data.kline_list
  initKline()
}


const getTableData = async () => {
  let d = await getKlineList({
    start_time: 1,
    end_time: 893185722521,
    kline_type: activeIndex.value + 1,
    symbol: "BTC_USDT"
  })

  d.data.kline_list.forEach(el => {
    el.timestamp = el.start_time * 1000
    el.open = parseFloat(el.open)
    el.high = parseFloat(el.high)
    el.low = parseFloat(el.low)
    el.close = parseFloat(el.close)
    el.volume = parseFloat(el.volume)
  })
  return d
}

//{"t":"kline@BTC_USDT@Min1","p":{"kt":1,"o":"33.000","h":"33.000","l":"33.000","c":"33.000","v":"0.000","a":"0.0000","st":1709915340,"et":1709915400,"r":"0.000","s":"BTC_USDT"}}

const klineDataHandler = (data) => {
  //   //如果最后一根k线是推送的最后一根k线则更新，否则追加
  if (klineData[klineData.length-1].timestamp === data.p.st*1000) {
    klineData[klineData.length-1].open = parseFloat(data.p.o)
    klineData[klineData.length-1].high = parseFloat(data.p.h)
    klineData[klineData.length-1].low = parseFloat(data.p.l)
    klineData[klineData.length-1].close = parseFloat(data.p.c)
    klineData[klineData.length-1].volume = parseFloat(data.p.v)
  }else{
    let d ={
      open:data.p.o,
      high:data.p.h,
      low:data.p.l,
      close:data.p.c,
      timestamp:data.p.st * 1000,
      volume:data.p.v,
    }
    klineData.push(d)
  }
  initKline()
}
wsStore.setKlineDataHandler(klineDataHandler)

const subKline = () => {
  let k = c[activeIndex.value]
  const d = {'code': 1, 'topic': 'kline@BTC_USDT@' + k.cycleWs}
  wsStore.conn.send(JSON.stringify(d))
}

const unSubKline = (index) => {
  let k = c[index]
  const d = {'code': 2, 'topic': 'kline@BTC_USDT@' + k.cycleWs}
  wsStore.conn.send(JSON.stringify(d))
}

watch(() => activeIndex.value, (newData, oldData) => {
  unSubKline(oldData)
  subKline()
})
</script>

<template>
  <div class="border-b-1 border-b-gray-500  border-opacity-30 border-solid min-h-10 flex pl-4">
    <el-button v-for="(item, index) in cycleList" @click="changeBtnStatus(index)"
               :class="activeIndex === index ? 'el-button--text-active' : ''" type="text">{{ item.cycleName }}
    </el-button>
  </div>

  <div id="chart" class="lw-chart"/>


</template>

<style scoped>
.lw-chart {
  width: 99%;
  height: 60%;
  padding-right: 5px;
}

.el-button--text {
  font-size: 16px;
  color: #000000;
  text-align: center;
  width: 5rem;
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 2.5rem;
  margin: 0;
  padding: 0;
  border: none;
}

.el-button--text:hover {
  background-color: #e5e5e5;
  color: #000000;
}

.el-button--text-active {
  background-color: #e5e5e5;
  color: #000000;
  font-size: 16px;
  color: #000000;
  text-align: center;
  width: 5rem;
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 2.5rem;
  margin: 0;
  padding: 0;
}
</style>