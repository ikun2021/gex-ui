<script setup>
import {getDepthList} from "@/api/system/sys_user.js";
import { useTickerStore } from "@/store/modules/ticker";
import {storeToRefs} from "pinia";
import {Decimal} from 'decimal.js'
import { userWebSocket } from "@/store/modules/ws.js"
const wsStore = userWebSocket()
const tickerStore = useTickerStore()
const decimalZero = new Decimal(0)

const {ticker}=storeToRefs(tickerStore)

let asks =$ref([])
let bids =$ref([])
let bidsLevel300 =$ref([])
let asksLevel300 =$ref([])

const asksType=1
const bidsType=2

//卖盘最大的数量
let asksMaxQty = $ref( new Decimal(0))
//买盘最大数量
let bidsMaxQty = $ref(new Decimal(0))

const subDepth = ()=>{
  const d = {'code': 1, 'topic': 'depth@IKUN_USDT'}
  wsStore.conn.send(JSON.stringify(d))
}

const asksFilterEmpty =()=>{
  asks = asks.filter(el=>{
      return el.qty!==''
    })
}

const asksFilledEmpty = ()=>{
  let l = asks.length
  if (l < 15) {
    for (let i = 0; i < (15-l); i++) {
      asks.unshift({'price':'','qty':'','amount':''})
    }

  }
}

const depthDataHandler =(data)=>{
  //找到合适的档位替换
  //如何档位不存在则新增
  // 更新档位的最大值
  // 删除档位为0

  asksFilterEmpty()

  data.p.a.forEach( d=>{
    let existed = false
    let pos = {}
    let newAsks = []

    //更新数据，修改档位
    asks.forEach((el) => {
      //找到该档位更新
      if (d[0] === el.price) {
        el.qty = d[1]
        el.amount = d[2]
        existed = true
      }
    })

    if (!existed){
      pos = {'price': d[0], 'qty': d[1], 'amount': d[2]}
      asks.push(pos)
    }
    //找到最大 删除数量为0的
    asks.forEach(d => {
      if (new Decimal(d.qty).eq(decimalZero)) {
        return
      }
      let q = new Decimal(d.qty)
      //更新asksMaxQty最大数量
      if (q.gt(asksMaxQty)) {
        asksMaxQty = q
      }
      newAsks.push(d)
    })
    //排序从大到小
    asks = newAsks.sort((v1, v2) => {
      const v1Price = new Decimal(v1.price)
      const v2Price = new Decimal(v2.price)
      return -v1Price.comparedTo(v2Price)
    })
  })


  asksFilledEmpty()
  //处理买
  data.p.b.forEach(d=>{
    let existed = false
    let pos = {}
    let newBids = []

    //更新数据，修改档位
    bidsLevel300.forEach((el) => {
      //找到该档位更新
      if (d[0] === el.price) {
        el.qty = d[1]
        el.amount = d[2]
        existed = true
      }
    })

    if (!existed){
      pos = {'price': d[0], 'qty': d[1], 'amount': d[2]}
      bidsLevel300.push(pos)
    }
    //找到最大 删除数量为0的
    bidsLevel300.forEach(d => {
      if (new Decimal(d.qty).eq(decimalZero)) {
        return
      }
      let q = new Decimal(d.qty)
      //更新asksMaxQty最大数量
      if (q.gt(asksMaxQty)) {
        bidsMaxQty = q
      }
      newBids.push(d)
    })
    //排序从大到小
    bidsLevel300 = newBids.sort((v1, v2) => {
      const v1Price = new Decimal(v1.price)
      const v2Price = new Decimal(v2.price)
      return -v1Price.comparedTo(v2Price)
    })
    //只保留15档删除多的
    bids = bidsLevel300.slice(0, 15)
  })
}

wsStore.setDepthDataHandler(depthDataHandler)

