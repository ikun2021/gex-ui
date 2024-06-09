<script setup>
import {cancelOrder, getOrderList, getUserAssets} from "@/api/system/sys_user.js";
import {ElMessage} from "element-plus";
import {useUserStore} from '@/store/modules/user'
import {userWebSocket} from "@/store/modules/ws.js";
import {timestampToDateTime} from "@/utils/time.js";

const userStore = useUserStore()
const wsStore = userWebSocket()
const activeName = $ref('current')
let tableData = $ref([])

const newCreated = 1
const partFilled = 2
const allFilled = 3
const canceled = 4

let symbol = 'IKUN_USDT'
let id = "0"
let pageSize = 10
const handleCancelOrder = async (index, row) => {
  const res = await cancelOrder({symbol_name: 'IKUN_USDT', id: row.id})
  if (res.code === 0) {
    ElMessage.success('取消成功')
  }
}
const subOrder = () => {
  if (userStore.isLogin) {
    let d = {'code': 3, 'data': userStore.token}
    wsStore.conn.send(JSON.stringify(d))
    d = {'code': 5, 'topic': 'order@IKUN_USDT'}
    wsStore.conn.send(JSON.stringify(d))
  }
}
/*
* {
    "t": "order@IKUN_USDT",
    "p": {
        "id": "773667510556823552",
        "oi": "751cf55a-893c-479b-84f6-f572490e5ff4",
        "sn": "IKUN_USDT",
        "p": "111.000",
        "q": "1.0000",
        "a": "111.000",
        "si": 1,
        "s": 1,
        "ot": 2,
        "fa": "0.000",
        "fq": "0.0000",
        "fap": "0.000",
        "u": "3",
        "ca": 1710162241
    }
}*/
const orderDataHandler = async (resp) => {
  const assets = await getUserAssets()
  userStore.userInfo.assets = assets.data.asset_list
  switch (resp.p.s) {
    case 1:
      let order = {
        'id': resp.p.id,
        'order_id': resp.p.oi,
        'user_id': resp.p.u,
        'symbol': resp.p.sn,
        'price': resp.p.p,
        'qty': resp.p.q,
        'amount': resp.p.a,
        'side': resp.p.si === 1 ? '买' : '卖',
        'status': resp.p.s,
        'order_type': resp.p.ot === 1 ? '市价单' : '限价单',
        'filled_qty': resp.p.fq,
        'filled_amount': resp.p.fa,
        'filled_avg_price': resp.p.fap,
        'created_at': timestampToDateTime(resp.p.ca),
        'filledUnfilled': resp.p.fq + '/' + resp.p.q,
      }
      let statusStr = ''
      switch (resp.p.s) {
        case newCreated:
          statusStr = '未成交'
          break
        case partFilled:
          statusStr = '部分成交'
          break
        case allFilled:
          statusStr = '全部成交'
          break
        case canceled:
          statusStr = '订单取消'
          break
      }
      order.status = statusStr
      tableData.unshift(order)
      if (tableData.length > pageSize) {
        tableData.pop()
        showLoading = true
        id = tableData[tableData.length - 1].id
      }

      break
    case 4:
      tableData = tableData.filter(el => {
        return el.id !== resp.p.id;
      })
      break
    case 2:
      tableData.forEach(el => {
        el.filledUnfilled = resp.p.fq + '/' + el.qty
      })
      break
    case 3:
      tableData = tableData.filter(el => {
        return el.id !== resp.p.id;
      })
  }
}

wsStore.setOrderDataHandler(orderDataHandler)
const handleSwitch = async () => {
  let s1, s2
  if (activeName === 'current') {
    s1 = newCreated
    s2 = partFilled
  } else {
    s1 = allFilled
    s2 = canceled
  }
  id = "0"


  tableData = await getTableData(s1, s2)
}
let loading = $ref(false)
const loadingMore = async () => {
  //loading = true
  let s1, s2
  if (activeName === 'current') {
    s1 = newCreated
    s2 = partFilled
  } else {
    s1 = allFilled
    s2 = canceled
  }
  const d = await getTableData(s1, s2)
  tableData.push(...d)
  //loading = false

}

let showLoading = $ref(false)

onMounted(async () => {
  if (!userStore.isLogin) {
    return
  }
  let s1, s2
  if (activeName === 'current') {
    s1 = newCreated
    s2 = partFilled
  } else {
    s1 = allFilled
    s2 = canceled
  }
  tableData = await getTableData(s1, s2)
  subOrder()
})


