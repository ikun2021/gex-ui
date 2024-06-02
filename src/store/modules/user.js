import { defineStore } from 'pinia';
import { login } from '@/api/system/sys_user';
import router from '@/router/index'


/*
* 存储token以及登录认证的相关函数。
* */
export const useUserStore = defineStore('user', () => {
  const isLogin = ref(false)
  const userInfo = ref({
    uid: '',
    username:'',
    assets:[]
  })
  const token = ref('')
  /* 登录*/
  const LoginIn = async(loginInfo) => {
    try {
      const res = await login(loginInfo)
      if (res.code === 0) {
        userInfo.value.uid = res.data.uid
        userInfo.value.username = res.data.username
        token.value = res.data.token
        await router.push({ name: 'index' })
        isLogin.value=true
        return true
      }
    } catch (e) {
      return false
    }
  }



  async function  LoginOut(){
    this.$reset()
    // 最终真正清空storage数据
    window.localStorage.clear()
    window.sessionStorage.clear()
    await router.push({ name: 'login' })
    isLogin.value=false
  }


  // watch(() => token.value, () => {
  //   window.localStorage.setItem('token', token.value)
  // })
  return {
   // userInfo,
    token,
    //NeedInit,
    //ResetUserInfo,
    //GetUserInfo,
    LoginIn,
    LoginOut,
    //changeSideMode,
    //mode,
    //sideMode,
    //baseColor,
    //activeColor,
  //  loadingInstance,
   // ClearStorage
    userInfo,
    isLogin
  }
})
