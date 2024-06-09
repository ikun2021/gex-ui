<script setup>
import { createOrder } from '@/api/system/sys_user';
import {ElMessage} from "element-plus";
import {useUserStore} from '@/store/modules/user'
import router from "@/router/index.js";

const userStore = useUserStore()


const limitOrderBuyFormRef = $ref({})
const limitOrderBuyForm = $ref({})

const limitOrderBuyFormRules = reactive({
  price: [{ required: true, trigger: "blur",validator: validateNumber  }],
  qty: [{ required: true, trigger: "blur",validator: validateNumber  }],
})
const limitOrderSellFormRef = $ref({})
const limitOrderSellForm = $ref({})
const limitOrderSellFormRules =  reactive({
  price: [{ required: true, trigger: "blur",validator: validateNumber  }],
  qty: [{ required: true, trigger: "blur",validator: validateNumber  }],
})

const markerOrderBuyFormRef = $ref({})
const markerOrderBuyForm = $ref({})
const markerOrderBuyFormRules = reactive({
  amount: [{ required: true, trigger: "blur", message: "市价单请输入金额" }],
})

const markerOrderSellFormRef = $ref({})
const markerOrderSellForm = $ref({})
const markerOrderSellFormRules =  reactive({
  qty: [{ required: true, trigger: "blur", message: "市价单请输入数量" }],
})


let activeName = $ref('lo')

const loBuy = 1
const loSell = 2
const moBuy = 3
const moSell = 4

const formFieldQty = 'qty'
const formFieldPrice = 'price'
const formFieldAmount = 'amount'


const buy = 1
const sell = 2
const mo = 1
const lo = 2
function validateNumber(rule, value, callback) {
  const regex = /^\d+(\.\d+)?$/
  if (!value || !regex.test(value)) {
    callback(new Error("只能输入整数或小数"));
  } else {
    callback();
  }
}





const submitForm = async(orderType) => {
  if (!userStore.isLogin) {
    await router.push({ name: 'login' })
    return
  }
  let data = {
    symbol_id: 14,
    symbol_name: 'IKUN_USDT',
    price: '0',
    qty: '0',
    amount: '',
    side: '',
    order_type: ''
  }
  let valid = false
  switch (orderType){
    case loBuy:
      data.price = limitOrderBuyForm.price
      data.qty = limitOrderBuyForm.qty
      data.side = buy
      data.order_type = lo
      valid  =await limitOrderBuyFormRef.validate()
      unref(limitOrderBuyFormRef).resetFields()

      break
    case loSell:
      console.log(loSell)
      data.price = limitOrderSellForm.price
      data.qty = limitOrderSellForm.qty
      data.side = sell
      data.order_type = lo
      valid = await  limitOrderSellFormRef.validate()
      unref(limitOrderSellFormRef).resetFields()

      break
    case moBuy:
      data.amount = markerOrderBuyForm.amount
      data.side = buy
      data.order_type = mo
      valid = await  markerOrderBuyFormRef.validate()
      unref(markerOrderBuyFormRef).resetFields()
      unref(markerOrderSellFormRef).resetFields()

      //markerOrderBuyFormRef.value.resetFields()
      //markerOrderBuyForm.amount=''
      break
    case moSell:
      data.qty = markerOrderSellForm.qty
      data.side = sell
      data.order_type = mo
      valid = await markerOrderSellFormRef.validate()
      unref(markerOrderSellFormRef).resetFields()

      break
  }
  if(valid){
    const res = await createOrder(data)
    if (res.code === 0) {
      ElMessage.success('下单成功')
    }

  }else{
    ElMessage({
      type: "error",
      message: "请正确填写下单信息",
      showClose: true,
    })
  }


}

//当输入的是11..11修改为11.11,11.11.修改为11.11
const changeInput = (orderType,formField) => {
  switch (orderType){
    case loBuy:
      if(formField===formFieldPrice){
        //多个正则匹配
        limitOrderBuyForm.price = limitOrderBuyForm.price.replace(/[^0-9.]/g, '')
        limitOrderBuyForm.price = limitOrderBuyForm.price.replace(/^\./g, '')
        //输入两个点删除一个
        limitOrderBuyForm.price =limitOrderBuyForm.price.replace(/\.\./g, '.')
        // .12. 的形式删除一个
        limitOrderBuyForm.price =limitOrderBuyForm.price.replace(/(\.\d+)+\./g, '$1')
      }else{
        //多个正则匹配
        limitOrderBuyForm.qty = limitOrderBuyForm.qty.replace(/[^0-9.]/g, '')
        limitOrderBuyForm.qty = limitOrderBuyForm.qty.replace(/^\./g, '')
        //输入两个点删除一个
        limitOrderBuyForm.qty =limitOrderBuyForm.qty.replace(/\.\./g, '.')
        // .12. 的形式删除一个
        limitOrderBuyForm.qty =limitOrderBuyForm.qty.replace(/(\.\d+)+\./g, '$1')
      }
      break
    case loSell:
      if(formField===formFieldPrice){
        //多个正则匹配
        limitOrderSellForm.price = limitOrderSellForm.price.replace(/[^0-9.]/g, '')
        limitOrderSellForm.price = limitOrderSellForm.price.replace(/^\./g, '')
        //输入两个点删除一个
        limitOrderSellForm.price =limitOrderSellForm.price.replace(/\.\./g, '.')
        // .12. 的形式删除一个
        limitOrderSellForm.price =limitOrderSellForm.price.replace(/(\.\d+)+\./g, '$1')
      }else{
        //多个正则匹配
        limitOrderSellForm.qty = limitOrderSellForm.qty.replace(/[^0-9.]/g, '')
        limitOrderSellForm.qty = limitOrderSellForm.qty.replace(/^\./g, '')
        //输入两个点删除一个
        limitOrderSellForm.qty =limitOrderSellForm.qty.replace(/\.\./g, '.')
        // .12. 的形式删除一个
        limitOrderSellForm.qty =limitOrderSellForm.qty.replace(/(\.\d+)+\./g, '$1')
      }

      break
    case moBuy:
      if(formField===formFieldAmount){
        //多个正则匹配
        markerOrderBuyForm.amount = markerOrderBuyForm.amount.replace(/[^0-9.]/g, '')
        markerOrderBuyForm.amount = markerOrderBuyForm.amount.replace(/^\./g, '')
        //输入两个点删除一个
        markerOrderBuyForm.amount =markerOrderBuyForm.amount.replace(/\.\./g, '.')
        // .12. 的形式删除一个
        markerOrderBuyForm.amount =markerOrderBuyForm.amount.replace(/(\.\d+)+\./g, '$1')
      }
      break
    case moSell:
      if(formField===formFieldQty){
        //多个正则匹配
        markerOrderSellForm.qty = markerOrderSellForm.qty.replace(/[^0-9.]/g, '')
        markerOrderSellForm.qty = markerOrderSellForm.qty.replace(/^\./g, '')
        //输入两个点删除一个
        markerOrderSellForm.qty =markerOrderSellForm.qty.replace(/\.\./g, '.')
        // .12. 的形式删除一个
        markerOrderSellForm.qty =markerOrderSellForm.qty.replace(/(\.\d+)+\./g, '$1')
      }
      break
  }



}