const getTableData = async (...status) => {
  const orderList = await getOrderList({
    status_list: status,
    symbol_name: "IKUN_USDT",
    page_size: pageSize,
    id: id,
  })
  if (orderList.data.order_list.length > 0) {
    id = orderList.data.order_list[orderList.data.order_list.length - 1].id
  }

  showLoading = orderList.data.order_list.length + tableData.length < orderList.data.total;

  return orderList.data.order_list.map((el, i, arr) => {
    el.side = el.side === 1 ? '买' : '卖'
    el.created_at = timestampToDateTime(el.created_at)
    el.symbol = el.symbol_name
    el.date = el.created_at
    el.order_type = el.order_type === 1 ? '市价单' : '限价单'
    el.filledUnfilled = el.filled_qty + '/' + el.qty

    let statusStr = ''
    switch (el.status) {
      case newCreated:
        statusStr = '未成交'
        break
      case partFilled:
        statusStr = '部分成交'
        break
      case allFilled:
        statusStr = '全部成交'
        break
      case canceled:
        statusStr = '订单取消'
        break
    }
    el.status = statusStr
    return el
  })

}
</script>

<template>
  <el-footer style="padding:0">

    <el-tabs @tab-change="handleSwitch"
             class="border-l-4 border-t-4 border-r-4 border-t-gray-500 border-l-gray-500 border-r-gray-500 border-opacity-30 border-solid "
             v-model="activeName">
      <el-tab-pane label="当前委托" class="flex justify-between  items-center" name="current">
        <el-table
            :data="tableData"
            header-row-class-name="footerTable"
            :cell-style="{'border': 'none','padding': '2px 0','font-size':'12px ','height':'1.5rem'}"

            style="width: 100%">
          <el-table-column
              prop="created_at"
              label="时间"
          >
          </el-table-column>
          <el-table-column
              prop="symbol"
              label="交易对"
          >
          </el-table-column>
          <el-table-column
              prop="side"

              label="方向">
          </el-table-column>
          <el-table-column
              prop="order_type"

              label="订单类型">
          </el-table-column>
          <el-table-column
              prop=price
              label="委托价"
              width="180">
          </el-table-column>
          <el-table-column
              prop="qty"
              label="委托量"
              width="180">
          </el-table-column>
          <el-table-column
              prop="amount"
              label="委托总额">
          </el-table-column>
          <el-table-column
              prop="filledUnfilled"
              label="已成交数量/未成交数量">
          </el-table-column>
          <el-table-column
              prop="status"
              label="状态">
          </el-table-column>
          <el-table-column
              prop="status"
              label="操作"
          >
            <template #default="scope">
              <el-button @click="handleCancelOrder(scope.$index, scope.row)" type="warning" size="small">取消订单
              </el-button>
            </template>
          </el-table-column>
          <template v-slot:empty>
            <div class="noData">无数据</div>
          </template>
          <template #append>
            <div class="min-w-full " v-if="showLoading">
              <el-button type="text" class="min-w-full min-h-10 " :loading="loading" @click="loadingMore">加载更多
              </el-button>
            </div>
          </template>
        </el-table>
      </el-tab-pane>
      <el-tab-pane label="历史委托" class="flex justify-between  items-center" name="history">
        <el-table
            :data="tableData"
            header-row-class-name="footerTable"
            :cell-style="{'border': 'none','padding': '2px 0','font-size':'12px ','height':'1.5rem'}"

            style="width: 100%">
          <el-table-column
              prop="created_at"
              label="时间"
          >
          </el-table-column>
          <el-table-column
              prop="symbol"
              label="交易对"
          >
          </el-table-column>
          <el-table-column
              prop="side"
              label="方向">
          </el-table-column>
          <el-table-column
              prop="order_type"
              label="订单类型">
          </el-table-column>
          <el-table-column
              prop=price
              label="委托价"
              width="180">
          </el-table-column>
          <el-table-column
              prop="qty"
              label="委托量"
              width="180">
          </el-table-column>
          <el-table-column
              prop="amount"
              label="委托总额">
          </el-table-column>
          <el-table-column
              prop="filled_qty"
              label="成交数量">
          </el-table-column>
          <el-table-column
              prop="filled_amount"
              label="成交金额">
          </el-table-column>
          <el-table-column
              prop="status"
              label="状态">
          </el-table-column>

          <template v-slot:empty>
            <div class="noData">无数据</div>
          </template>
          <template #append>
            <div class="min-w-full " v-if="showLoading">
              <el-button type="text" class="min-w-full min-h-10 " :loading="loading" @click="loadingMore">加载更多
              </el-button>
            </div>
          </template>
        </el-table>
      </el-tab-pane>

    </el-tabs>

  </el-footer>
</template>

<style scoped>
:deep(.el-table) .footerTable th {
  font-size: 12px;
  font-weight: normal;
  padding: 0;
}

.noData {
  font-size: 12px;
  font-weight: normal;
  padding: 0;
}

.el-footer {

}

</style>