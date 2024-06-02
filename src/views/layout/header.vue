<script setup>

import { useTickerStore } from "@/store/modules/ticker";
const tickerStore = useTickerStore()
import { storeToRefs } from 'pinia'
import {useUserStore} from "@/store/modules/user.js";

const userStore = useUserStore()
const {userInfo}= storeToRefs(userStore)
const {ticker}=storeToRefs(tickerStore)

const logoutCommand = 'logout'
const handleCommand = (command)=>{
  if (command === logoutCommand) {
    userStore.LoginOut()
  }
}


</script>

<template>
  <el-header class="border-4 border-gray-500  border-opacity-30 border-solid flex items-center justify-between">
      <div class="flex flex-row items-center">
         <div>
          <span class="header-item">{{ ticker.symbol }}</span>
        </div>
         <div class="header-item">
          <span>{{ticker.last_price}}</span>
          <span>{{ticker.price_range}}%</span>
        </div>
        <div class="header-item">
          <span>24小时最低</span>
          <span>{{ticker.low}}</span>
        </div>
        <div class="header-item">
          <span>24小时最高</span>
          <span>{{ticker.high}}</span>
        </div>
        <div class="header-item">
          <span>24小时量(btc)</span>
          <span>{{ticker.amount}}</span>
        </div>
        <div class="header-item">
          <span>24小时额(usdt)</span>
          <span>{{ticker.volume}}</span>
        </div>

      </div>
      <div>
        <el-dropdown trigger="click" @command="handleCommand" class="userInfo" >
          <div class="dropdown-select">
             <span class="el-dropdown-link">
          {{ userInfo.username }}
          <el-icon class="el-icon--right">
            <arrow-down/>
          </el-icon>
        </span>
          </div>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="logout">退出</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
  </el-header>    
</template>

<style scoped>
  .header-item{
    display: flex;
    width: 7rem;
    flex-direction: column;
    font-size: 14px;
    align-content: center;
  }
  .userInfo{
    font-size: 20px;
    margin-right: 10px;
  }
</style>