const getTableData = async () => {
  const data =  await getDepthList({
    symbol:'IKUN_USDT',
    level:300,
  })
  asksLevel300 = data.data.asks
  bidsLevel300 = data.data.bids

  return data
}
const calMaxQty = (data,t)=>{
  data.forEach(el=>{
    if (el.qty === '') {
       return
    }
    let q = new Decimal(el.qty)

    if (t===asksType){
      if (q.gt(asksMaxQty)) {
        asksMaxQty = q
      }
    }else{
      if (q.gt(bidsMaxQty)) {
        bidsMaxQty = q
      }
    }


  })
}
const  asksListCell = ({rowIndex, columnIndex, row, column})=> {
  if (columnIndex === 0) {
    return {color: "#EB4F70",'text-align':'left','border': 'none','padding': '0','font-size':'12px','height':'1.5rem'}
  }
  return {'text-align':'right','border': 'none','padding': '2px 0','font-size':'12px','height':'1.5rem'}
}
onMounted(async ()=>{
  const d = await getTableData()
  asks = d.data.asks.slice(0, 15)
  bids = d.data.bids.slice(0, 15)
  calMaxQty(asks,asksType)
  calMaxQty(bids,bidsType)
  asksFilledEmpty()
  subDepth()
})

const  bidsListCell = ({rowIndex, columnIndex, row, column})=> {
  if (columnIndex === 0) {
    return {'color': "#31BD65",'text-align':'left','border': 'none','padding': '0','font-size':'12px'}
  }
  return {'text-align':'right','border': 'none','padding': '2px 0','font-size':'12px'}
}
const  asksListRow=({row, rowIndex})=> {
  if (row.qty === '') {
    return
  }
  let qty = new Decimal(row.qty)

  let sc = qty.div(asksMaxQty).mul(new Decimal(100)).ceil().toFixed(0, Decimal.ROUND_CEIL)
  return {'background-image': `linear-gradient(to left,#F1D9DE ` + sc + `%, #FFFFFF ` + sc + `%  )`}
}
const  bidsListRow=({row, rowIndex})=> {
  if (row.qty === '') {
    return
  }
  let qty = new Decimal(row.qty)

  let sc = qty.div(bidsMaxQty).mul(new Decimal(100)).ceil().toFixed(0, Decimal.ROUND_CEIL)
  return {'background-image': `linear-gradient(to left,#F1D9DE ` + sc + `%, #FFFFFF ` + sc + `%  )`}
}
</script>

<template>
  <div>

      <el-table
          header-row-class-name="asksTableClassName"
          :data="asks" class="min-w-full min-h-sm"
          :cell-style="asksListCell"
          :row-style="asksListRow"
      >
        <el-table-column
            prop="price"
            width='100'
            label="价格(usdt)"
        >
        </el-table-column>
        <el-table-column
            prop="qty"
            label="数量"
            width='90'>
        </el-table-column>
        <el-table-column
            prop="amount"
            min-width="100"
            label="金额">
        </el-table-column>
        <template v-slot:empty>
          <div class="noData" >无数据</div>
        </template>
      </el-table>

    <el-divider>
      {{ ticker.last_price }}
    </el-divider>
    <el-table
        header-row-class-name="bidsTableClassName"
        empty-text=""
        :data="bids"
        :cell-style="bidsListCell"
        :row-style="bidsListRow"
         :show-header=false
        class="min-w-full  ">
      <el-table-column
          prop="price"
          width='100'
          label="价格(usdt)"
      >
      </el-table-column>
      <el-table-column
          prop="qty"
          label="数量"
          width='90'>
      </el-table-column>
      <el-table-column
          prop="amount"
          min-width="100"
          label="金额">
      </el-table-column>
      <template v-slot:empty>
          <div class="noData" >无数据</div>
      </template>


    </el-table>
  </div>
</template>

<style scoped>
:deep(.el-table) .asksTableClassName th{
  font-size: 12px;
  font-weight:normal;
  padding:0;
}
:deep(.el-table) .bidsTableClassName th{
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