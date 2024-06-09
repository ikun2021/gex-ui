<script setup>
import {getTickList} from "@/api/system/sys_user.js";
import { userWebSocket } from "@/store/modules/ws.js"
import { timestampToTime } from "@/utils/time.js"
const wsStore = userWebSocket()

let tableData = $ref([])
const getTableData = async () => {
  return  await getTickList({
    symbol:'IKUN_USDT',
    limit:27,
  })

}


const subTick = ()=>{
  const d = {'code': 1, 'topic': 'tick@IKUN_USDT'}
  wsStore.conn.send(JSON.stringify(d))
}
const tickDataHandler =(data)=>{
  console.log(data)
  let d = {'price':data.p.p,'qty':data.p.q,'filled_time':timestampToTime(data.p.ts),'taker_is_buyer':data.p.tib}
  tableData.unshift(d)
  if (tableData.length > 25) {
    tableData = tableData.slice(0,25)
  }
}
wsStore.setTickDataHandler(tickDataHandler)

const filledOrderCell = ({rowIndex, columnIndex, row, column})=>{
  if (row.taker_is_buyer && columnIndex === 0) {
    return {'color' :  '#31BD65','font-size':'12px','border':'none','padding': '0',};
  }
  if (!row.taker_is_buyer && columnIndex === 0) {
    return {'color' : '#EB4F70','font-size':'12px','border':'none','padding': '0',}
  }
  return {'border':'none','font-size':'12px','padding': '0'}

}
onMounted(async ()=>{
  const d  = await getTableData()
  tableData = d.data.tick_list
  d.data.tick_list.forEach(el=>{
    el.filled_time =timestampToTime(el.timestamp)
  })
  subTick()
})

</script>

<template>
  <div>
    <el-table
        :data="tableData"
        style="width: 100%"
        header-row-class-name="filledOrderListClassName"
        :cell-style="filledOrderCell"
        :row-style="{height:'30px'}"
    >
      <el-table-column
          prop="price"
          label="价格(usdt)">
      </el-table-column>
      <el-table-column
          prop="qty"
          label="数量(btc)">
      </el-table-column>
      <el-table-column
          prop="filled_time"
          label="时间">
      </el-table-column>
      <template v-slot:empty>
        <div class="noData" >无数据</div>
      </template>
    </el-table>

  </div>
</template>

<style scoped>
:deep(.el-table) .filledOrderListClassName th{
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