</script>

<template>
  <div class="min-w-full  border-t-4   border-opacity-30 border-t-solid border-t-gray-500 flex">
    <el-tabs v-model="activeName" class="min-w-full flex flex-col">
      <el-tab-pane label="限价委托" class="flex justify-between  items-center min-w-full" name="lo">
        <el-form class="min-w-p45 ml-8"  ref="limitOrderBuyFormRef" :model="limitOrderBuyForm" :rules="limitOrderBuyFormRules">
            <el-form-item  prop="price">
              <el-input
                size="large"
                v-model="limitOrderBuyForm.price"
                placeholder="价格"
                maxlength="30"
                class="mb-2"
                @input="changeInput(loBuy,formFieldPrice)"
              />
            </el-form-item>
            <el-form-item prop="qty">
              <el-input
                size="large"
                v-model="limitOrderBuyForm.qty"
                placeholder="数量"
                class="mb-2"
                maxlength="30"
                @input="changeInput(loBuy,formFieldQty)"
              />
            </el-form-item>
            <el-button
              type="primary"
              style="width: 100%"
              size="large"
              color="#ef6f8a"
              @click="submitForm(loBuy)"
              round
              >{{ userStore.isLogin ? '买入':'登录' }}</el-button
            >
          </el-form>
          <el-form class="min-w-p45 mr-8" ref="limitOrderSellFormRef" :model="limitOrderSellForm" :rules="limitOrderSellFormRules">
            <el-form-item prop="price">
              <el-input
                size="large"
                v-model="limitOrderSellForm.price"
                placeholder="价格"
                maxlength="30"
                class="mb-2"
                @input="changeInput(loSell,formFieldPrice)"
              />
            </el-form-item>
            <el-form-item prop="qty">
              <el-input
                size="large"
                v-model="limitOrderSellForm.qty"
                placeholder="数量"
                class="mb-2"
                maxlength="30"
                @input="changeInput(loSell,formFieldQty)"
              />
            </el-form-item>
            <el-button
              type="primary"
              style="width: 100%"
              size="large"
              color="#58ca82"
              round
              @click="submitForm(loSell)"
              >{{ userStore.isLogin ? '卖出':'登录' }}</el-button
            >
          </el-form>
      </el-tab-pane>
      <el-tab-pane label="市价委托" class="flex justify-between  items-center min-w-full" name="mo">
        <el-form class="min-w-p45 ml-8"  ref="markerOrderBuyFormRef" :model="markerOrderBuyForm" :rules="markerOrderBuyFormRules">
          <el-form-item  prop="amount">
            <el-input
                size="large"
                v-model="markerOrderBuyForm.amount"
                placeholder="金额"
                maxlength="30"
                class="mb-2"
                @input="changeInput(moBuy,formFieldAmount)"
            />
          </el-form-item>
          <el-button
              type="primary"
              style="width: 100%"
              size="large"
              color="#ef6f8a"
              @click="submitForm(moBuy)"
              round
          >{{ userStore.isLogin ? '买入':'登录' }}</el-button
          >
        </el-form>
        <el-form class="min-w-p45 mr-8" ref="markerOrderSellFormRef" :model="markerOrderSellForm" :rules="markerOrderSellFormRules">

          <el-form-item prop="qty">
            <el-input
                size="large"
                v-model="markerOrderSellForm.qty"
                placeholder="数量"
                class="mb-2"
                maxlength="30"
                @input="changeInput(moSell,formFieldQty)"
            />
          </el-form-item>
          <el-button
              type="primary"
              style="width: 100%"
              size="large"
              color="#58ca82"
              round
              @click="submitForm(moSell)"
          >{{ userStore.isLogin ? '卖出':'登录' }}</el-button
          >
        </el-form>
      </el-tab-pane>

    </el-tabs>
  </div>
</template>

<style scoped>
.el-input {
  --el-input-focus-border-color: #1f1f1f;
}

</style>