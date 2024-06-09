import axios from 'axios';
import { ElMessage, ElMessageBox } from 'element-plus';
import {useUserStore} from '@/store/modules/user'
import router from '@/router/index'
import { emitter } from '@/utils/bus.js'

// 创建axios实例
const service = axios.create({
    //baseURL:'http://api.gex.com',
    baseURL:'http://192.168.2.160',
    timeout: 4000, // 请求超时时间：50s
    headers: { 'Content-Type': 'application/json;charset=utf-8' },
});
let acitveAxios = 0
let timer
const showLoading = () => {
    acitveAxios++
    if (timer) {
        clearTimeout(timer)
    }
    timer = setTimeout(() => {
        if (acitveAxios > 0) {
            emitter.emit('showLoading')
        }
    }, 400)
}
const closeLoading = () => {
    acitveAxios--
    if (acitveAxios <= 0) {
        clearTimeout(timer)
        emitter.emit('closeLoading')
    }
}


service.interceptors.request.use(
    config => {
      const userStore = useUserStore()
      config.headers = {
        'Content-Type': 'application/json',
        'gexToken': userStore.token,
        'gexUserId': userStore.userInfo.uid,
        ...config.headers
      }
      return config
    },
    error => {
      ElMessage({
        showClose: true,
        message: error,
        type: 'error'
      })
      return error
    }
  )
// 响应拦截器
service.interceptors.response.use(
    (response) => {
        //请求成功返回的http状态码为200
        const userStore = useUserStore()

        if (response.data.code === 0) {
            return response.data
        }else{
            ElMessage({
                showClose: true,
                message: response.data.msg,
                type: 'error'
            })
            //识别指定的错误码进行刷新。
            if (response.data.data && response.data.data.reload) {
                //userStore.token = ''
                //localStorage.clear()
                router.push({ name: 'Login', replace: true })
            }
            return response.data.msg ? response.data : response
        }

    },
    (error) => {
        //当出现404 500 或者网络问题请求失败的情况。
        if (!error.config.donNotShowLoading) {

            closeLoading()
        }
        if (!error.response) {
            ElMessageBox.confirm(`
        <p>检测到请求错误</p>
        <p>${error}</p>
        `, '请求报错', {
                dangerouslyUseHTMLString: true,
                distinguishCancelAndClose: true,
                confirmButtonText: '稍后重试',
                cancelButtonText: '取消'
            })
            return
        }

        switch (error.response.status) {
            case 500:
                ElMessageBox.confirm(`
        <p>检测到接口错误${error}</p>
        <p>错误码<span style="color:red"> 500 </span>：此类错误内容常见于后台panic，请先查看后台日志，如果影响您正常使用可强制登出清理缓存</p>
        `, '接口报错', {
                    dangerouslyUseHTMLString: true,
                    distinguishCancelAndClose: true,
                    confirmButtonText: '清理缓存',
                    cancelButtonText: '取消'
                })
                    .then(() => {
                        const userStore = useUserStore()
                        userStore.token = ''
                        //localStorage.clear()
                        router.push({ name: 'Login', replace: true })
                    })
                break
            case 404:
                ElMessageBox.confirm(`
          <p>检测到接口错误${error}</p>
          <p>错误码<span style="color:red"> 404 </span>：此类错误多为接口未注册（或未重启）或者请求路径（方法）与api路径（方法）不符--如果为自动化代码请检查是否存在空格</p>
          `, '接口报错', {
                    dangerouslyUseHTMLString: true,
                    distinguishCancelAndClose: true,
                    confirmButtonText: '我知道了',
                    cancelButtonText: '取消'
                })
                break
        }

        return error
    },
);

// 统一处理请求响应异常
function handleError() {
    const { isLogin, logout } = store.user.useUserStore();
    if (isLogin) {
        ElMessageBox.confirm('您的登录账号已失效，请重新登录', {
            confirmButtonText: '再次登录',
            cancelButtonText: '取消',
            type: 'warning',
        }).then(() => {
            logout();
        });
    }
}

// 导出实例
export default service;